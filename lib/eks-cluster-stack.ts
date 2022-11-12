import { NestedStack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Role, IRole, ManagedPolicy, Policy } from "aws-cdk-lib/aws-iam";
import { Cluster } from 'aws-cdk-lib/aws-eks';

import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

import { EKSClusterStackProps } from './props/stack-props';
import { CdkNagSuppressions } from './core/utilities/cdk-nag-suppressions';
import { Config } from './core/config';

const privateAccess = "private";
const publicAccess = "public";

const clusterId = (id: string) => `data-fabric-cluster-${id}`;

export class EKSClusterStack extends NestedStack {
  public readonly cluster: Cluster;
  public readonly clusterMasterRole: IRole;

  private readonly workerNodesRole: IRole;
  private readonly eksPolicy: Policy;

  constructor(scope: Construct, id: string, props: EKSClusterStackProps) {
    super(scope, id, props);

    let access;

    if (props.eksEndpointAccess.toLowerCase() == privateAccess) {
      access = eks.EndpointAccess.PRIVATE;
    } else if (props.eksEndpointAccess.toLowerCase() == publicAccess) {
      access = eks.EndpointAccess.PUBLIC;
    } else {
      access = eks.EndpointAccess.PUBLIC_AND_PRIVATE;
    }

    this.cluster = new eks.Cluster(this, clusterId('eks'), {
      clusterName: clusterId('eks'),
      version: eks.KubernetesVersion.of('1.23'),
      defaultCapacity: 0,
      defaultCapacityInstance: new ec2.InstanceType(props.instanceType),
      vpc: props.vpc,
      vpcSubnets:[{subnets: props.subnets}],
      clusterLogging: [
        eks.ClusterLoggingTypes.API,
        eks.ClusterLoggingTypes.CONTROLLER_MANAGER,
        eks.ClusterLoggingTypes.AUTHENTICATOR,
        eks.ClusterLoggingTypes.SCHEDULER,
        eks.ClusterLoggingTypes.AUDIT,
      ],
      endpointAccess: access
    });
      
    this.clusterMasterRole = Role.fromRoleArn(this, clusterId('EKSMasterRole'),props.masterRoleArn ,{mutable:false});
    this.cluster.awsAuth.addMastersRole(this.clusterMasterRole);

    const workerNodesPolicy = this.createWorkerNodePolicy(props.hostedZoneId);

    // Create role for EKS worker nodes
    this.workerNodesRole = new iam.Role(this, clusterId('EKSWorkerNodesRole'), {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'EKS Worker Node Role',
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("AmazonEKS_CNI_Policy"),
        ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly"),
        ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSWorkerNodePolicy"),
      ],
      inlinePolicies: {
        workerNodesPolicy
      }
    });

    // Add WorkerNodes group to cluster
    this.cluster.addNodegroupCapacity(clusterId('worker-nodes'),{
      desiredSize: Config.Current.EKS.ClusterSize,
      subnets: {subnets: props.subnets},
      instanceTypes: [new ec2.InstanceType(Config.Current.EKS.InstanceType)],
      nodeRole: this.workerNodesRole
    });

    // Get the Masters Role
    this.clusterMasterRole = this.cluster.node.tryFindChild('MastersRole') as Role;

    this.eksPolicy = this.createEksPolicy();

    // Attach policy to Master Role
    this.clusterMasterRole.attachInlinePolicy(this.eksPolicy);

    this.createCdkNagSuppressions();
  }

  private createWorkerNodePolicy(hostedZoneId: string) {
    return new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: ["sts:AssumeRole"],
          resources: ["*"], 
        }),
        new iam.PolicyStatement({
          actions: [
            "ec2:DescribeInstances",
            "ec2:DescribeVpcs",
            "ec2:DescribeVolumes",
            "ec2:DescribeVolumesModifications",
            "ec2:DescribeInstanceTypes",
            "ec2:DescribeSubnets",
            "ec2:DescribeRouteTables",
            "ec2:DescribeSecurityGroups"
          ],
          resources: [
            `*`,
          ],
        }),
        new iam.PolicyStatement({
          actions: [
            "ecr:GetAuthorizationToken",
            "ecr:BatchCheckLayerAvailability",
            "ecr:GetDownloadUrlForLayer",
            "ecr:GetRepositoryPolicy",
            "ecr:DescribeRepositories",
            "ecr:ListImages",
            "ecr:DescribeImages",
            "ecr:BatchGetImage",
            "ecr:GetLifecyclePolicy",
            "ecr:GetLifecyclePolicyPreview",
            "ecr:ListTagsForResource",
            "ecr:DescribeImageScanFindings"
          ],
          resources: [
            `*`,
          ],
        }),
        new iam.PolicyStatement({
          actions: [
            "eks:DescribeCluster"
          ],
          resources: [
            `arn:${this.partition}:eks:${this.region}:${this.account}:cluster/${this.cluster.clusterName}`,
          ],
        }),
        new iam.PolicyStatement({
          actions: [
            "route53:*"
          ],
          resources: [
            `arn:${this.partition}:route53:::hostedzone/${hostedZoneId}`,
          ],
        }),
      ]
    });
  }

  private createEksPolicy() {
    return new iam.Policy(this, clusterId('eks-policy'), {
      statements: [
        new iam.PolicyStatement({
          actions: ["eks:DescribeCluster"],
          resources: [
            `arn:${this.partition}:eks:${this.region}:${this.account}:cluster/${this.cluster.clusterName}`,
          ],
        }),
        new iam.PolicyStatement({
          actions: [
            "route53:*",
            "route53domains:*",
          ],
          resources: [
            `arn:${this.partition}:route53:::hostedzone/*`,
          ],
        }),
        new iam.PolicyStatement({
          actions: [
            "sts:AssumeRole", 
            "route53:ListHostedZones"
          ],
          resources: ["*"], 
        }),
      ],
    });
  }

  private createCdkNagSuppressions() {
    CdkNagSuppressions.createResourceCdkNagSuppressions(
      this.cluster, 
      'AwsSolutions-IAM4', 
      'Only suppressing required EKS AWS Managed Policies', 
    );
  
    CdkNagSuppressions.createResourceCdkNagSuppressions(
      this.cluster, 
      'AwsSolutions-EKS1', 
      'Suppressing as Kubernetes API server endpoint is set by configuration', 
    );
  
    CdkNagSuppressions.createResourceCdkNagSuppressions(
      this.cluster, 
      'AwsSolutions-IAM5', 
      'Suppressing IAM wildcards defined by default when deploying EKS', 
    );
  
    CdkNagSuppressions.createResourceCdkNagSuppressions(
      this.eksPolicy, 
      'AwsSolutions-IAM5', 
      'Only suppressing IAM wildcards for Route 53 actions and resources', 
    );
  
    CdkNagSuppressions.createResourceCdkNagSuppressions(
      this.workerNodesRole, 
      'AwsSolutions-IAM4', 
      'Only suppressing required EKS AWS Managed Policies', 
    );
  
    CdkNagSuppressions.createResourceCdkNagSuppressions(
      this.workerNodesRole, 
      'AwsSolutions-IAM5', 
      'Only suppressing read-only IAM actions to EKS cluster and Route 53 actions', 
    );
  }
}
  
  