param([string]$projShortName)

if ([string]::IsNullOrEmpty($projShortName)) {
    Write-Error "need projShortName"
    exit 1
}

$scriptPath = $MyInvocation.MyCommand.Path
$scriptDir = Split-Path -Parent $scriptPath
Set-Location -Path $scriptDir

pnpm lint
.\deploy.ps1 $projShortName

$projDir = Join-Path $scriptDir "sy-${projShortName}-plugin"
$projName = Split-Path -Leaf $projDir
$deployDir = "$scriptDir\deploy-repos\$projName"

# Versioning
$pluginJson = Get-Content -Raw -Path $projDir\plugin.json | ConvertFrom-Json
$currentVersion = $pluginJson.version
$major, $minor, $patch = $currentVersion -split '\.'
$patch = [int]$patch + 1
$newVersion = "$major.$minor.$patch"
$pluginsNewVersion = "${newVersion}-${projName}"
$pluginJson.version = $newVersion
$pluginJson | ConvertTo-Json -Depth 100 | Set-Content -Path $projDir\plugin.json

git add -A
git commit -m "auto"
git tag v${pluginsNewVersion}
git push origin v${pluginsNewVersion}
git push origin main
git push -f gitee v${pluginsNewVersion}
git push -f gitee main

Copy-Item -Path "${projDir}\.github" -Destination $deployDir -Recurse -Force
Copy-Item -Path "${projDir}\assets" -Destination $deployDir -Recurse -Force
Copy-Item -Path "${projDir}\*.md" -Destination $deployDir -Force
Copy-Item -Path "${projDir}\LICENSE" -Destination $deployDir -Force
Copy-Item -Path "${projDir}\*.png" -Destination $deployDir -Force
Copy-Item -Path "${projDir}\*.json" -Destination $deployDir -Force

Set-Location ${deployDir}
git add -A
git commit -m "auto"
git tag v${newVersion}
git push -f origin v${newVersion}
git push -f origin main

Set-Location ${projDir}
