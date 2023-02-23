import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";

export interface ILambdaDeploymentStack {
  createDeployPolicy(props: cdk.StackProps): iam.PolicyDocument;
  createDestroyPolicy(props: cdk.StackProps): iam.PolicyDocument;
  createDeployFunction(props: cdk.StackProps): lambda.Function;
  createDestroyFunction(props: cdk.StackProps): lambda.Function;
  createBootstrap(deployFunction: lambda.Function, destroyFunction: lambda.Function): void;
}