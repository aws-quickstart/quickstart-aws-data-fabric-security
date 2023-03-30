#!/bin/bash
if kubectl get namespace/$NAMESPACE
then
    echo "### Namespace found. Nothing to do ###"
else
    echo "### Namespace not found. Creating namespace ###"
    kubectl create namespace $NAMESPACE
    echo "### Configuring Helm ###"
    mkdir -p /tmp/.cache/helm
    export HELM_CACHE_HOME=/tmp/.cache/helm
    mkdir -p /tmp/.config/helm
    export HELM_CONFIG_HOME=/tmp/.config/helm
    echo "### Adding Radiant Logic repo to Helm ###"
    helm repo add radiantone https://radiantlogic-devops.github.io/helm
    helm repo update
    echo "### Installing Radiant Logic ###"
    helm install fid radiantone/fid -n $NAMESPACE --set fid.license=$LICENSE \
      --set fid.rootPassword=$ROOTPASS \
      --set image.repository="radiantone/fid-ubi8" \
      --set image.tag=$FID_IMAGE_TAG \
      --set podSecurityContext.runAsUser=1000 \
      --set persistence.enabled=true \
      --set persistence.storageClass="gp2" \
      --set dependencies.zookeeper.enabled=true \
      --set zookeeper.image.repository="radiantone/zookeeper-ubi8" \
      --set zookeeper.image.tag=$ZK_IMAGE_TAG \
      --set zookeeper.podSecurityContext.runAsUser=1000 \
      --set zookeeper.persisitence.enabled=true \
      --set zookeeper.persisitence.storageClass="gp2"
    kubectl apply -f radiant-logic-ingress.yaml -n $NAMESPACE
    kubectl patch service fid-ingress -n $NAMESPACE -p '{"metadata": {"annotations": {"external-dns.alpha.kubernetes.io/hostname": "'"$HOSTNAME"'"}}}'
    echo "### Radiant Logic installation completed ###"
fi