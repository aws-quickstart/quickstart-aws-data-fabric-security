import { Construct } from "constructs"

export interface CodeBuildDeployParameters {
  scope: Construct;
  resourceName: string;
  clusterResources: string[];
  assumeRoleResources: string[];
}

export interface CodeBuildDestroyParameters {
  scope: Construct;
  resourceName: string;
  clusterResources: string[];
  assumeRoleResources: string[];
  logResources: string[];
  route53Resources: string[];
  projectResources: string[];
}