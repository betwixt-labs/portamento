#!/bin/bash

node --experimental-sea-config sea-config.json
RUNTIME="./pack/runtime"
BLOB="./pack/sea-prep.blob"
cp "$(command -v node)" $RUNTIME
codesign --remove-signature $RUNTIME
yarn postject $RUNTIME NODE_SEA_BLOB $BLOB \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
    --macho-segment-name NODE_SEA

codesign --sign - $RUNTIME
