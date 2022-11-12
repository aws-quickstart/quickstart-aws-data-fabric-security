import { Construct } from "constructs";
import { Duration, NestedStack, RemovalPolicy } from "aws-cdk-lib";
import { Role, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { Asset } from "aws-cdk-lib/aws-s3-assets";

import * as kms from "aws-cdk-lib/aws-kms";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as cr from "aws-cdk-lib/custom-resources";

import { ImmutaStackProps } from "./props/stack-props";
import { ICodeBuildStack } from "./core/interface/codebuild-stack";
import { CdkNagSuppressions } from "./core/utilities/cdk-nag-suppressions";
import { CodeBuildDeployParameters, CodeBuildDestroyParameters } from "./core/interface/codebuild-params";
import { CodeBuildPolicies } from "./core/utilities/codebuild-policies";

import * as path from "path";

const commonName = "data-fabric-immuta";
const immutaId = (id: string) => `${commonName}-${id}`;
const installName = immutaId('install');
const uninstallName = immutaId('uninstall');
const namespace = "immuta";

export class ImmutaStack extends NestedStack implements ICodeBuildStack {
  constructor(scope: Construct, id: string, props: ImmutaStackProps) {
    super(scope, id, props);

    const immutaAsset = new Asset(this, immutaId('asset'), {
      path: path.join(__dirname, "../config/immuta"),
    });

    let deployParameters: CodeBuildDeployParameters = {
      scope: this,
      resourceName: immutaId('deploy-policy'),
      clusterResources: [props.cluster.clusterArn],
      assumeRoleResources: [`arn:${props.partition}:iam::${props.env.account}:role/DataFabricStack*`]
    }

    let destroyParameters: CodeBuildDestroyParameters = {
      scope: this,
      resourceName: immutaId('destroy-policy'),
      clusterResources: [props.cluster.clusterArn],
      assumeRoleResources: [`arn:${props.partition}:iam::${props.env.account}:role/DataFabricStack*`],
      logResources: [
        `arn:${props.partition}:logs:${props.env.region}:${props.env.account}:log-group:*`,
        `arn:${props.partition}:logs:${props.env.region}:${props.env.account}:log-group:*:log-stream:*`
      ],
      route53Resources: [`arn:${props.partition}:route53:::hostedzone/${props.hostedZoneId}`],
      projectResources: [`arn:${props.partition}:codebuild:${props.env.region}:${props.env.account}:project/UninstallImmuta`]
    }

    const immutaBuild = this.createBuildProject(immutaAsset.s3ObjectUrl, props);
    const immutaDestroy = this.createDestroyProject(props);

    const immutaBuildRole = immutaBuild.role as Role;
    const ssmKey = kms.Alias.fromAliasName(this, "ssmkey", "alias/aws/ssm");
    immutaAsset.grantRead(immutaBuildRole);
    ssmKey.grantDecrypt(immutaBuildRole);

    const immutaDeployPolicy = CodeBuildPolicies.createDeployPolicy(deployParameters);

    const immutaDestroyRole = immutaDestroy.role as Role;
    const immutaDestroyPolicy = CodeBuildPolicies.createDestroyPolicy(destroyParameters);

    immutaBuildRole.attachInlinePolicy(immutaDeployPolicy);
    immutaDestroyRole.attachInlinePolicy(immutaDestroyPolicy);

    //AWSCustomResource to handle cloudformation status change events
    new cr.AwsCustomResource(this, immutaId('bootstrap'), {
      timeout: Duration.minutes(10),
      functionName: immutaId('bootstrap'),
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["sts:AssumeRole"],
          resources: [
            immutaBuildRole.roleArn,
            immutaDestroyRole.roleArn
          ],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["codebuild:*"],
          resources: [
            immutaBuild.projectArn,
            immutaDestroy.projectArn
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

  createBuildProject(s3url: string, props: ImmutaStackProps) {
    //Codebuild Project to install immuta
    const immutaBuild = new codebuild.Project(this, installName, {
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
            HOSTNAME: `${namespace + "." + props.immuta.domain}`,
            IMMUTA_USERNAME: `${props.immuta.username}`,
            IMMUTA_PASSWORD: `${props.immuta.password}`,
            DB_PASSWORD: `${props.immuta.dbPassword.password}`,
            DB_SUPER_USER_PASSWORD: `${props.immuta.dbPassword.superUserPassword}`,
            DB_REPLICATION_PASSWORD: `${props.immuta.dbPassword.replicationPassword}`,
            DB_PATRONI_PASSWORD: `${props.immuta.dbPassword.patroniApiPassword}`,
            EQ_PASSWORD: `${props.immuta.qePassword.password}`,
            EQ_SUPER_USER_PASSWORD: `${props.immuta.qePassword.superUserPassword}`,
            EQ_REPLICATION_PASSWORD: `${props.immuta.qePassword.replicationPassword}`,
            EQ_PATRONI_PASSWORD: `${props.immuta.qePassword.patroniApiPassword}`,
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
              'echo "Copy and unzip Immuta files"',
              'aws s3 cp $S3URL immuta.zip',
              'unzip immuta.zip',
              'echo "Updating kubeconfig"',
              'aws eks update-kubeconfig --name $CLUSTERNAME --region $AWS_DEFAULT_REGION --role-arn $CLUSTERROLE',
              'kubectl create namespace $NAMESPACE',
              'echo "Setting kubectl secrets"',
              `echo $HOSTNAME`,
              `kubectl create secret docker-registry immuta-registry --docker-server=https://registry.immuta.com --docker-username=$IMMUTA_USERNAME \
              --docker-password=$IMMUTA_PASSWORD --docker-email=support@immuta.com --namespace immuta`,
              'helm repo add immuta https://archives.immuta.com/charts --username $IMMUTA_USERNAME --password $IMMUTA_PASSWORD',
              `helm install immuta immuta/immuta -n $NAMESPACE --values immuta-values.yaml --set externalHostname=$HOSTNAME --set database.password=$DB_PASSWORD \
              --set database.superuserPassword=$DB_SUPER_USER_PASSWORD --set database.replicationPassword=$DB_REPLICATION_PASSWORD --set database.patroniApiPassword=$DB_PATRONI_PASSWORD \
              --set queryEngine.password=$EQ_PASSWORD --set queryEngine.superuserPassword=$EQ_SUPER_USER_PASSWORD --set queryEngine.replicationPassword=$EQ_REPLICATION_PASSWORD \
              --set queryEngine.password=$EQ_PATRONI_PASSWORD`,
              `kubectl patch service immuta-nginx-ingress -n $NAMESPACE -p '{"metadata": {"annotations": {"external-dns.alpha.kubernetes.io/hostname": "'"$HOSTNAME"'"}}}'`
            ],
          },
        },
      }),
    });

    return immutaBuild;
  }

  createDestroyProject(props: ImmutaStackProps) {
    //Codebuild Project to uninstall immuta
    const immutaDestroy = new codebuild.Project(this, uninstallName, {
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
              'helm uninstall immuta -n $NAMESPACE',
              'kubectl delete secrets immuta-registry -n $NAMESPACE',
              'kubectl delete svc immuta-nginx-ingress -n $NAMESPACE',
              'kubectl delete namespace $NAMESPACE',
              'echo "Uninstall Complete"',
              `aws codebuild delete-project --name ${uninstallName}`
            ],
          },
        },
      }),
    });

    immutaDestroy.applyRemovalPolicy(RemovalPolicy.RETAIN);

    return immutaDestroy;
  }
}