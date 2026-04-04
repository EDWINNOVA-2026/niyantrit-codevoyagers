# Niyantrit Phase 1 - Comprehensive Testing Script
# Tests all endpoints and features

Write-Host "==============================================="
Write-Host "NIYANTRIT PHASE 1 - USER TESTING SUITE"
Write-Host "===============================================`n"

$testResults = @()
$baseUrl = "http://localhost:8000"
$accessToken = ""

function Test-Endpoint {
    param([string]$name, [string]$method, [string]$uri, [string]$body, [string]$token)
    
    Write-Host "Testing: $name..." -ForegroundColor Cyan
    
    try {
        $headers = @{"Content-Type" = "application/json"}
        if ($token) { $headers["Authorization"] = "Bearer $token" }
        
        $params = @{
            Uri = "$baseUrl$uri"
            Method = $method
            UseBasicParsing = $true
            Headers = $headers
        }
        if ($body) { $params["Body"] = $body }
        
        $response = Invoke-WebRequest @params
        $content = $response.Content | ConvertFrom-Json
        
        Write-Host "✅ PASS - Status: $($response.StatusCode)" -ForegroundColor Green
        return @{
            name = $name
            status = "PASS"
            code = $response.StatusCode
            response = $content
        }
    } catch {
        Write-Host "❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
        return @{
            name = $name
            status = "FAIL"
            error = $_.Exception.Message
        }
    }
}

# ========== PART 1: HEALTH CHECK ==========
Write-Host "`n[PART 1] Health Check" -ForegroundColor Yellow
$healthTest = Test-Endpoint "Backend Health" "GET" "/" $null $null
$testResults += $healthTest

# ========== PART 2: AUTHENTICATION ==========
Write-Host "`n[PART 2] Authentication" -ForegroundColor Yellow

# Register Citizen
$registerBody = @{
    email = "citizen@test.com"
    password = "password123"
    full_name = "Test Citizen"
    role = "Citizen"
    phone = "+91-1234567890"
} | ConvertTo-Json

$regTest = Test-Endpoint "Register Citizen" "POST" "/auth/register" $registerBody $null
$testResults += $regTest

# Login
$loginBody = @{
    email = "citizen@test.com"
    password = "password123"
} | ConvertTo-Json

$loginTest = Test-Endpoint "Login User" "POST" "/auth/login" $loginBody $null
$testResults += $loginTest

if ($loginTest.status -eq "PASS") {
    $accessToken = $loginTest.response.access_token
    Write-Host "Token obtained: $($accessToken.Substring(0,20))..." -ForegroundColor Green
}

# Get Current User
$meTest = Test-Endpoint "Get Current User" "GET" "/auth/me" $null $accessToken
$testResults += $meTest

# ========== PART 3: PROJECTS ==========
Write-Host "`n[PART 3] Projects" -ForegroundColor Yellow

$projectsTest = Test-Endpoint "List Projects" "GET" "/projects" $null $accessToken
$testResults += $projectsTest

if ($projectsTest.status -eq "PASS" -and $projectsTest.response.Count -gt 0) {
    $projectId = $projectsTest.response[0].id
    Write-Host "Using Project ID: $projectId" -ForegroundColor Green
    
    $projectDetailTest = Test-Endpoint "Get Project Detail" "GET" "/projects/$projectId" $null $accessToken
    $testResults += $projectDetailTest
    
    $riskTest = Test-Endpoint "Get Risk Assessment" "GET" "/projects/$projectId/risk-assessment" $null $accessToken
    $testResults += $riskTest
}

# ========== PART 4: COMPLAINTS ==========
Write-Host "`n[PART 4] Complaints" -ForegroundColor Yellow

if ($projectId) {
    # Submit Text Complaint
    $complaintBody = @{
        project_id = $projectId
        description = "The labor workers are not being paid on time. This is happening for the past 3 weeks."
        severity = 8
    } | ConvertTo-Json

    $complaintTest = Test-Endpoint "Submit Text Complaint" "POST" "/complaints/submit-text" $complaintBody $accessToken
    $testResults += $complaintTest
    
    if ($complaintTest.status -eq "PASS") {
        $complaintId = $complaintTest.response.complaint_id
        Write-Host "Complaint ID: $complaintId" -ForegroundColor Green
    }
}

