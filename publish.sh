#!/bin/bash

BLUE='\033[0;34m'
YELLOW='\033[0;31m'
NC='\033[0m'

container_tag="cwm-shiz"
image_name=ghcr.io/unknowncrafts/$container_tag:latest

# ensure we're in the root folder
(
    cd $(git rev-parse --show-toplevel);

    docker build -t $image_name .

    echo -e "${BLUE}[INFO]${NC} Built container $image_name"

    docker push $image_name
)