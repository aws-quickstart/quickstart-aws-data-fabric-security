import * as iam from 'aws-cdk-lib/aws-iam';
import { LambdaDeployParameters, LambdaDestroyParameters } from '../interface/lambda-deployment-parameters';

export class LambdaDeploymentPolicies {
  static createDeployPolicy(parameters: LambdaDeployParameters) {
    const deployPolicy = new iam.Policy(parameters.scope, parameters.resourceName, {
      policyName: parameters.resourceName,
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
    const destroyPolicy = new iam.Policy(parameters.scope, parameters.resourceName, {
      policyName: parameters.resourceName,
      statements: [
        new iam.PolicyStatement({
          actions: ["eks:DescribeCluster"],
          resources: parameters.clusterResources,
        }),
        new iam.PolicyStatement({
          actions: ["sts:AssumeRole"],
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
        new iam.PolicyStatement({
          actions: ["codebuild:DeleteProject"],
          resources: parameters.projectResources
        }),
      ],
    });

    return destroyPolicy;
  }
}