# Get Complaints List
$complaintsListTest = Test-Endpoint "Get Complaints List" "GET" "/complaints" $null $accessToken
$testResults += $complaintsListTest

# ========== PART 5: ADMIN ==========
Write-Host "`n[PART 5] Admin" -ForegroundColor Yellow

# Register Admin
$adminBody = @{
    email = "admin@test.com"
    password = "password123"
    full_name = "Admin User"
    role = "Admin"
    phone = "+91-9876543210"
} | ConvertTo-Json

$adminRegTest = Test-Endpoint "Register Admin" "POST" "/auth/register" $adminBody $null
$testResults += $adminRegTest

# Login as Admin
$adminLoginBody = @{
    email = "admin@test.com"
    password = "password123"
} | ConvertTo-Json

$adminLoginTest = Test-Endpoint "Admin Login" "POST" "/auth/login" $adminLoginBody $null
$testResults += $adminLoginTest

if ($adminLoginTest.status -eq "PASS") {
    $adminToken = $adminLoginTest.response.access_token
    
    # Get Dashboard Metrics
    $metricsTest = Test-Endpoint "Get Dashboard Metrics" "GET" "/dashboard/metrics" $null $adminToken
    $testResults += $metricsTest
}

# ========== FRONTEND TESTS ==========
Write-Host "`n[PART 6] Frontend" -ForegroundColor Yellow

try {
    $frontendResponse = Invoke-WebRequest "http://localhost:3000/login.html" -UseBasicParsing
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ PASS - Frontend accessible" -ForegroundColor Green
        $testResults += @{
            name = "Frontend Login Page"
            status = "PASS"
            code = 200
        }
    }
} catch {
    Write-Host "❌ FAIL - Frontend not accessible" -ForegroundColor Red
    $testResults += @{
        name = "Frontend Login Page"
        status = "FAIL"
        error = $_.Exception.Message
    }
}

try {
    $appResponse = Invoke-WebRequest "http://localhost:3000/app.html" -UseBasicParsing
    if ($appResponse.StatusCode -eq 200) {
        Write-Host "✅ PASS - App page accessible" -ForegroundColor Green
        $testResults += @{
            name = "Frontend App Page"
            status = "PASS"
            code = 200
        }
    }
} catch {
    Write-Host "❌ FAIL - App page not accessible" -ForegroundColor Red
    $testResults += @{
        name = "Frontend App Page"
        status = "FAIL"
        error = $_.Exception.Message
    }
}

# ========== SUMMARY ==========
Write-Host "`n==============================================="
Write-Host "TEST RESULTS SUMMARY"
Write-Host "===============================================`n"

$passed = ($testResults | Where-Object { $_.status -eq "PASS" }).Count
$failed = ($testResults | Where-Object { $_.status -eq "FAIL" }).Count
$total = $testResults.Count

Write-Host "Total Tests: $total"
Write-Host "Passed: $passed  $(if ($passed -eq $total) { '✅' } else { '⚠️' })"
Write-Host "Failed: $failed"
Write-Host ""

if ($failed -gt 0) {
    Write-Host "Failed Tests:" -ForegroundColor Red
    $testResults | Where-Object { $_.status -eq "FAIL" } | ForEach-Object {
        Write-Host "  - $($_.name): $($_.error)" -ForegroundColor Red
    }
}

Write-Host "`nDetailed Results:" -ForegroundColor Yellow
$testResults | Format-Table -Property @(
    @{Label="Test"; Expression={$_.name}},
    @{Label="Status"; Expression={$_.status}},
    @{Label="Code"; Expression={$_.code}},
    @{Label="Error"; Expression={$_.error}}
) -AutoSize

Write-Host "`n==============================================="
if ($passed -eq $total) {
    Write-Host "✅ ALL TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "⚠️ SOME TESTS FAILED - Check details above" -ForegroundColor Yellow
}
Write-Host "==============================================="

# Quick Links
Write-Host "`nQUICK LINKS:" -ForegroundColor Cyan
Write-Host "  Backend API Docs: http://localhost:8000/docs"
Write-Host "  Backend ReDoc:    http://localhost:8000/redoc"
Write-Host "  Frontend Login:   http://localhost:3000/login.html"
Write-Host "  Frontend App:     http://localhost:3000/app.html"
Write-Host ""
