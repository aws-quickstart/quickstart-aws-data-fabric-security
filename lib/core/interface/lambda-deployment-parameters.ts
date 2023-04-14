export interface LambdaDeployParameters {
  resourceName: string;
  clusterResources: string[];
  vpcResources: string[];
  logResources: string[];
}

export interface LambdaDestroyParameters {
  resourceName: string;
  clusterResources: string[];
  vpcResources: string[];
  logResources: string[];
  route53Resources: string[];
}