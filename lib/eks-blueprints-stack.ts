import { CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";

import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as addons from '@aws-quickstart/eks-blueprints/dist/addons';

import { KubectlV24Layer } from '@aws-cdk/lambda-layer-kubectl-v24';
import { ImportHostedZoneProvider } from "@aws-quickstart/eks-blueprints";

import { CdkNagSuppressions } from "./core/utilities/cdk-nag-suppressions";
import { EksBlueprintsStackProps } from "./props/stack-props";

export class EksBlueprintsStack {
  private readonly eksId: any;
  private readonly eksBuildStack: blueprints.EksBlueprint;

  constructor(scope: Construct, id: string, props: EksBlueprintsStackProps) {  
    this.eksId = (id: string) => `${props.prefix}-${id}`;
    
    const endpointAccess = props.endpointAccess;
    let access;

    if (endpointAccess.toLowerCase() == "private") {
      access = eks.EndpointAccess.PRIVATE;
    } else if (endpointAccess.toLowerCase() == "public") {
      access = eks.EndpointAccess.PUBLIC;
    } else {
      access = eks.EndpointAccess.PUBLIC_AND_PRIVATE;
    }

    const eksBlueprintStackBuilder = blueprints.EksBlueprint.builder();

    const adminTeam = new blueprints.PlatformTeam({
      name: this.eksId('admin-platform-team'),
      userRoleArn: props.adminRoleArn
    });

    const addOns: blueprints.ClusterAddOn[] = [
      new addons.VpcCniAddOn('v1.11.4-eksbuild.1'),
      new addons.CoreDnsAddOn('v1.8.7-eksbuild.3'),
      new addons.KubeProxyAddOn('v1.24.7-eksbuild.2'),
      new addons.EbsCsiDriverAddOn('v1.13.0-eksbuild.3'),
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

    const clusterKey = new kms.Key(scope, this.eksId('key'), {
      removalPolicy: RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(7),
      alias: `alias/${this.eksId('key')}`,
      description: 'KMS key for encrypting the objects in EKS cluster',
      enableKeyRotation: true,
      enabled: true
    });

    const genericClusterProvider = new blueprints.GenericClusterProvider({
      version: eks.KubernetesVersion.of('1.24'),
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

  public getStack() {
    return this.eksBuildStack;
  }

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