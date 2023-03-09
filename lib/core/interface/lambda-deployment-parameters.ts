export interface LambdaDeployParameters {
  resourceName: string;
  clusterResources: string[];
  logResources: string[];
}

export interface LambdaDestroyParameters {
  resourceName: string;
  clusterResources: string[];
  logResources: string[];
  route53Resources: string[];
}