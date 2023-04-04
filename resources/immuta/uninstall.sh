#!/bin/bash
if kubectl get namespace/$NAMESPACE
then
    echo "### Uninstalling Immuta ###"
    kubectl delete namespace $NAMESPACE
    echo "### Immuta uninstall complete ###"
else
    echo "### Namespace not found. Nothing to do ###"
fi