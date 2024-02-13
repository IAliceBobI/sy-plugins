#!/bin/env zsh

Set-Location $PSScriptRoot
$parentDir = (Get-Item $PSScriptRoot).Parent.FullName

Set-Location "$parentDir/sy-progressive-plugin"
Remove-Item -Recurse -Force `
    -ErrorAction SilentlyContinue `
    dev, dist, .eslintcache, package.zip, node_modules
pnpm i
pnpm update

Set-Location "$parentDir/sy-tomato-plugin"
Remove-Item -Recurse -Force `
    -ErrorAction SilentlyContinue `
    dev, dist, .eslintcache, package.zip, node_modules
pnpm i
pnpm update

