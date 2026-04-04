$ErrorActionPreference = 'Stop'

$baseUrl = 'http://127.0.0.1:8000'
$nonce = Get-Random -Minimum 100000 -Maximum 999999
$password = 'Hackathon@123'

$contractorEmail = "hack.contractor.$nonce@test.com"
$officialEmail = "hack.official.$nonce@test.com"
$citizenEmail = "hack.citizen.$nonce@test.com"

function Register-User {
    param(
        [string]$Email,
        [string]$Role,
        [string]$FullName
    )

    $body = @{
        email = $Email
        password = $password
        full_name = $FullName
        role = $Role
    } | ConvertTo-Json

    Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/register" -ContentType 'application/json' -Body $body | Out-Null
}

function Login-User {
    param([string]$Email)

    $body = @{
        email = $Email
        password = $password
    } | ConvertTo-Json

    return Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login" -ContentType 'application/json' -Body $body
}

try {
    Register-User -Email $contractorEmail -Role 'Contractor' -FullName 'Hackathon Contractor'
    Register-User -Email $officialEmail -Role 'Official' -FullName 'Hackathon Official'
    Register-User -Email $citizenEmail -Role 'Citizen' -FullName 'Hackathon Citizen'

    $contractorLogin = Login-User -Email $contractorEmail
    $officialLogin = Login-User -Email $officialEmail
    $citizenLogin = Login-User -Email $citizenEmail

    $contractorHeaders = @{ Authorization = "Bearer $($contractorLogin.access_token)" }
    $officialHeaders = @{ Authorization = "Bearer $($officialLogin.access_token)" }
    $citizenHeaders = @{ Authorization = "Bearer $($citizenLogin.access_token)" }

    $projects = Invoke-RestMethod -Method Get -Uri "$baseUrl/projects?limit=1" -Headers $contractorHeaders
    if (-not $projects -or -not $projects[0].id) {
        throw 'No projects available for smoke test.'
    }

    $projectId = $projects[0].id

    $contractorComplaintBody = @{
        project_id = $projectId
        description = 'Contractor update for milestone progress'
        severity = 6
        milestone_name = 'Roadbed Preparation'
        work_summary = 'Completed excavation and compacted subgrade section A'
        next_action = 'Start base layer paving tomorrow'
        blockers = 'Awaiting final bitumen delivery'
        target_date = '2026-04-12'
        progress_update = 42
        material_cost = 185000
        labour_cost = 92000
        is_contractor_update = $true
    } | ConvertTo-Json

    $contractorComplaint = Invoke-RestMethod -Method Post -Uri "$baseUrl/complaints/submit-text" -Headers ($contractorHeaders + @{ 'Content-Type' = 'application/json' }) -Body $contractorComplaintBody

    $citizenComplaintBody = @{
        project_id = $projectId
        description = 'Worksite has unsafe barriers near school crossing'
        severity = 8
    } | ConvertTo-Json

    $citizenComplaint = Invoke-RestMethod -Method Post -Uri "$baseUrl/complaints/submit-text" -Headers ($citizenHeaders + @{ 'Content-Type' = 'application/json' }) -Body $citizenComplaintBody

    $contractorComplaintId = $contractorComplaint.complaint_id

    Invoke-RestMethod -Method Put -Uri "$baseUrl/complaints/$contractorComplaintId/resolve" -Headers ($officialHeaders + @{ 'Content-Type' = 'application/x-www-form-urlencoded' }) -Body 'resolution_notes=Verified contractor update and accepted for demo closure' | Out-Null

    $detail = Invoke-RestMethod -Method Get -Uri "$baseUrl/complaints/$contractorComplaintId" -Headers $contractorHeaders
    $list = Invoke-RestMethod -Method Get -Uri "$baseUrl/complaints?project_id=$projectId&limit=200" -Headers $contractorHeaders

    $roleBreakdown = @(
        $list |
            Group-Object created_by_role |
            ForEach-Object {
                [PSCustomObject]@{
                    role = $_.Name
                    count = $_.Count
                }
            }
    )

    $result = [ordered]@{
        test_nonce = $nonce
        project_id = $projectId
        contractor_complaint_id = $contractorComplaintId
        citizen_complaint_id = $citizenComplaint.complaint_id
        resolved_status = $detail.status
        resolved_created_by_role = $detail.created_by_role
        milestone_name = $detail.milestone_name
        progress_update = $detail.progress_update
        material_cost = $detail.material_cost
        labour_cost = $detail.labour_cost
        is_contractor_update = $detail.is_contractor_update
        role_breakdown = $roleBreakdown
    }

    $result | ConvertTo-Json -Depth 6
}
catch {
    Write-Error "Smoke test failed: $($_.Exception.Message)"
    exit 1
}
