import { Stack } from "aws-cdk-lib";
import { NagSuppressions } from "cdk-nag";
import { IConstruct } from "constructs";

export class CdkNagSuppressions {
  static createResourceCdkNagSuppressions(resource: IConstruct, id: string, reason: string, appliesTo?: string[]) {
    NagSuppressions.addResourceSuppressions(
      resource,
      [
        {
          id: id,
          reason: reason,
          appliesTo: appliesTo,
        },
      ],
      true
    );
  }

  static createStackCdkNagSuppressions(stack: Stack, id: string, reason: string) {
    NagSuppressions.addStackSuppressions(
      stack,
      [
        {
          id: id,
          reason: reason,
        },
      ],
      true
    );
  }

  static createCommonCdkNagSuppressions(stack: Stack, commonName: string) {
    for (const child of stack.node.findAll()) {
      const commonRules: { [key: string]: string; } = {
        'AwsSolutions-CB4': 'Suppressing AWS KMS encryption on CodeBuild Projects',
        'AwsSolutions-IAM5': 'Suppressing wildcard policies for resources within scope'
      }

    if (child.node.path.includes(commonName)) {
        for (const rule in commonRules) {
          CdkNagSuppressions.createResourceCdkNagSuppressions(child, rule, commonRules[rule]);
        }
      }
    }
  }
}