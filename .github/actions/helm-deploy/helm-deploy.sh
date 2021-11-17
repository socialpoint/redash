#!/usr/bin/env bash
echo "setting kube config"

/bin/bash /config.sh

echo "Helm deploy chart with image $IMAGE_TAG"

helm dependency update $GITHUB_WORKSPACE/chart/geolocator/

helm diff --namespace $HELM_NAMESPACE \
      upgrade $HELM_RELEASE_NAME $GITHUB_WORKSPACE/chart/geolocator/ \
      --suppress-secrets \
      --allow-unreleased

helm --namespace $HELM_NAMESPACE \
      upgrade $HELM_RELEASE_NAME $GITHUB_WORKSPACE/chart/geolocator/ \
      --set image_tag=$IMAGE_TAG \
      --install \
      --wait \
      --timeout 2m0s \
      --debug \
      --atomic