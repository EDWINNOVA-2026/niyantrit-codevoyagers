param(
    [switch]$RunSmokeTest
)

$ErrorActionPreference = 'Stop'

function Write-Check {
    param(
        [string]$Name,
        [bool]$Passed,
        [string]$Detail
    )

    $status = if ($Passed) { 'PASS' } else { 'FAIL' }
    Write-Output ("[$status] $Name - $Detail")
}

$allPassed = $true

# Backend health
try {
    $health = Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 10
    $backendOk = $health.status -eq 'healthy'
    Write-Check -Name 'Backend health endpoint' -Passed $backendOk -Detail ("status=" + $health.status)
    if (-not $backendOk) { $allPassed = $false }
}
catch {
    Write-Check -Name 'Backend health endpoint' -Passed $false -Detail $_.Exception.Message
    $allPassed = $false
}

# Frontend health
$frontendCandidates = @(
    'http://127.0.0.1:3000/',
    'http://127.0.0.1:3001/'
)

$frontendOk = $false
$frontendDetail = 'No frontend server responded on ports 3000 or 3001.'

foreach ($candidateUrl in $frontendCandidates) {
    try {
        $frontend = Invoke-WebRequest -UseBasicParsing -Uri $candidateUrl -TimeoutSec 10
        if ($frontend.StatusCode -eq 200) {
            $frontendOk = $true
            $frontendDetail = "status_code=$($frontend.StatusCode), url=$candidateUrl"
            break
        }
    }
    catch {
        $frontendDetail = $_.Exception.Message
    }
}

Write-Check -Name 'Frontend dev server' -Passed $frontendOk -Detail $frontendDetail
if (-not $frontendOk) { $allPassed = $false }

if ($RunSmokeTest) {
    try {
        Write-Output '[INFO] Running smoke test script...'
        & "$PSScriptRoot\hackathon_smoke_test.ps1" | Out-String | Write-Output
        Write-Check -Name 'End-to-end smoke test' -Passed $true -Detail 'Completed'
    }
    catch {
        Write-Check -Name 'End-to-end smoke test' -Passed $false -Detail $_.Exception.Message
        $allPassed = $false
    }
}

if ($allPassed) {
    Write-Output '[PASS] Preflight completed successfully.'
    exit 0
}

Write-Output '[FAIL] Preflight found one or more issues.'
exit 1
