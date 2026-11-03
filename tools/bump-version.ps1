<#
.SYNOPSIS
    Bump the plugin version, seed a CHANGELOG entry, commit and push.

.DESCRIPTION
    Updates <VersionPrefix> / <VersionSuffix> in RatingSync.csproj, inserts a
    "## [x.y.z]" section at the top of CHANGELOG.md when one is missing, then
    commits and pushes to main. Pushing the csproj change makes the Release
    workflow build the DLL and publish it as a GitHub Release tagged vX.Y.Z.

.EXAMPLE
    ./tools/bump-version.ps1 1.3.0

.EXAMPLE
    ./tools/bump-version.ps1 1.3.0-beta.1 -NoPush
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Version,

    # Commit locally but do not push (the release workflow will not run).
    [switch]$NoPush
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
try {
    if ($Version -notmatch '^(?<prefix>\d+\.\d+\.\d+)(?:-(?<suffix>[0-9A-Za-z.-]+))?$') {
        throw "Version must look like 1.2.3 or 1.2.3-beta.1 (got '$Version')"
    }
    $prefix = $Matches['prefix']
    $suffix = $Matches['suffix']
    if ($null -eq $suffix) { $suffix = '' }
    $tag = "v$Version"

    # 1. csproj
    $csprojPath = Join-Path $repoRoot 'RatingSync.csproj'
    $csproj = Get-Content $csprojPath -Raw
    $updated = $csproj -replace '<VersionPrefix>[^<]*</VersionPrefix>', "<VersionPrefix>$prefix</VersionPrefix>"
    $updated = $updated -replace '<VersionSuffix>[^<]*</VersionSuffix>', "<VersionSuffix>$suffix</VersionSuffix>"
    if ($updated -eq $csproj) { throw "No <VersionPrefix> found in RatingSync.csproj" }
    Set-Content -Path $csprojPath -Value $updated -NoNewline -Encoding utf8

    # 2. CHANGELOG
    $changelogPath = Join-Path $repoRoot 'CHANGELOG.md'
    $changelog = if (Test-Path $changelogPath) { Get-Content $changelogPath -Raw } else { "# Changelog`n" }
    if ($changelog -notmatch "(?m)^##\s+\[$([regex]::Escape($Version))\]") {
        $section = "## [$Version]`n`n- Describe this release before tagging.`n`n"
        Set-Content -Path $changelogPath -Value ($section + $changelog) -NoNewline -Encoding utf8
        Write-Host "CHANGELOG.md: added section for $Version (edit it before pushing)." -ForegroundColor Yellow
    }

    # 3. commit
    git add RatingSync.csproj CHANGELOG.md
    git commit -m "chore: release $tag"

    if ($NoPush) {
        Write-Host "Committed locally. Push to main to trigger the release workflow." -ForegroundColor Yellow
    } else {
        git push origin HEAD
        Write-Host "Pushed. The Release workflow will build and publish $tag." -ForegroundColor Green
    }
}
finally {
    Pop-Location
}
