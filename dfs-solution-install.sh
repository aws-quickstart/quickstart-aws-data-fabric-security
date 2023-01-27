#!/bin/bash
echo "Staging files for deployment"
cp resources/lambda/main.py resources/immuta/main.py
cp resources/lambda/main.py resources/radiantlogic/main.py
cd resources/immuta/
zip install.zip main.py immuta-values.yaml install.sh
zip uninstall.zip main.py uninstall.sh
rm main.py
cd ../radiantlogic
zip install.zip main.py radiant-logic-ingress.yaml install.sh
zip uninstall.zip main.py uninstall.sh
rm main.py
cd ../..
echo "Deploying Data Fabric Security Solution"
cdk deploy DataFabricStack --require-approval never --no-rollback
cdk deploy DataFabricStack/data-fabric-security-eks-cluster --require-approval never --no-rollback
echo "Cleaning up packages"
rm resources/immuta/install.zip resources/immuta/uninstall.zip resources/radiantlogic/install.zip resources/radiantlogic/uninstall.zip
echo "Data Fabric Security Solution deployment completed"