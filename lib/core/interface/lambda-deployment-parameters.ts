/**
 * Interface for the Lambda function install policy parameters.
 */
export interface LambdaDeployParameters {
  resourceName: string;
  clusterResources: string[];
  vpcResources: string[];
  logResources: string[];
}

/**
 * Interface for the Lambda function uninstall policy parameters.
 */
export interface LambdaDestroyParameters {
  resourceName: string;
  clusterResources: string[];
  vpcResources: string[];
  logResources: string[];
  route53Resources: string[];
}