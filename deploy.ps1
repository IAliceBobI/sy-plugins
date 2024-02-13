param([string]$projShortName)

if ([string]::IsNullOrEmpty($projShortName)) {
    Write-Error "need projShortName"
    exit 1
}

$scriptPath = $MyInvocation.MyCommand.Path
$scriptDir = Split-Path -Parent $scriptPath
Set-Location $scriptDir

$projDir = Join-Path $scriptDir "sy-$projShortName-plugin"
$projName = Split-Path -Leaf $projDir
$targetDir = Join-Path $env:SYPLUGINDIR $projName

write-host $targetDir $projDir

Set-Location -Path $projDir
pnpm build

Remove-Item -Path $targetDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $targetDir | Out-Null
Copy-Item -Path "$projDir/dist/*" -Destination $targetDir -Recurse -Force
Set-Location $scriptDir
