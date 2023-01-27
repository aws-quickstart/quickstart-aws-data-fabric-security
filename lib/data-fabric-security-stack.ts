import { NestedStack, RemovalPolicy } from "aws-cdk-lib";
import { ISubnet, IVpc, Subnet, Vpc } from "aws-cdk-lib/aws-ec2";
import { IPrivateHostedZone, PrivateHostedZone } from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";
import { LogGroup } from "aws-cdk-lib/aws-logs";

import * as ec2 from 'aws-cdk-lib/aws-ec2';

import { DataFabricSecurityStackProps } from "./props/stack-props";

export class DataFabricSecurityStack extends NestedStack {
  private readonly coreId: any;
  private readonly commonName: string;

  public readonly vpc: IVpc;
  public readonly subnets: ISubnet[]=[];
  public readonly privateZone: IPrivateHostedZone;

  constructor(scope: Construct, id: string, props: DataFabricSecurityStackProps) {
    super(scope, id, props);

    this.coreId = (id: string) => `${props.prefix}-${id}`;
    this.commonName = props.prefix;
    
    // Create VPC 
    if(props.vpc.vpcId == "" && !props.vpc.vpcId) {
      const cwLogs = new LogGroup(this, 'Log', {
        logGroupName: `/aws/${this.commonName}-vpc/flowlogs`,
        removalPolicy: RemovalPolicy.DESTROY,
      });

      this.vpc = new Vpc(this, this.coreId('vpc'), {
        vpcName: this.coreId('vpc'), 
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
      this.vpc = Vpc.fromLookup(this, this.coreId('import-vpc'), {
        vpcId: props.vpc.vpcId,
        isDefault: false,
      });
      for (let i in this.vpc.privateSubnets) {
        this.subnets.push(Subnet.fromSubnetId(this,`subnet${i}` , props.vpc.subnetIds[i]))
      }
    }

    // Create Route 53 private hosted zone
    this.privateZone = new PrivateHostedZone(this, this.coreId('hosted-zone'), {
      zoneName: props.domain,
      vpc: this.vpc
    });
  }
}
