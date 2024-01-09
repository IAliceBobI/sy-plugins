#!/bin/env zsh

dir=${0:a:h:h}
cd ${dir}

cd "${dir}/sy-progressive-plugin"
rm -rf dev dist .eslintcache package.zip node_modules
pnpm i
pnpm update

cd "${dir}/sy-tomato-plugin"
rm -rf dev dist .eslintcache package.zip node_modules
pnpm i
pnpm update

