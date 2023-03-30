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