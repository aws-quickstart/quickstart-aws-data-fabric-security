import { Environment, NestedStackProps, StackProps } from "aws-cdk-lib";

import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
import * as iam  from "aws-cdk-lib/aws-iam";

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
  vpc: ec2.IVpc,
  subnets: ec2.ISubnet[],
  domain: string,
  hostedZoneId: string,
  clusterName: string,
  endpointAccess: string,
  instanceType: string,
  numInstances: number,
  adminRoleArn: string
}

export interface ImmutaStackProps extends NestedStackProps {
  env: Environment,
  prefix: string,
  vpc: ec2.IVpc,
  securityGroups: [ec2.ISecurityGroup],
  partition: string,
  cluster: eks.Cluster,
  clusterRole: iam.IRole,
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
  vpc: ec2.IVpc,
  securityGroups: [ec2.ISecurityGroup],
  partition: string,
  cluster: eks.Cluster,
  clusterRole: iam.IRole,
  hostedZoneId: string,
  domain: string,
  radiantlogic: {
    zkImageTag: string;
    fidImageTag: string;
    license: string,
    password: string
  }
}