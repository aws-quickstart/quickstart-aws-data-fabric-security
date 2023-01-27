#!/bin/bash
if kubectl get namespace/$NAMESPACE
then
    echo "### Uninstalling Immuta ###"
    helm uninstall immuta -n $NAMESPACE
    kubectl delete secrets immuta-registry -n $NAMESPACE
    kubectl delete namespace $NAMESPACE
    echo "### Immuta uninstall complete ###"
else
    echo "### Namespace not found. Nothing to do ###"
fi