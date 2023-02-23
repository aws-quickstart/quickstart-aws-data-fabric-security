#!/bin/bash
echo "Deploying Data Fabric Security Solution"
cdk deploy DataFabricStack --require-approval never --no-rollback
cdk deploy DataFabricStack/data-fabric-security-eks-cluster --require-approval never --no-rollback
echo "Data Fabric Security Solution deployment completed"