#!/bin/bash
if kubectl get namespace/$NAMESPACE
then
    echo "### Uninstalling Radiant Logic ###"
    helm uninstall fid -n $NAMESPACE
    helm uninstall zookeeper -n $NAMESPACE
    kubectl delete namespace $NAMESPACE
    echo "### Radiant Logic uninstall complete ###"
else
    echo "### Namespace not found. Nothing to do ###"
fi