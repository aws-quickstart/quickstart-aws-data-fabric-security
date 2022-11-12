import { Duration, NestedStack, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Role, Effect } from "aws-cdk-lib/aws-iam";
import { Asset } from "aws-cdk-lib/aws-s3-assets";

import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as kms from "aws-cdk-lib/aws-kms";
import * as cr from "aws-cdk-lib/custom-resources";
import * as iam from 'aws-cdk-lib/aws-iam';

import * as path from "path";

import { RadiantLogicStackProps } from "./props/stack-props";
import { ICodeBuildStack } from "./core/interface/codebuild-stack";
import { CdkNagSuppressions } from "./core/utilities/cdk-nag-suppressions";
import { CodeBuildPolicies } from "./core/utilities/codebuild-policies";
import { CodeBuildDeployParameters, CodeBuildDestroyParameters } from "./core/interface/codebuild-params";

const commonName = "data-fabric-radiantlogic";
const radiantLogicId = (id: string) => `${commonName}-${id}`;
const installName = radiantLogicId('install');
const uninstallName = radiantLogicId('uninstall');
const namespace = "radiantlogic";

export class RadiantLogicStack extends NestedStack implements ICodeBuildStack {
  constructor(scope: Construct, id: string, props: RadiantLogicStackProps) {
    super(scope, id, props);

    const radiantLogicAsset = new Asset(this, radiantLogicId('asset'), {
      path: path.join(__dirname, "../config/radiant-logic"),
    });

    let deployParameters: CodeBuildDeployParameters = {
      scope: this,
      resourceName: radiantLogicId('deploy-policy'),
      clusterResources: [props.cluster.clusterArn],
      assumeRoleResources: [`arn:${props.partition}:iam::${props.env.account}:role/DataFabricStack*`]
    }

    let destroyParameters: CodeBuildDestroyParameters = {
      scope: this,
      resourceName: radiantLogicId('destroy-policy'),
      clusterResources: [props.cluster.clusterArn],
      assumeRoleResources: [`arn:${props.partition}:iam::${props.env.account}:role/DataFabricStack*`],
      logResources: [
        `arn:${props.partition}:logs:${props.env.region}:${props.env.account}:log-group:*`,
        `arn:${props.partition}:logs:${props.env.region}:${props.env.account}:log-group:*:log-stream:*`
      ],
      route53Resources: [`arn:${props.partition}:route53:::hostedzone/${props.hostedZoneId}`],
      projectResources: [`arn:${props.partition}:codebuild:${props.env.region}:${props.env.account}:project/UninstallRadiantLogic`]
    }

    const radiantLogicBuild = this.createBuildProject(radiantLogicAsset.s3ObjectUrl, props)
    const radiantLogicDestroy = this.createDestroyProject(props);

    const radiantLogicBuildRole = radiantLogicBuild.role as Role;
    const ssmKey = kms.Alias.fromAliasName(this, "ssmkey", "alias/aws/ssm");
    radiantLogicAsset.grantRead(radiantLogicBuildRole);
    ssmKey.grantDecrypt(radiantLogicBuildRole);

    const radiantLogicDeployPolicy = CodeBuildPolicies.createDeployPolicy(deployParameters);

    const radiantLogicDestroyRole = radiantLogicDestroy.role as Role;
    const radiantLogicDestroyPolicy =  CodeBuildPolicies.createDestroyPolicy(destroyParameters);

    radiantLogicBuildRole.attachInlinePolicy(radiantLogicDeployPolicy);
    radiantLogicDestroyRole.attachInlinePolicy(radiantLogicDestroyPolicy);

    // AWSCustomResource to handle cloudformation status change events
    new cr.AwsCustomResource(this, radiantLogicId('bootstrap'), {
      timeout: Duration.minutes(10),
      functionName: radiantLogicId('bootstrap'),
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["sts:AssumeRole"],
          resources: [
            radiantLogicBuildRole.roleArn,
            radiantLogicDestroyRole.roleArn
          ],
        }),
        new iam.PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["codebuild:*"],
          resources: [
            radiantLogicBuild.projectArn,
            radiantLogicDestroy.projectArn
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
        outputPaths: ["build.buildStatus"]
      },
      onDelete: {
        service: "CodeBuild",
        action: "startBuild",
        parameters: {
          projectName: uninstallName,
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
        outputPaths: ["build.buildStatus"]
      },
    });

    CdkNagSuppressions.createCommonCdkNagSuppressions(this, commonName);
  }

  createBuildProject(s3url: string, props: RadiantLogicStackProps) {
    // CodeBuild Project to install Radiant Logic
    const radiantLogicBuild = new codebuild.Project(this, installName, {
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
            CLUSTERROLE: `${props.clusterRole.roleArn}`,
            CLUSTERNAME: `${props.cluster.clusterName}`,
            HOSTNAME: `${namespace}.${props.domain}`,
            LICENSE: `${props.radiantlogic.license}`,
            ROOTPASS: `${props.radiantlogic.password}`
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
              'echo "Copy and unzip Radiant Logic files"',
              'aws s3 cp $S3URL radiant-logic.zip',
              'unzip radiant-logic.zip',
              'echo "Updating kubeconfig"',
              'aws eks update-kubeconfig --name $CLUSTERNAME --region $AWS_DEFAULT_REGION --role-arn $CLUSTERROLE',
              'kubectl create namespace $NAMESPACE',
              'helm repo add radiantone https://radiantlogic-devops.github.io/helm',
              'helm install zookeeper radiantone/zookeeper --wait --wait-for-jobs -n $NAMESPACE',
              'echo "Waiting 60 seconds for Zookeeper to complete instantiation"',
              'sleep 60',
              'helm install fid radiantone/fid -n $NAMESPACE --set fid.license=$LICENSE --set fid.rootPassword=$ROOTPASS',
              'kubectl apply -f radiant-logic-ingress.yaml -n $NAMESPACE',
              `kubectl patch service fid-ingress -n $NAMESPACE -p '{"metadata": {"annotations": {"external-dns.alpha.kubernetes.io/hostname": "'"$HOSTNAME"'"}}}'`,
              'echo "Deployment Complete"',
            ],
          },
        },
      }),
    });

    return radiantLogicBuild;
  }

  createDestroyProject(props: RadiantLogicStackProps) {
    const radiantLogicDestroy = new codebuild.Project(this, uninstallName, {
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
              'helm uninstall zookeeper -n $NAMESPACE',
              'echo "Zookeeper Uninstall Complete"',
              'kubectl delete svc fid-ingress -n $NAMESPACE',
              'helm uninstall fid -n $NAMESPACE',
              'kubectl delete namespace $NAMESPACE',
              'echo "FID Uninstall Complete"',
              `aws codebuild delete-project --name ${uninstallName}`
            ],
          },
        },
      }),
    });

    radiantLogicDestroy.applyRemovalPolicy(RemovalPolicy.RETAIN);

    return radiantLogicDestroy;
  }
}
