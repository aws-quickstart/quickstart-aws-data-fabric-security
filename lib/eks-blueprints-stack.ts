import { CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";

import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { addons } from "@aws-quickstart/eks-blueprints";

import { KubectlV24Layer } from '@aws-cdk/lambda-layer-kubectl-v24';
import { ImportHostedZoneProvider } from "@aws-quickstart/eks-blueprints";

import { CdkNagSuppressions } from "./core/utilities/cdk-nag-suppressions";
import { EksBlueprintsStackProps } from "./props/stack-props";

/**
 * EKS Blueprints stack.
 */
export class EksBlueprintsStack {
  /**
   * Stack identifier.
   */
  private readonly eksId: any;

  /**
   * The EKS Blueprint.
   */
  private readonly eksBuildStack: blueprints.EksBlueprint;

  /**
   * Constructor of the EKS Blueprints stack.
   * 
   * @param scope - Parent of this stack.
   * @param id - Construct ID of this stack.
   * @param props - Properties of this stack.
   */
  constructor(scope: Construct, id: string, props: EksBlueprintsStackProps) {  
    this.eksId = (id: string) => `${props.prefix}-${id}`;
    
    // Set EKS endpoint access.
    const endpointAccess = props.endpointAccess;
    let access;

    if (endpointAccess.toLowerCase() == "private") {
      access = eks.EndpointAccess.PRIVATE;
    } else if (endpointAccess.toLowerCase() == "public") {
      access = eks.EndpointAccess.PUBLIC;
    } else {
      access = eks.EndpointAccess.PUBLIC_AND_PRIVATE;
    }

    // Create the EKS Blueprint builder.
    const eksBlueprintStackBuilder = blueprints.EksBlueprint.builder();

    const adminTeam = new blueprints.PlatformTeam({
      name: this.eksId('admin-platform-team'),
      userRoleArn: props.adminRoleArn
    });

    // Create EKS add-ons.
    const addOns: blueprints.ClusterAddOn[] = [
      new addons.VpcCniAddOn(),
      new addons.CoreDnsAddOn('v1.9.3-eksbuild.2'),
      new addons.KubeProxyAddOn('v1.25.6-eksbuild.2'),
      new addons.EbsCsiDriverAddOn({
        version: 'v1.17.0-eksbuild.1'
      }),
      new addons.ExternalDnsAddOn({
        hostedZoneResources: [props.domain],
        values: {
          aws: {
            region: props.env.region,
            zoneType: "private",
            preferCNAME: true,
          },
          txtPrefix: "txt",
          policy: "sync",
          logLevel: "debug",
        },
      }),
    ];

    // Create EKS cluster KMS key.
    const clusterKey = new kms.Key(scope, this.eksId('key'), {
      removalPolicy: RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(7),
      alias: `alias/${this.eksId('key')}`,
      description: 'KMS key for encrypting the objects in EKS cluster',
      enableKeyRotation: true,
      enabled: true
    });

    // Create the cluster provider.
    const genericClusterProvider = new blueprints.GenericClusterProvider({
      clusterName: props.clusterName,
      version: eks.KubernetesVersion.of('1.25'),
      endpointAccess: access,
      clusterLogging: [
        eks.ClusterLoggingTypes.API,
        eks.ClusterLoggingTypes.CONTROLLER_MANAGER,
        eks.ClusterLoggingTypes.AUTHENTICATOR,
        eks.ClusterLoggingTypes.SCHEDULER,
        eks.ClusterLoggingTypes.AUDIT,
      ],
      kubectlLayer: new KubectlV24Layer(scope, this.eksId('kubectl')),
      secretsEncryptionKey: clusterKey,
      managedNodeGroups: [
        {
          id: this.eksId('group-node'),
          amiType: eks.NodegroupAmiType.AL2_X86_64,
          instanceTypes: [new ec2.InstanceType(props.instanceType)],
          diskSize: 200,
          nodeGroupSubnets: { subnets: props.subnets },
          desiredSize: props.numInstances
        }
      ]
    });

    // Build the EKS Blueprint stack.
    this.eksBuildStack = eksBlueprintStackBuilder
      .clusterProvider(genericClusterProvider)
      .addOns(...addOns)
      .account(props.env.account)
      .region(props.env.region)
      .teams(adminTeam)
      .resourceProvider(
        props.domain,
        new ImportHostedZoneProvider(props.hostedZoneId)
      )
      .resourceProvider(
        blueprints.GlobalResources.Vpc,
        new blueprints.DirectVpcProvider(props.vpc)
      )
      .build(scope, id, {
        description: "Data Fabric Security EKS Cluster"
      });

    this.generateOutputs(this.eksBuildStack.getClusterInfo().cluster);
    this.createCdkNagSuppressions();
  }

  /**
   * Get the EKS Blueprint.
   * 
   * @returns The EKS Blueprint.
   */
  public getStack(): blueprints.EksBlueprint {
    return this.eksBuildStack;
  }

  /**
   * Generate cluster attributes as outputs.
   * 
   * @param cluster - The EKS Cluster.
   */
  private generateOutputs(cluster : eks.Cluster): void {
    new CfnOutput(this.eksBuildStack, "EKSAdminRole", {
      value: cluster.adminRole.roleArn,
      description: "Admin role for EKS Cluster",
      exportName: "EKSAdminRole"
    });

    new CfnOutput(this.eksBuildStack, "ClusterArn", {
      value: cluster.clusterArn,
      description: "EKS Cluster ARN",
      exportName: "EKSClusterArn"
    });
  }

  /**
   * Create cdk-nag suppressions for EKS-related with ServiceRole, DefaultPolicy, or NodeGroupRole. 
   */
  private createEksCdkNagSuppressions() {
    for (const child of this.eksBuildStack.node.findAll()) {

      const rules: { [key: string]: string; } = {
        'AwsSolutions-EKS1': 'Surpressing K8s API server endpoint as configuration is external',
        'AwsSolutions-IAM4': 'Suppressing managed policies created by ServiceRole/DefaultPolicy',
        'AwsSolutions-IAM5': 'Suppressing wildcard resources created by ServiceRole/DefaultPolicy'
      }

      if (child.node.path.includes("ServiceRole") || child.node.path.includes("DefaultPolicy") || child.node.path.includes("NodeGroupRole")) {
        for (const rule in rules) {
          CdkNagSuppressions.createResourceCdkNagSuppressions(child, rule, rules[rule]);
        }
      }
    }
  }

  /**
   * Create cdk-nag suppressions for other resources deployed by this stack.
   */
  private createCdkNagSuppressions() {
    this.createEksCdkNagSuppressions();

    CdkNagSuppressions.createStackCdkNagSuppressions(
      this.eksBuildStack, 
      'AwsSolutions-KMS5', 
      'Suppressing and ignoring the initial default KMS key',
    );
  
    CdkNagSuppressions.createResourceCdkNagSuppressions(
      this.eksBuildStack.getClusterInfo().cluster, 
      'AwsSolutions-IAM5', 
      'Suppressing IAM wildcards defined by default when deploying EKS', 
    );
  
    CdkNagSuppressions.createResourceCdkNagSuppressions(
      this.eksBuildStack.getClusterInfo().cluster, 
      'AwsSolutions-IAM4', 
      'Only suppressing required EKS AWS Managed Policies', 
    );
  }


}