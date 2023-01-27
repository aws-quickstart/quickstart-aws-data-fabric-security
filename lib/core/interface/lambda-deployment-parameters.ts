import { Construct } from "constructs"

export interface LambdaDeployParameters {
  scope: Construct;
  resourceName: string;
  clusterResources: string[];
  assumeRoleResources: string[];
}

export interface LambdaDestroyParameters {
  scope: Construct;
  resourceName: string;
  clusterResources: string[];
  assumeRoleResources: string[];
  logResources: string[];
  route53Resources: string[];
  projectResources: string[];
}