#!/bin/sh

TAG=`git describe --tags --abbrev=0`
RELEASE_ERROR=$(exec docker/can_release.sh)

if [ -n "$RELEASE_ERROR" ]; then
    echo $RELEASE_ERROR
    exit 1
else
    docker build -t 788139694487.dkr.ecr.eu-west-1.amazonaws.com/status-service:$TAG .
    docker push 788139694487.dkr.ecr.eu-west-1.amazonaws.com/status-service:$TAG
fi

