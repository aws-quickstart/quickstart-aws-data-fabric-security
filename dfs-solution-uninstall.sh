echo "Uninstalling Data Fabric Security Solution"
cdk destroy DataFabricStack/data-fabric-security-eks-cluster --force
cdk destroy DataFabricStack --force
echo "Cleaning up packages"
rm resources/immuta/install.zip resources/immuta/uninstall.zip resources/radiantlogic/install.zip resources/radiantlogic/uninstall.zip
echo "Uninstall completed"