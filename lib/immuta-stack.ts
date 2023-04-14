import * as cdk from 'aws-cdk-lib';
import { Construct } from "constructs";

import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as cr from "aws-cdk-lib/custom-resources";

import { KubectlLayer } from "aws-cdk-lib/lambda-layer-kubectl";
import { AwsCliLayer } from "aws-cdk-lib/lambda-layer-awscli";

import * as path from "path";

import { ImmutaStackProps } from "./props/stack-props";
import { ILambdaDeploymentStack } from "./core/interface/lambda-deployment-stack";
import { LambdaDeployParameters, LambdaDestroyParameters } from "./core/interface/lambda-deployment-parameters";
import { LambdaDeploymentPolicies } from "./core/utilities/lambda-deployment-policies";
import { CdkNagSuppressions } from "./core/utilities/cdk-nag-suppressions";

export class ImmutaStack extends cdk.NestedStack implements ILambdaDeploymentStack {
  private readonly immutaId: any;
  private readonly installName: string;
  private readonly uninstallName: string;
  private readonly functionVpc: ec2.IVpc;
  private readonly clusterSecurityGroup: ec2.ISecurityGroup;

  private namespace = "immuta";
  private installStr = "install";
  private uninstallStr = "uninstall";

  private kubectlLayer = new KubectlLayer(this, 'KubectlLayer');
  private awsCliLayer = new AwsCliLayer(this, 'AwsCliLayer');

  constructor(scope: Construct, id: string, props: ImmutaStackProps) {
    super(scope, id, props);

    this.immutaId = (id: string) => `${props.prefix}-${this.namespace}-${id}`;
    this.installName = this.immutaId(this.installStr);
    this.uninstallName = this.immutaId(this.uninstallStr);

    this.functionVpc = props.cluster.vpc;
    this.clusterSecurityGroup = props.cluster.clusterSecurityGroup;

    const immutaDeploy = this.createDeployFunction(props);
    props.cluster.adminRole.grantAssumeRole(immutaDeploy.role!);

    const immutaDestroy = this.createDestroyFunction(props);
    props.cluster.adminRole.grantAssumeRole(immutaDestroy.role!);

    this.createBootstrap(immutaDeploy, immutaDestroy);

    CdkNagSuppressions.createCommonCdkNagSuppressions(this, this.namespace);
  }

  createDeployPolicy(props: ImmutaStackProps): iam.PolicyDocument {
    let deployParameters: LambdaDeployParameters = {
      resourceName: this.immutaId('deploy-policy'),
      clusterResources: [props.cluster.clusterArn],
      vpcResources: [this.functionVpc.vpcArn],
      logResources: [
        `arn:${props.partition}:logs:${props.env.region}:${props.env.account}:log-group:*`,
        `arn:${props.partition}:logs:${props.env.region}:${props.env.account}:log-group:*:log-stream:*`
      ],
    }

    return LambdaDeploymentPolicies.createDeployPolicy(deployParameters);
  }

  createDestroyPolicy(props: ImmutaStackProps): iam.PolicyDocument {
    let destroyParameters: LambdaDestroyParameters = {
      resourceName: this.immutaId('destroy-policy'),
      clusterResources: [props.cluster.clusterArn],
      vpcResources: [this.functionVpc.vpcArn],
      logResources: [
        `arn:${props.partition}:logs:${props.env.region}:${props.env.account}:log-group:*`,
        `arn:${props.partition}:logs:${props.env.region}:${props.env.account}:log-group:*:log-stream:*`
      ],
      route53Resources: [`arn:${props.partition}:route53:::hostedzone/${props.hostedZoneId}`]
    }

    const policy = LambdaDeploymentPolicies.createDestroyPolicy(destroyParameters);

    return policy;
  }

  createDeployFunction(props: ImmutaStackProps): lambda.Function {
    const immutaDeployRole = new iam.Role(this, `${this.immutaId}-deploy-role`, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role to deploy Immuta',
      inlinePolicies: {
        DeployPolicy: this.createDeployPolicy(props)
      }
    });

