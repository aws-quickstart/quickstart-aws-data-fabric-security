import { Duration, NestedStack, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Role, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as path from "path";
import * as cr from "aws-cdk-lib/custom-resources";
import { EKSCommonComponentsStackProps } from './props/stack-props';
import { ICodeBuildStack } from './core/interface/codebuild-stack';
import { CdkNagSuppressions } from './core/utilities/cdk-nag-suppressions';
import { CodeBuildPolicies } from './core/utilities/codebuild-policies';
import { CodeBuildDeployParameters, CodeBuildDestroyParameters } from './core/interface/codebuild-params';

const commonName = "data-fabric-common";
const commonId = (id: string) => `${commonName}-${id}`;
const installName = commonId('install');
const uninstallName = commonId('uninstall');
const namespace = "common-components"

export class EKSCommonComponentsStack extends NestedStack implements ICodeBuildStack {
  constructor(scope: Construct, id: string, props: EKSCommonComponentsStackProps) {
    super(scope, id, props);

    // Upload CommonComponents files to S3
    const commonComponentsAsset = new Asset(this, commonId('asset'), {
      path: path.join(__dirname, "../config/common"),
    });

    let deployParameters: CodeBuildDeployParameters = {
      scope: this,
      resourceName: commonId('deploy-policy'),
      clusterResources: [props.cluster.clusterArn],
      assumeRoleResources: [`arn:${props.partition}:iam::${props.env.account}:role/DataFabricStack*`]
    }

    let destroyParameters: CodeBuildDestroyParameters = {
      scope: this,
      resourceName: commonId('destroy-policy'),
      clusterResources: [props.cluster.clusterArn],
      assumeRoleResources: [`arn:${props.partition}:iam::${props.env.account}:role/DataFabricStack*`],
      logResources: [
        `arn:${props.partition}:logs:${props.env.region}:${props.env.account}:log-group:*`,
        `arn:${props.partition}:logs:${props.env.region}:${props.env.account}:log-group:*:log-stream:*`
      ],
      route53Resources: [`arn:${props.partition}:route53:::hostedzone/${props.hostedZoneId}`],
      projectResources: [`arn:${props.partition}:codebuild:${props.env.region}:${props.env.account}:project/UninstallCommonComponents`]
    }

    // Create CodeBuild Projects
    const commonComponentsBuild = this.createBuildProject(commonComponentsAsset.s3ObjectUrl, props);
    const commonComponentsDestroy = this.createDestroyProject(props);

    // Get CodeBuild Role , ssmkey and add grant
    const commonComponentsBuildRole = commonComponentsBuild.role as Role;
    const ssmKey = kms.Alias.fromAliasName(this, "ssmkey", "alias/aws/ssm");
    commonComponentsAsset.grantRead(commonComponentsBuildRole);
    ssmKey.grantDecrypt(commonComponentsBuildRole);

    const commonComponentsDeployPolicy = CodeBuildPolicies.createDeployPolicy(deployParameters);

    const commonComponentsDestroyRole = commonComponentsDestroy.role as Role;
    const commonComponentsDestroyPolicy = CodeBuildPolicies.createDestroyPolicy(destroyParameters);
    
    commonComponentsBuildRole.attachInlinePolicy(commonComponentsDeployPolicy);
    commonComponentsDestroyRole.attachInlinePolicy(commonComponentsDestroyPolicy);

    //AWSCustomResource to handle cloudformation status change events
    new cr.AwsCustomResource(this, commonId('bootstrap'), {
      timeout: Duration.minutes(10),
      functionName: commonId('bootstrap'),
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["sts:AssumeRole"],
          resources: [
            `arn:${props.partition}:iam::${props.env.account}:role/*`
          ],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["codebuild:*"],
          resources: [
            commonComponentsBuild.projectArn,
            commonComponentsDestroy.projectArn
          ],
        }),
      ]),
      onCreate: {
        service: "CodeBuild",
        action: "startBuild",
        parameters: {
          projectName: installName,
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
      onDelete: {
        service: "CodeBuild",
        action: "startBuild",
        parameters: {
          projectName: uninstallName,
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
    });

    CdkNagSuppressions.createCommonCdkNagSuppressions(this, commonName);
  }

  createBuildProject(s3url: string, props: EKSCommonComponentsStackProps) {
    //CodeBuild Project to install common services
    const commonComponentsBuild = new codebuild.Project(this, installName, {
      projectName: installName,
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
      },
      buildSpec: codebuild.BuildSpec.fromObjectToYaml({
        version: "0.2",
        env: {
          variables: {
            NAMESPACE: `${namespace}`,
            S3URL: `${s3url}`,
            HOSTNAME: `${props.domain}`,
            MASTERROLE: `${props.masterRoleArn}`,
            CLUSTERROLE: `${props.clusterRole.roleArn}`,
            CLUSTERNAME: `${props.cluster.clusterName}`,
          },
        },
        phases: {
          pre_build: {
            commands: [
              'echo "Installing kubectl"',
              'curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"',
              'echo "Installing helm"',
              'curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3',
              'chmod 700 get_helm.sh',
              './get_helm.sh'
            ],
          },
          build: {
            commands: [
              'echo "Copy and unzip CommonComponents files"',
              'aws s3 cp $S3URL $NAMESPACE.zip',
              'unzip $NAMESPACE.zip',
              'echo "Updating kubeconfig"',
              'aws eks update-kubeconfig --name $CLUSTERNAME --region $AWS_DEFAULT_REGION --role-arn $CLUSTERROLE',
              'kubectl create namespace $NAMESPACE',
              'helm repo add bitnami https://charts.bitnami.com/bitnami',
              'echo $CLUSTERROLE',
              'sed -i "s|ASSUME_ROLE_ARN|$CLUSTERROLE|g" external-dns-values.yaml',
              'sed -i "s|ROLE_ARN|$MASTERROLE|g" external-dns-values.yaml',
              'sed -i "s|REGION|$AWS_DEFAULT_REGION|g" external-dns-values.yaml',
              'sed -i "s|HOSTNAME|$HOSTNAME|g" external-dns-values.yaml',
              'cat external-dns-values.yaml',
              'helm install external-dns bitnami/external-dns -f external-dns-values.yaml -n $NAMESPACE',
              `aws codebuild delete-project --name ${uninstallName}`
            ],
          },
        },
      }),
    });

    return commonComponentsBuild;
  }

  createDestroyProject(props: EKSCommonComponentsStackProps) {
    //CodeBuild Project to remove common services
    const commonComponentsDestroy = new codebuild.Project(this, uninstallName, {
      projectName: uninstallName,
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
      },
      buildSpec: codebuild.BuildSpec.fromObjectToYaml({
        version: "0.2",
        env: {
          variables: {
            NAMESPACE: `${namespace}`,
            CLUSTERROLE: `${props.clusterRole.roleArn}`,
            CLUSTERNAME: `${props.cluster.clusterName}`,
          },
        },
        phases: {
          pre_build: {
            commands: [
              'echo "Installing kubectl"',
              'curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"',
              'echo "Installing helm"',
              'curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3',
              'chmod 700 get_helm.sh',
              './get_helm.sh',
            ],
          },
          build: {
            commands: [
              'echo "Updating kubeconfig"',
              'aws eks update-kubeconfig --name $CLUSTERNAME --region $AWS_DEFAULT_REGION --role-arn $CLUSTERROLE',
              'helm repo add bitnami https://charts.bitnami.com/bitnami',
              'helm uninstall external-dns -n $NAMESPACE',
              'kubectl delete namespace $NAMESPACE',
              'echo "Uninstall Complete"',
              'aws codebuild delete-project --name UninstallCommonComponents'
            ],
          },
        },
      }),
    });

    commonComponentsDestroy.applyRemovalPolicy(RemovalPolicy.RETAIN);
    
    return commonComponentsDestroy;
  }

}