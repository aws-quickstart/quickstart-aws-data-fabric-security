import { Environment, NestedStackProps, StackProps } from "aws-cdk-lib";
import { ISubnet, IVpc } from "aws-cdk-lib/aws-ec2";
import { Cluster } from "aws-cdk-lib/aws-eks";
import { IRole } from "aws-cdk-lib/aws-iam";

export interface MainStackProps extends StackProps {
  env: Environment,
}

export interface DataFabricCoreStackProps extends NestedStackProps {
  env: Environment,
  vpc: {
    vpcId: string,
    subnetIds: string[],
    maxAZs: number,
  }
  domain: string
}

export interface EKSClusterStackProps extends NestedStackProps {
  env: Environment,
  eksEndpointAccess: string;
  partition: string,
  hostedZoneId: string,
  vpc: IVpc,
  subnets: ISubnet[],
  instanceType: string,
  masterRoleArn: string
}

export interface EKSCommonComponentsStackProps extends NestedStackProps {
  env: Environment,
  partition: string,
  domain: string,
  hostedZoneId: string,
  cluster: Cluster,
  clusterRole: IRole,
  masterRoleArn: string
}

export interface ImmutaStackProps extends NestedStackProps {
  env: Environment,
  partition: string,
  cluster: Cluster,
  clusterRole: IRole,
  hostedZoneId: string,
  immuta: {
    domain: string,
    username: string,
    password: string,
    dbPassword: {
      password: string,
      superUserPassword: string,
      replicationPassword: string,
      patroniApiPassword: string,
    },
    qePassword: {
      password: string,
      superUserPassword: string,
      replicationPassword: string,
      patroniApiPassword: string,
    },
  }
}

export interface RadiantLogicStackProps extends NestedStackProps {
  env: Environment,
  partition: string,
  cluster: Cluster,
  clusterRole: IRole,
  hostedZoneId: string,
  domain: string,
  radiantlogic: {
    license: string,
    password: string
  }
}