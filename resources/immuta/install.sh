#!/bin/bash
if kubectl get namespace/$NAMESPACE
then
    echo "### Namespace found. Nothing to do ###"
else
    echo "### Creating namespace ###"
    kubectl create namespace $NAMESPACE
    echo "### Setting kubectl secrets ###"
    kubectl create secret docker-registry immuta-registry --docker-server=https://registry.immuta.com --docker-username=$IMMUTA_USERNAME \
      --docker-password=$IMMUTA_PASSWORD --docker-email=support@immuta.com --namespace immuta
    echo "### Configuring Helm ###"
    mkdir -p /tmp/.cache/helm
    export HELM_CACHE_HOME=/tmp/.cache/helm
    mkdir -p /tmp/.config/helm
    export HELM_CONFIG_HOME=/tmp/.config/helm
    echo "### Adding Immuta repo to Helm ###"
    helm repo add immuta https://archives.immuta.com/charts --username $IMMUTA_USERNAME --password $IMMUTA_PASSWORD
    helm repo update
    echo "### Installing Immuta ###"
    helm install immuta immuta/immuta --version=$CHART_VERSION -n $NAMESPACE --values immuta-values.yaml \
      --set immutaVersion=$IMMUTA_VERSION \
      --set imageTag=$IMAGE_TAG \
      --set externalHostname=$HOSTNAME \
      --set database.password=$DB_PASSWORD \
      --set database.superuserPassword=$DB_SUPER_USER_PASSWORD \
      --set database.replicationPassword=$DB_REPLICATION_PASSWORD \
      --set database.patroniApiPassword=$DB_PATRONI_PASSWORD \
      --set queryEngine.password=$EQ_PASSWORD \
      --set queryEngine.superuserPassword=$EQ_SUPER_USER_PASSWORD \
      --set queryEngine.replicationPassword=$EQ_REPLICATION_PASSWORD \
      --set queryEngine.password=$EQ_PATRONI_PASSWORD
    kubectl patch service immuta-nginx-ingress -n $NAMESPACE -p '{"metadata": {"annotations": {"external-dns.alpha.kubernetes.io/hostname": "'"$HOSTNAME"'"}}}'
    echo "### Immuta Installation Completed ###"
fi