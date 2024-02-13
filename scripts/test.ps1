#!/bin/env zsh


projDir=${0:a:h:h}
cd ${projDir}

for file in ./tests/test-*.ts; do
    target=$(echo ${file} | sed -n 's/.*-\(.*\)\.ts/\1/p').ts
    rm -f tests/${target}
    ln ${projDir}/sy-tomato-plugin/src/libs/${target} tests/${target}
    echo npx ts-node tests/test-${target}
    npx ts-node tests/test-${target}
done

