param([switch]$Elevated, [string]$s)

if ([string]::IsNullOrEmpty($s)) {
    Write-Error "need projShortName"
    exit 1
}

function Test-Admin {
    $currentUser = New-Object Security.Principal.WindowsPrincipal $([Security.Principal.WindowsIdentity]::GetCurrent())
    $currentUser.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

if ((Test-Admin) -eq $false)  {
    if ($elevated) {
        # tried to elevate, did not work, aborting
    } else {
        Start-Process powershell.exe -Verb RunAs -ArgumentList ('-noprofile -noexit -file "{0}" -elevated -s {1}' -f ($myinvocation.MyCommand.Definition, $s))
    }
    exit
}

$scriptPath = $MyInvocation.MyCommand.Path
$scriptDir = Split-Path -Parent $scriptPath

Set-Location -Path $scriptDir

$projDir = Join-Path $scriptDir "sy-${s}-plugin"
$projName = Split-Path -Leaf $projDir
$targetDir = Join-Path $env:SYPLUGINDIR $projName

write-host $targetDir
write-host $projDir

New-Item -ItemType Directory -Path "$projDir\dev" -ErrorAction SilentlyContinue

Remove-Item -Path $targetDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType SymbolicLink -Target "$projDir\dev" -Path $targetDir 

Set-Location -Path $projDir
pnpm run dev

