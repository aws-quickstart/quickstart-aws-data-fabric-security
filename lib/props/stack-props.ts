import { Environment, NestedStackProps, StackProps } from "aws-cdk-lib";
import { ISecurityGroup, IVpc, ISubnet } from "aws-cdk-lib/aws-ec2";
import { Cluster } from "aws-cdk-lib/aws-eks";
import { IRole } from "aws-cdk-lib/aws-iam";

export interface MainStackProps extends StackProps {
  env: Environment,
}

export interface DataFabricSecurityStackProps extends NestedStackProps {
  env: Environment,
  prefix: string,
  vpc: {
    vpcId: string,
    subnetIds: string[],
    maxAZs: number,
  }
  domain: string
}

export interface EksBlueprintsStackProps extends StackProps {
  env: Environment,
  prefix: string,
  vpc: IVpc,
  subnets: ISubnet[],
  domain: string,
  hostedZoneId: string,
  endpointAccess: string,
  instanceType: string,
  numInstances: number,
  adminRoleArn: string
}

export interface ImmutaStackProps extends NestedStackProps {
  env: Environment,
  prefix: string,
  vpc: IVpc,
  securityGroups: [ISecurityGroup],
  partition: string,
  cluster: Cluster,
  clusterRole: IRole,
  hostedZoneId: string,
  immuta: {
    chartVersion: string,
    immutaVersion: string,
    imageTag: string,
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
  prefix: string,
  vpc: IVpc,
  securityGroups: [ISecurityGroup],
  partition: string,
  cluster: Cluster,
  clusterRole: IRole,
  hostedZoneId: string,
  domain: string,
  radiantlogic: {
    zkImageTag: string;
    fidImageTag: string;
    license: string,
    password: string
  }
}