#!/usr/bin/env bash

BARGS=""
if [[ ! -z "$BUILD_ARGS" ]]; then
        args=$(echo $BUILD_ARGS | tr "|" "\n")
        for arg in $args
        do
                BARGS+="--build-arg $arg "
        done
fi

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $REGISTRY

docker build -t "$REGISTRY/$REPOSITORY:latest" -t "$REGISTRY/$REPOSITORY:$IMAGE_TAG" "$GITHUB_WORKSPACE/$BUILD_PATH" $BARGS
docker push "$REGISTRY/$REPOSITORY:latest"
docker push "$REGISTRY/$REPOSITORY:$IMAGE_TAG"

echo "Image $REGISTRY/$REPOSITORY published, tagged latest and $IMAGE_TAG"