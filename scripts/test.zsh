#!/bin/env zsh

projDir=${0:a:h:h}
cd ${projDir}

rm -f tests/search.ts
ln ${projDir}/sy-tomato-plugin/src/libs/search.ts tests/search.ts
npx ts-node tests/test-search.ts
