import { StackProps } from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";

export interface ICodeBuildStack {
  createBuildProject(s3url: string, props: StackProps): codebuild.Project;
  createDestroyProject(props: StackProps): codebuild.Project;
}