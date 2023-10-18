import { Environment, NestedStackProps, StackProps } from "aws-cdk-lib";

import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
import * as iam  from "aws-cdk-lib/aws-iam";

/**
 * Main stack properties.
 */
export interface MainStackProps extends StackProps {
  env: Environment,
}

/**
 * Data Fabric Security stack properties.
 */
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

/**
 * EKS Blueprints stack properties.
 */
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
  adminRoleArn: string,
  lambdaPlatformRole: iam.Role
}

/**
 * Immuta stack properties.
 */
export interface ImmutaStackProps extends NestedStackProps {
  env: Environment,
  prefix: string,
  vpc: ec2.IVpc,
  securityGroups: [ec2.ISecurityGroup],
  partition: string,
  cluster: eks.ICluster,
  lambdaPlatformRole: iam.Role,
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

/**
 * Radiant Logic stack properties.
 */
export interface RadiantLogicStackProps extends NestedStackProps {
  env: Environment,
  prefix: string,
  vpc: ec2.IVpc,
  securityGroups: [ec2.ISecurityGroup],
  partition: string,
  cluster: eks.ICluster,
  lambdaPlatformRole: iam.IRole,
  hostedZoneId: string,
  domain: string,
  radiantlogic: {
    zkImageTag: string;
    fidImageTag: string;
    license: string,
    password: string
  }
}