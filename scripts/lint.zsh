#!/bin/env zsh

dir=${0:a:h:h}
cd ${dir}

cd "${dir}/sy-progressive-plugin"
pnpm run lint

cd "${dir}/sy-tomato-plugin"
pnpm run lint

