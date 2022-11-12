import { NestedStack, RemovalPolicy } from "aws-cdk-lib";
import { ISubnet, IVpc, Subnet, Vpc } from "aws-cdk-lib/aws-ec2";
import { IPrivateHostedZone, PrivateHostedZone } from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";
import { LogGroup } from "aws-cdk-lib/aws-logs";

import * as ec2 from 'aws-cdk-lib/aws-ec2';

import { DataFabricCoreStackProps } from "./props/stack-props";

const commonName = "data-fabric";
const coreId = (id: string) => `${commonName}-${id}`;

export class DataFabricCoreStack extends NestedStack {
  public readonly vpc: IVpc;
  public readonly subnets: ISubnet[]=[];
  public readonly privateZone: IPrivateHostedZone;

  constructor(scope: Construct, id: string, props: DataFabricCoreStackProps) {
    super(scope, id, props);
    
    // Create VPC 
    if(props.vpc.vpcId == "" && !props.vpc.vpcId) {
      const cwLogs = new LogGroup(this, 'Log', {
        logGroupName: `/aws/${commonName}-vpc/flowlogs`,
        removalPolicy: RemovalPolicy.DESTROY,
      });

      this.vpc = new Vpc(this, coreId('vpc'), {
        vpcName: coreId('vpc'), 
        maxAzs: props.vpc.maxAZs,
        flowLogs: {
          's3': {
            destination: ec2.FlowLogDestination.toCloudWatchLogs(cwLogs),
            trafficType:ec2.FlowLogTrafficType.ALL,
          },
        }
      });

      this.subnets = this.vpc.privateSubnets;
    } else {
      this.vpc = Vpc.fromLookup(this, coreId('import-vpc'), {
        vpcId: props.vpc.vpcId,
        isDefault: false,
      });
      for (let i in this.vpc.privateSubnets) {
        this.subnets.push(Subnet.fromSubnetId(this,`subnet${i}` , props.vpc.subnetIds[i]))
      }
    }

    // Create Route 53 private hosted zone
    this.privateZone = new PrivateHostedZone(this, coreId('hosted-zone'), {
      zoneName: props.domain,
      vpc: this.vpc
    });
  }
}
