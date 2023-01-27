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
    echo "### Installing Radiant Logic ###"
    helm install zookeeper radiantone/zookeeper --version 0.1.1 -n $NAMESPACE --wait --timeout 3m
    kubectl wait pods -n $NAMESPACE -l statefulset.kubernetes.io/pod-name=zookeeper-0 --for condition=Ready --timeout=120s
    kubectl wait pods -n $NAMESPACE -l statefulset.kubernetes.io/pod-name=zookeeper-1 --for condition=Ready --timeout=120s
    kubectl wait pods -n $NAMESPACE -l statefulset.kubernetes.io/pod-name=zookeeper-2 --for condition=Ready --timeout=120s
    helm install fid radiantone/fid --version 0.1.3 -n $NAMESPACE --set fid.license=$LICENSE --set fid.rootPassword=$ROOTPASS --set image.tag="7.4.2"
    kubectl apply -f radiant-logic-ingress.yaml -n $NAMESPACE
    kubectl patch service fid-ingress -n $NAMESPACE -p '{"metadata": {"annotations": {"external-dns.alpha.kubernetes.io/hostname": "'"$HOSTNAME"'"}}}'
    echo "### Radiant Logic installation completed ###"
fi