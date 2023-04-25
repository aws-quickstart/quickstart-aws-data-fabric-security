import { Stack } from "aws-cdk-lib";
import { NagSuppressions } from "cdk-nag";
import { IConstruct } from "constructs";

/**
 * The cdk-nag suppression class.
 */
export class CdkNagSuppressions {
  /**
   * Create the cdk-nag suppressions within the resource.
   * 
   * @param resource - Construct of the resource.
   * @param id - cdk-nag identifier.
   * @param reason - Reason for the suppression.
   * @param appliesTo - Children resources this should be applied to.
   */
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

  /**
   * Create the cdk-nag suppressions within the stack.
   * 
   * @param stack - The Stack to apply this suppression.
   * @param id - cdk-nag identifier.
   * @param reason - Reason for the suppression.
   */
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

  /**
   * Create the common cdk-nag suppressions within the stack.
   * 
   * @param stack - The Stack to apply this suppression.
   * @param commonName - The name of the cdk-nag to be suppressed.
   */
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