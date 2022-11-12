import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DataFabricCoreStack } from "./data-fabric-core-stack";
import { EKSClusterStack } from "./eks-cluster-stack";
import { EKSCommonComponentsStack } from "./eks-common-components-stack";
import { ImmutaStack } from "./immuta-stack";
import { RadiantLogicStack } from "./radiant-logic";
import { MainStackProps } from "./props/stack-props";
import { Config } from "./core/config";
import { CdkNagSuppressions } from "./core/utilities/cdk-nag-suppressions";

export class MainStack extends Stack {

  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id, props);

    const partition = Stack.of(this).partition;

    const dataFabricCoreStack = new DataFabricCoreStack(this, 'DataFabricCoreStack', {
      env: props.env,
      vpc: {
        vpcId: Config.Current.Networking.VpcId,
        subnetIds: [Config.Current.Networking.SubnetA, Config.Current.Networking.SubnetB],
        maxAZs: Config.Current.Networking.MaxAZs
      },
      domain: Config.Current.Domain
    });

    const eksClusterStack = new EKSClusterStack(this, 'EKSClusterStack', {
      env: props.env,
      eksEndpointAccess: Config.Current.EKS.EKSEndpointAccess,
      partition: partition,
      hostedZoneId: dataFabricCoreStack.privateZone.hostedZoneId,
      subnets: dataFabricCoreStack.subnets,
      vpc: dataFabricCoreStack.vpc,
      instanceType: Config.Current.EKS.InstanceType,
      masterRoleArn: Config.Current.EKS.EKSAdminRole
    });

    const eksCommonComponentsStack = new EKSCommonComponentsStack(this, 'EKSCommonComponentsStack', {
      env: props.env, 
      partition: partition,
      domain: Config.Current.Domain,
      hostedZoneId: dataFabricCoreStack.privateZone.hostedZoneId,
      cluster: eksClusterStack.cluster, 
      clusterRole: eksClusterStack.clusterMasterRole, 
      masterRoleArn: Config.Current.EKS.EKSAdminRole
    });

    // EKS Cluster dependencies
    eksClusterStack.node.addDependency(dataFabricCoreStack);
    eksCommonComponentsStack.node.addDependency(eksClusterStack);

    if (Config.Current.Immuta.Deploy) {
      const immutaStack = new ImmutaStack(this, 'ImmutaStack', {
        env: props.env, 
        partition: partition,
        cluster: eksClusterStack.cluster, 
        clusterRole: eksClusterStack.clusterMasterRole,
        hostedZoneId: dataFabricCoreStack.privateZone.hostedZoneId,
        immuta: {
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

      immutaStack.node.addDependency(eksCommonComponentsStack);
    }
    
    if (Config.Current.RadiantLogic.Deploy) {
      const radiantLogicStack = new RadiantLogicStack(this, 'RadiantLogicStack', {
        env: props.env, 
        partition: partition,
        cluster: eksClusterStack.cluster, 
        clusterRole: eksClusterStack.clusterMasterRole,
        domain: Config.Current.Domain,
        hostedZoneId: dataFabricCoreStack.privateZone.hostedZoneId,
        radiantlogic: {
          license: Config.Current.RadiantLogic.License,
          password: Config.Current.RadiantLogic.RootPassword
        }
      });

      radiantLogicStack.node.addDependency(eksCommonComponentsStack);
    }

    // Supress cdk-nag findings
    this.serviceRoleCdkNagSuppression();
    this.lambdaVersionCdkNagSuppression();
  }

  private serviceRoleCdkNagSuppression() {
    for (const child of this.node.findAll()) {

      const rules: { [key: string]: string; } = {
        'AwsSolutions-IAM4': 'Suppressing managed policies created by ServiceRole',
        'AwsSolutions-IAM5': 'Suppressing wildcard resources created by ServiceRole'
      }

      if (child.node.path.includes("ServiceRole")) {
        for (const rule in rules) {
          CdkNagSuppressions.createResourceCdkNagSuppressions(child, rule, rules[rule]);
        }
      }
    }
  }

  private lambdaVersionCdkNagSuppression() {
    CdkNagSuppressions.createStackCdkNagSuppressions(
      this, 
      'AwsSolutions-L1', 
      'Suppressing all Lambda functions not using latest runtime version',
    );
  }

}