import * as cdk from 'aws-cdk-lib';
import { Construct } from "constructs";

import { DataFabricSecurityStack } from "./data-fabric-security-stack";
import { EksBlueprintsStack } from "./eks-blueprints-stack";
import { ImmutaStack } from "./immuta-stack";
import { RadiantLogicStack } from "./radiant-logic-stack";

import { MainStackProps } from "./props/stack-props";
import { Config } from "./core/config";
import { CdkNagSuppressions } from "./core/utilities/cdk-nag-suppressions";

import * as iam from "aws-cdk-lib/aws-iam";

/**
 * Main stack to deploy the solution.
 */
export class MainStack extends cdk.Stack {

  /**
   * Constructor of the main solution stack.
   * 
   * @param scope - Parent of this stack.
   * @param id - Construct ID of this stack.
   * @param props - Properties of this stack.
   */
  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id, props);

    const partition = cdk.Stack.of(this).partition;
    const commonName = "data-fabric-security";
    const mainId = (id: string) => `${commonName}-${id}`;

    let immutaStack: cdk.Stack;
    let radiantlogicStack: cdk.Stack;

    const dataFabricCoreStack = new DataFabricSecurityStack(this, mainId('core-stack'), {
      env: props.env,
      prefix: commonName,
      vpc: {
        vpcId: Config.Current.Networking.VpcId,
        subnetIds: [Config.Current.Networking.SubnetA, Config.Current.Networking.SubnetB],
        maxAZs: Config.Current.Networking.MaxAZs
      },
      domain: Config.Current.Domain
    });

    const lambdaPlatformRole = new iam.Role(this, mainId('lambda-platform-role'), {
      assumedBy: new iam.AccountRootPrincipal(),
      description: "This role is for AWS Lambda to assume for cluster operations",
    });

    lambdaPlatformRole.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [`arn:${cdk.Aws.PARTITION}:eks:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:cluster/*`],
      actions: [
        "eks:DescribeNodegroup",
        "eks:ListNodegroups",
        "eks:DescribeCluster",
        "eks:ListClusters",
        "eks:AccessKubernetesApi",
        "ssm:GetParameter",
        "eks:ListUpdates",
        "eks:ListFargateProfiles"
      ]
    }));

    lambdaPlatformRole.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: ["eks:ListClusters"]
    }));

    const eksBlueprintsStack = new EksBlueprintsStack(this, mainId('eks-cluster'), {
      env: props.env,
      prefix: commonName,
      vpc: dataFabricCoreStack.vpc,
      subnets: dataFabricCoreStack.subnets,
      domain: Config.Current.Domain,
      hostedZoneId: dataFabricCoreStack.privateZone.hostedZoneId,
      clusterName: Config.Current.EKS.ClusterName,
      endpointAccess: Config.Current.EKS.EKSEndpointAccess,
      instanceType: Config.Current.EKS.InstanceType,
      numInstances: Config.Current.EKS.ClusterSize,
      adminRoleArn: Config.Current.EKS.EKSAdminRole,
      lambdaPlatformRole: lambdaPlatformRole
    });

    const eksClusterStack = eksBlueprintsStack.getStack();

    if (Config.Current.Immuta.Deploy) {
      immutaStack = new ImmutaStack(eksClusterStack, mainId('immuta-stack'), {
        env: props.env, 
        prefix: commonName,
        vpc: dataFabricCoreStack.vpc,
        securityGroups: [eksClusterStack.getClusterInfo().cluster.clusterSecurityGroup],
        partition: partition,
        cluster: eksClusterStack.getClusterInfo().cluster, 
        lambdaPlatformRole: lambdaPlatformRole,
        hostedZoneId: dataFabricCoreStack.privateZone.hostedZoneId,
        immuta: {
          chartVersion: Config.Current.Immuta.ChartVersion,
          immutaVersion: Config.Current.Immuta.ImmutaVersion,
          imageTag: Config.Current.Immuta.ImageTag,
          domain: Config.Current.Domain,
          username: Config.Current.Immuta.Instance.Username,
          password: Config.Current.Immuta.Instance.Password,
          dbPassword: {
            password: Config.Current.Immuta.Database.ImmutaDBPassword,
            superUserPassword: Config.Current.Immuta.Database.ImmutaDBSuperUserPassword,
            replicationPassword: Config.Current.Immuta.Database.ImmutaDBReplicationPassword,
            patroniApiPassword: Config.Current.Immuta.Database.ImmutaDBPatroniApiPassword,
          },
          qePassword: {
            password: Config.Current.Immuta.Query.ImmutaQEPassword,
            superUserPassword: Config.Current.Immuta.Query.ImmutaQESuperUserPassword,
            replicationPassword: Config.Current.Immuta.Query.ImmutaQEReplicationPassword,
            patroniApiPassword: Config.Current.Immuta.Query.ImmutaQEPatroniApiPassword,
          },
        }
      });

      eksClusterStack.addDependency(immutaStack)
    }
    
    if (Config.Current.RadiantLogic.Deploy) {
      radiantlogicStack = new RadiantLogicStack(eksClusterStack, mainId('radiantlogic-stack'), {
        env: props.env, 
        prefix: commonName,
        vpc: dataFabricCoreStack.vpc,
        securityGroups: [eksClusterStack.getClusterInfo().cluster.clusterSecurityGroup],
        partition: partition,
        cluster: eksClusterStack.getClusterInfo().cluster, 
        lambdaPlatformRole: lambdaPlatformRole,
        domain: Config.Current.Domain,
        hostedZoneId: dataFabricCoreStack.privateZone.hostedZoneId,
        radiantlogic: {
          zkImageTag: Config.Current.RadiantLogic.ZkImageTag,
          fidImageTag: Config.Current.RadiantLogic.FidImageTag,
          license: Config.Current.RadiantLogic.License,
          password: Config.Current.RadiantLogic.RootPassword
        }
      });

      eksClusterStack.addDependency(radiantlogicStack)
    }

    this.createCdkSuppressions();
  }

  /**
   * Suppress service role findings.
   */
  private serviceRoleCdkNagSuppression() {
    for (const child of this.node.findAll()) {

      const rules: { [key: string]: string; } = {
        'AwsSolutions-IAM4': 'Suppressing managed policies created by ServiceRole/DefaultPolicy/NodeGroupRole',
        'AwsSolutions-IAM5': 'Suppressing wildcard resources created by ServiceRole/DefaultPolicy/NodeGroupRole'
      }

      if (child.node.path.includes("ServiceRole") || child.node.path.includes("DefaultPolicy") || child.node.path.includes("NodeGroupRole")) {
        for (const rule in rules) {
          CdkNagSuppressions.createResourceCdkNagSuppressions(child, rule, rules[rule]);
        }
      }
    }
  }

  /**
   * Create cdk-nag suppressions.
   */
  private createCdkSuppressions() {
    CdkNagSuppressions.createStackCdkNagSuppressions(
      this, 
      'AwsSolutions-L1', 
      'Suppressing all Lambda functions not using latest runtime version',
    );

    CdkNagSuppressions.createStackCdkNagSuppressions(
      this, 
      'AwsSolutions-EKS1', 
      'Suppressing K8s public API endpoint as configuration is external',
    );

    CdkNagSuppressions.createStackCdkNagSuppressions(
      this, 
      'CdkNagValidationFailure', 
      'Suppressing warnings against not providing CIDR block to deploy VPC',
    );

    this.serviceRoleCdkNagSuppression();
  }

}