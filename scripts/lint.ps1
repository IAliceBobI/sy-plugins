Set-Location $PSScriptRoot
$parentDir = (Get-Item $PSScriptRoot).Parent.FullName

Set-Location "$parentDir/sy-progressive-plugin"
pnpm run lint

Set-Location "$parentDir/sy-tomato-plugin"
pnpm run lint

