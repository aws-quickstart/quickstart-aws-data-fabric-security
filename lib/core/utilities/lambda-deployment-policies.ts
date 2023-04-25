import * as iam from 'aws-cdk-lib/aws-iam';
import { LambdaDeployParameters, LambdaDestroyParameters } from '../interface/lambda-deployment-parameters';

/**
 * The Lambda deployment policies.
 */
export class LambdaDeploymentPolicies {
  /**
   * Create the Lambda function install policy.
   * 
   * @param parameters - The Lambda policy parameters.
   * @returns The policy document.
   */
  static createDeployPolicy(parameters: LambdaDeployParameters): iam.PolicyDocument {
    const deployPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: ["eks:*"],
          resources: parameters.clusterResources,
        }),
        new iam.PolicyStatement({
          actions: [
            "ec2:DescribeNetworkInterfaces",
            "ec2:CreateNetworkInterface",
            "ec2:DeleteNetworkInterface",
            "ec2:DescribeInstances",
            "ec2:AttachNetworkInterface"
          ],
          resources: ["*"],
        }),       
        new iam.PolicyStatement({
          actions: ["logs:*"],
          resources: parameters.logResources,
        }),
      ],
    });

    return deployPolicy;
  }

  /**
   * Create the Lambda function uninstall policy.
   * 
   * @param parameters - The Lambda policy parameters.
   * @returns The policy document.
   */
  static createDestroyPolicy(parameters: LambdaDestroyParameters): iam.PolicyDocument {
    const destroyPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: ["eks:*"],
          resources: parameters.clusterResources,
        }),
        new iam.PolicyStatement({
          actions: [
            "ec2:DescribeNetworkInterfaces",
            "ec2:CreateNetworkInterface",
            "ec2:DeleteNetworkInterface",
            "ec2:DescribeInstances",
            "ec2:AttachNetworkInterface"
          ],
          resources: ["*"],
        }),   
        new iam.PolicyStatement({
          actions: ["logs:*"],
          resources: parameters.logResources,
        }),
        new iam.PolicyStatement({
          actions: [
            "route53:*"
          ],
          resources: parameters.route53Resources,
        }),
      ],
    });

    return destroyPolicy;
  }
}