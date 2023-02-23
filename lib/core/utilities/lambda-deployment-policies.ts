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
          actions: ["sts:AssumeRole"],
          resources: parameters.assumeRoleResources,
        }),
        new iam.PolicyStatement({
          actions: ["iam:PassRole"],
          resources: parameters.assumeRoleResources,
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
          actions: ["sts:AssumeRole"],
          resources: parameters.assumeRoleResources,
        }),
        new iam.PolicyStatement({
          actions: ["iam:PassRole"],
          resources: parameters.assumeRoleResources,
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