#!/bin/bash
if [ -z "$1" ]
  then
    echo "No tag supplied"
    exit 1
fi
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 190396639075.dkr.ecr.eu-west-1.amazonaws.com
docker build -t walletsmith-server:$1 .
docker tag walletsmith-server:$1 190396639075.dkr.ecr.eu-west-1.amazonaws.com/walletsmith-server:$1
docker push 190396639075.dkr.ecr.eu-west-1.amazonaws.com/walletsmith-server:$1