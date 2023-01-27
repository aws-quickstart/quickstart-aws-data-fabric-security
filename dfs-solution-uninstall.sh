echo "Uninstalling Data Fabric Security Solution"
cdk destroy DataFabricStack/data-fabric-security-eks-cluster --require-approval never 
cdk destroy DataFabricStack --require-approval never 
echo "Uninstall completed"