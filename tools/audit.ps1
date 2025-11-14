# PowerShell version of audit script for Windows
# Baseline repository audit script for Food Reservation System

param(
    [switch]$SkipTests,
    [switch]$Quick
)

# Create logs directory
New-Item -ItemType Directory -Force -Path "logs" | Out-Null

# Generate timestamp
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportFile = "logs/audit-$timestamp.txt"

# Initialize report
$report = @"
========================================
  Food Reservation System Audit Report
  Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
========================================

"@

function Write-Section {
    param($title)
    $section = @"

========================================
  $title
========================================

"@
    $script:report += $section
    Write-Host $section -ForegroundColor Cyan
}

function Write-Status {
    param($success, $message)
    if ($success) {
        $status = "✓ $message"
        Write-Host $status -ForegroundColor Green
    } else {
        $status = "✗ $message"
        Write-Host $status -ForegroundColor Red
        $script:issuesFound++
    }
    $script:report += "$status`n"
}

$issuesFound = 0

# ==================== FRONTEND AUDIT ====================
Write-Section "FRONTEND AUDIT (React)"

Push-Location frontend

if (Test-Path "package.json") {
    # ESLint
    Write-Host "Running ESLint..." -ForegroundColor Yellow
    $lintResult = npm run lint 2>&1 | Out-File -FilePath "..\logs\eslint-frontend.log" -Encoding utf8
    if ($LASTEXITCODE -eq 0) {
        Write-Status $true "ESLint passed"
    } else {
        Write-Status $false "ESLint found issues (see logs/eslint-frontend.log)"
        $script:report += "--- ESLint Output ---`n"
        $script:report += Get-Content "..\logs\eslint-frontend.log" -Tail 50 | Out-String
    }

    # Tests
    if (-not $SkipTests) {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        if ($packageJson.scripts.test) {
            Write-Host "Running frontend tests..." -ForegroundColor Yellow
            npm run test -- --watchAll=false --passWithNoTests 2>&1 | Out-File -FilePath "..\logs\test-frontend.log" -Encoding utf8
            if ($LASTEXITCODE -eq 0) {
                Write-Status $true "Frontend tests passed"
            } else {
                Write-Status $false "Frontend tests failed"
            }
        }
    }
} else {
    $script:report += "ERROR: frontend/package.json not found`n"
    $issuesFound++
}

Pop-Location

# ==================== BACKEND AUDIT ====================
Write-Section "BACKEND AUDIT (Node.js/Express)"

Push-Location backend

if (Test-Path "package.json") {
    # ESLint
    Write-Host "Running ESLint..." -ForegroundColor Yellow
    npm run lint 2>&1 | Out-File -FilePath "..\logs\eslint-backend.log" -Encoding utf8
    if ($LASTEXITCODE -eq 0) {
        Write-Status $true "ESLint passed"
    } else {
        Write-Status $false "ESLint found issues (see logs/eslint-backend.log)"
        $script:report += "--- ESLint Output ---`n"
        $script:report += Get-Content "..\logs\eslint-backend.log" -Tail 50 | Out-String
    }

    # Tests
    if (-not $SkipTests) {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        if ($packageJson.scripts.test) {
            Write-Host "Running backend tests..." -ForegroundColor Yellow
            npm run test 2>&1 | Out-File -FilePath "..\logs\test-backend.log" -Encoding utf8
            if ($LASTEXITCODE -eq 0) {
                Write-Status $true "Backend tests passed"
            } else {
                Write-Status $false "Backend tests failed"
            }
        }
    }
}

Pop-Location

# ==================== SECURITY AUDIT ====================
Write-Section "SECURITY AUDIT"

# NPM Audit
Write-Host "Running npm audit..." -ForegroundColor Yellow

Push-Location frontend
npm audit --json 2>&1 | Out-File -FilePath "..\logs\npm-audit-frontend.json" -Encoding utf8
$script:report += "Frontend vulnerabilities: $(Get-Content '..\logs\npm-audit-frontend.json' | Select-String 'vulnerabilities')`n"
Pop-Location

Push-Location backend
npm audit --json 2>&1 | Out-File -FilePath "..\logs\npm-audit-backend.json" -Encoding utf8
$script:report += "Backend vulnerabilities: $(Get-Content '..\logs\npm-audit-backend.json' | Select-String 'vulnerabilities')`n"
Pop-Location

# Secret Scanner
Write-Host "Scanning for secrets..." -ForegroundColor Yellow
if (Test-Path "scripts\find-secrets.js") {
    $secretScan = node scripts\find-secrets.js 2>&1 | Out-String
    $script:report += $secretScan
    Write-Host $secretScan
} else {
    $script:report += "⚠ scripts/find-secrets.js not found`n"
}

# ==================== CODE QUALITY ====================
if (-not $Quick) {
    Write-Section "CODE QUALITY CHECKS"

    # TODO comments
    Write-Host "Scanning for TODO comments..." -ForegroundColor Yellow
    $todos = Get-ChildItem -Path frontend\src,backend\src -Recurse -Include *.js,*.jsx,*.ts,*.tsx -ErrorAction SilentlyContinue |
        Select-String -Pattern "TODO|FIXME|HACK|XXX" |
        Measure-Object |
        Select-Object -ExpandProperty Count
    
    $script:report += "Found $todos TODO/FIXME/HACK/XXX comments`n"
    Write-Host "Found $todos TODO/FIXME/HACK/XXX comments" -ForegroundColor Yellow

    # Console.log
    $consoleLogs = Get-ChildItem -Path frontend\src,backend\src -Recurse -Include *.js,*.jsx,*.ts,*.tsx -ErrorAction SilentlyContinue |
        Select-String -Pattern "console\.log" |
        Measure-Object |
        Select-Object -ExpandProperty Count
    
    $script:report += "Found $consoleLogs console.log statements`n"
    if ($consoleLogs -gt 20) {
        $script:report += "⚠ Consider using proper logging instead of console.log`n"
    }

    # Large files
    Write-Host "Checking for large files..." -ForegroundColor Yellow
    Get-ChildItem -Path frontend\src,backend\src -Recurse -Include *.js,*.jsx,*.ts,*.tsx -ErrorAction SilentlyContinue |
        Where-Object { (Get-Content $_.FullName | Measure-Object -Line).Lines -gt 500 } |
        ForEach-Object {
            $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines
            $script:report += "⚠ Large file: $($_.FullName) ($lines lines)`n"
        }
}

# ==================== SUMMARY ====================
Write-Section "AUDIT SUMMARY"

$script:report += "Report saved to: $reportFile`n"
$script:report += "Detailed logs available in: logs/`n`n"

if ($issuesFound -eq 0) {
    $summary = "✓ No critical issues found!"
    Write-Host $summary -ForegroundColor Green
    $script:report += $summary
} else {
    $summary = "✗ Found $issuesFound issue(s) requiring attention"
    Write-Host $summary -ForegroundColor Red
    $script:report += "$summary`n`n"
    $script:report += "Review the logs and fix issues before production deployment.`n"
}

# Save report
$script:report | Out-File -FilePath $reportFile -Encoding utf8

Write-Host "`nFull report saved to: $reportFile" -ForegroundColor Cyan

if ($issuesFound -gt 0) {
    exit 1
}