    const immutaDeployFunction = new lambda.Function(this, this.installName, {
      functionName: this.installName,
      description: "Lambda function that installs Immuta",
      role: immutaDeployRole,
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'main.lambda_handler',
      layers: [this.kubectlLayer, this.awsCliLayer],
      timeout: cdk.Duration.minutes(15),
      vpc: this.functionVpc,
      securityGroups: [this.clusterSecurityGroup],
      code: lambda.Code.fromAsset(path.join(__dirname, `../resources/${this.namespace}/${this.installStr}.zip`)),
      environment: {
        'NAMESPACE': this.namespace,
        'CLUSTER_NAME': props.cluster.clusterName,
        'CLUSTER_ADMIN_ROLE': props.cluster.adminRole.roleArn,
        'LAMBDA_SOURCE_FILE': `./${this.installStr}.sh`,
        'CHART_VERSION': props.immuta.chartVersion,
        'IMMUTA_VERSION': props.immuta.immutaVersion,
        'IMAGE_TAG': props.immuta.imageTag,
        'HOSTNAME': `${this.namespace + "." + props.immuta.domain}`,
        'IMMUTA_USERNAME': props.immuta.username,
        'IMMUTA_PASSWORD': props.immuta.password,
        'DB_PASSWORD': props.immuta.dbPassword.password,
        'DB_SUPER_USER_PASSWORD': props.immuta.dbPassword.superUserPassword,
        'DB_REPLICATION_PASSWORD': props.immuta.dbPassword.replicationPassword,
        'DB_PATRONI_PASSWORD': props.immuta.dbPassword.patroniApiPassword,
        'EQ_PASSWORD': props.immuta.qePassword.password,
        'EQ_SUPER_USER_PASSWORD': props.immuta.qePassword.superUserPassword,
        'EQ_REPLICATION_PASSWORD': props.immuta.qePassword.replicationPassword,
        'EQ_PATRONI_PASSWORD': props.immuta.qePassword.patroniApiPassword,
      }
    });

    return immutaDeployFunction;
  }

  createDestroyFunction(props: ImmutaStackProps): lambda.Function {
    const immutaDestroyRole = new iam.Role(this, `${this.immutaId}-destroy-role`, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role to destroy Immuta',
      inlinePolicies: {
        DestroyPolicy: this.createDestroyPolicy(props)
      }
    });

    const immutaDestroyFunction = new lambda.Function(this, this.uninstallName, {
      functionName: this.uninstallName,
      description: "Lambda function that uninstalls Immuta",
      role: immutaDestroyRole,
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'main.lambda_handler',
      layers: [this.kubectlLayer, this.awsCliLayer],
      timeout: cdk.Duration.minutes(15),
      vpc: this.functionVpc,
      securityGroups: [this.clusterSecurityGroup],
      code: lambda.Code.fromAsset(path.join(__dirname, `../resources/${this.namespace}/${this.uninstallStr}.zip`)),
      environment: {
        'NAMESPACE': this.namespace,
        'IMMUTA_USERNAME': props.immuta.username,
        'IMMUTA_PASSWORD': props.immuta.password,
        'CLUSTER_NAME': props.cluster.clusterName,
        'CLUSTER_ADMIN_ROLE': props.cluster.adminRole.roleArn,
        'LAMBDA_SOURCE_FILE': `./${this.uninstallStr}.sh`,
      }
    });

    return immutaDestroyFunction;
  }

  createBootstrap(deployFunction: lambda.Function, destroyFunction: lambda.Function): void {
    let bootstrapRole = new iam.Role(this, this.immutaId('bootstrap-role'), {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    bootstrapRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [deployFunction.functionArn, destroyFunction.functionArn]
    }));

    bootstrapRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "ec2:DescribeNetworkInterfaces",
        "ec2:CreateNetworkInterface",
        "ec2:DeleteNetworkInterface",
        "ec2:DescribeInstances",
        "ec2:AttachNetworkInterface"
      ],
      resources: ["*"]
    }));

    //Custom Resource to handle CloudFormation status change events
    new cr.AwsCustomResource(this, this.immutaId('bootstrap'), {
      timeout: cdk.Duration.minutes(15),
      functionName: this.immutaId('bootstrap'),
      vpc: this.functionVpc,
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
      role: bootstrapRole as any,
      onCreate: {
        service: "Lambda",
        action: "invoke",
        parameters: {
          FunctionName: deployFunction.functionName,
          Payload: '{}'
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
      onDelete: {
        service: "Lambda",
        action: "invoke",
        parameters: {
          FunctionName: destroyFunction.functionName,
          Payload: '{}'
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
    });
  }
}