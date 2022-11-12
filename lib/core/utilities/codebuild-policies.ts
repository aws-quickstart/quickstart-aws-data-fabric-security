import * as iam from 'aws-cdk-lib/aws-iam';
import { CodeBuildDeployParameters, CodeBuildDestroyParameters } from '../interface/codebuild-params';

export class CodeBuildPolicies {
  static createDeployPolicy(parameters: CodeBuildDeployParameters) {
    const deployPolicy = new iam.Policy(parameters.scope, parameters.resourceName, {
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
      ],
    });

    return deployPolicy;
  }

  static createDestroyPolicy(parameters: CodeBuildDestroyParameters) {
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