import * as iam from 'aws-cdk-lib/aws-iam';
import { LambdaDeployParameters, LambdaDestroyParameters } from '../interface/lambda-deployment-parameters';

export class LambdaDeploymentPolicies {
  static createDeployPolicy(parameters: LambdaDeployParameters) {
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

  static createDestroyPolicy(parameters: LambdaDestroyParameters) {
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