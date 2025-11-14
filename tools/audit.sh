#!/bin/bash
# Baseline repository audit script
# Runs linting, tests, security checks, and generates audit report

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create logs directory if it doesn't exist
mkdir -p logs

# Generate timestamp for report
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
REPORT_FILE="logs/audit-${TIMESTAMP}.txt"

echo "========================================" | tee "$REPORT_FILE"
echo "  Food Reservation System Audit Report" | tee -a "$REPORT_FILE"
echo "  Generated: $(date)" | tee -a "$REPORT_FILE"
echo "========================================" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

# Function to print section header
print_section() {
    echo "" | tee -a "$REPORT_FILE"
    echo "========================================" | tee -a "$REPORT_FILE"
    echo "  $1" | tee -a "$REPORT_FILE"
    echo "========================================" | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"
}

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}" | tee -a "$REPORT_FILE"
    else
        echo -e "${RED}✗ $2${NC}" | tee -a "$REPORT_FILE"
    fi
}

# Track overall status
ISSUES_FOUND=0

# ==================== FRONTEND AUDIT ====================
print_section "FRONTEND AUDIT (React)"

cd frontend

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "ERROR: frontend/package.json not found" | tee -a "../$REPORT_FILE"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    cd ..
    exit 1
fi

# ESLint check
echo "Running ESLint..." | tee -a "../$REPORT_FILE"
if npm run lint > ../logs/eslint-frontend.log 2>&1; then
    print_status 0 "ESLint passed"
else
    print_status 1 "ESLint found issues (see logs/eslint-frontend.log)"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    # Append ESLint output to report
    echo "--- ESLint Output (Frontend) ---" >> "../$REPORT_FILE"
    tail -50 ../logs/eslint-frontend.log >> "../$REPORT_FILE"
fi

# Check for unit tests
if grep -q '"test:unit"' package.json 2>/dev/null || grep -q '"test"' package.json 2>/dev/null; then
    echo "Running frontend tests..." | tee -a "../$REPORT_FILE"
    if npm run test -- --watchAll=false --passWithNoTests > ../logs/test-frontend.log 2>&1; then
        print_status 0 "Frontend tests passed"
    else
        print_status 1 "Frontend tests failed (see logs/test-frontend.log)"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
else
    echo "⚠ No test script found in frontend package.json" | tee -a "../$REPORT_FILE"
fi

# Check for Playwright
if [ -f "playwright.config.js" ] || [ -f "playwright.config.ts" ]; then
    echo "Listing Playwright tests..." | tee -a "../$REPORT_FILE"
    if npx playwright test --list 2>&1 | tee -a "../$REPORT_FILE"; then
        print_status 0 "Playwright configured"
    else
        print_status 1 "Playwright configuration issue"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
else
    echo "ℹ Playwright not configured" | tee -a "../$REPORT_FILE"
fi

# Check for unused dependencies
echo "Checking for unused dependencies..." | tee -a "../$REPORT_FILE"
if command -v depcheck &> /dev/null; then
    depcheck --json > ../logs/depcheck-frontend.json 2>&1
    UNUSED=$(cat ../logs/depcheck-frontend.json | grep -o '"dependencies":\[.*\]' | grep -o '\[.*\]' || echo "[]")
    if [ "$UNUSED" != "[]" ]; then
        echo "⚠ Unused dependencies found (see logs/depcheck-frontend.json)" | tee -a "../$REPORT_FILE"
    else
        echo "✓ No unused dependencies" | tee -a "../$REPORT_FILE"
    fi
else
    echo "ℹ depcheck not installed (npm i -g depcheck to enable)" | tee -a "../$REPORT_FILE"
fi

cd ..

# ==================== BACKEND AUDIT ====================
print_section "BACKEND AUDIT (Node.js/Express)"

cd backend

# ESLint check
echo "Running ESLint..." | tee -a "../$REPORT_FILE"
if npm run lint > ../logs/eslint-backend.log 2>&1; then
    print_status 0 "ESLint passed"
else
    print_status 1 "ESLint found issues (see logs/eslint-backend.log)"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    echo "--- ESLint Output (Backend) ---" >> "../$REPORT_FILE"
    tail -50 ../logs/eslint-backend.log >> "../$REPORT_FILE"
fi

# Check for unit tests
if grep -q '"test:unit"' package.json 2>/dev/null || grep -q '"test"' package.json 2>/dev/null; then
    echo "Running backend tests..." | tee -a "../$REPORT_FILE"
    if npm run test 2>&1 | tee ../logs/test-backend.log; then
        print_status 0 "Backend tests passed"
    else
        print_status 1 "Backend tests failed (see logs/test-backend.log)"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
else
    echo "⚠ No test script found in backend package.json" | tee -a "../$REPORT_FILE"
fi

cd ..

# ==================== SECURITY AUDIT ====================
print_section "SECURITY AUDIT"

# Run npm audit on both projects
echo "Running npm audit (frontend)..." | tee -a "$REPORT_FILE"
cd frontend
npm audit --json > ../logs/npm-audit-frontend.json 2>&1 || true
VULNERABILITIES=$(cat ../logs/npm-audit-frontend.json | grep -o '"vulnerabilities":{[^}]*}' || echo '{}')
echo "$VULNERABILITIES" | tee -a "../$REPORT_FILE"
cd ..

echo "Running npm audit (backend)..." | tee -a "$REPORT_FILE"
cd backend
npm audit --json > ../logs/npm-audit-backend.json 2>&1 || true
VULNERABILITIES=$(cat ../logs/npm-audit-backend.json | grep -o '"vulnerabilities":{[^}]*}' || echo '{}')
echo "$VULNERABILITIES" | tee -a "../$REPORT_FILE"
cd ..

# Check for Snyk
if command -v snyk &> /dev/null; then
    echo "Running Snyk security scan..." | tee -a "$REPORT_FILE"
    cd frontend
    if snyk test --json > ../logs/snyk-frontend.json 2>&1; then
        print_status 0 "Snyk frontend: no vulnerabilities"
    else
        print_status 1 "Snyk found vulnerabilities in frontend (see logs/snyk-frontend.json)"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
    cd ../backend
    if snyk test --json > ../logs/snyk-backend.json 2>&1; then
        print_status 0 "Snyk backend: no vulnerabilities"
    else
        print_status 1 "Snyk found vulnerabilities in backend (see logs/snyk-backend.json)"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
    cd ..
else
    echo "ℹ Snyk not installed (npm i -g snyk to enable)" | tee -a "$REPORT_FILE"
fi

# Run secret scanner
echo "Scanning for exposed secrets..." | tee -a "$REPORT_FILE"
if [ -f "scripts/find-secrets.js" ]; then
    node scripts/find-secrets.js | tee -a "$REPORT_FILE"
else
    echo "⚠ scripts/find-secrets.js not found, skipping secret scan" | tee -a "$REPORT_FILE"
fi

# ==================== CODE QUALITY CHECKS ====================
print_section "CODE QUALITY CHECKS"

# Count TODO comments
echo "Scanning for TODO/FIXME comments..." | tee -a "$REPORT_FILE"
TODO_COUNT=$(grep -r "TODO\|FIXME\|HACK\|XXX" frontend/src backend/src 2>/dev/null | wc -l)
echo "Found $TODO_COUNT TODO/FIXME/HACK/XXX comments" | tee -a "$REPORT_FILE"
if [ $TODO_COUNT -gt 0 ]; then
    echo "--- Sample TODO comments ---" | tee -a "$REPORT_FILE"
    grep -rn "TODO\|FIXME\|HACK\|XXX" frontend/src backend/src 2>/dev/null | head -10 | tee -a "$REPORT_FILE"
fi

# Check for console.log (should use proper logging)
echo "Checking for console.log statements..." | tee -a "$REPORT_FILE"
CONSOLE_COUNT=$(grep -r "console\.log" frontend/src backend/src 2>/dev/null | wc -l)
echo "Found $CONSOLE_COUNT console.log statements" | tee -a "$REPORT_FILE"
if [ $CONSOLE_COUNT -gt 20 ]; then
    echo "⚠ Consider replacing console.log with proper logging" | tee -a "$REPORT_FILE"
fi

# Check file sizes (large files may need refactoring)
echo "Checking for large files (>500 lines)..." | tee -a "$REPORT_FILE"
find frontend/src backend/src -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | while read file; do
    LINES=$(wc -l < "$file" 2>/dev/null || echo 0)
    if [ $LINES -gt 500 ]; then
        echo "⚠ Large file: $file ($LINES lines)" | tee -a "$REPORT_FILE"
    fi
done

# ==================== DEPENDENCY AUDIT ====================
print_section "DEPENDENCY AUDIT"

echo "Checking for outdated packages (frontend)..." | tee -a "$REPORT_FILE"
cd frontend
npm outdated | tee -a "../$REPORT_FILE" || echo "All packages up to date" | tee -a "../$REPORT_FILE"
cd ..

echo "Checking for outdated packages (backend)..." | tee -a "$REPORT_FILE"
cd backend
npm outdated | tee -a "../$REPORT_FILE" || echo "All packages up to date" | tee -a "../$REPORT_FILE"
cd ..

# ==================== GIT AUDIT ====================
print_section "GIT REPOSITORY AUDIT"

# Check for large files in git history
echo "Checking for large files in repository..." | tee -a "$REPORT_FILE"
git ls-files | xargs ls -lh 2>/dev/null | awk '$5 ~ /M$/ {print $5, $9}' | sort -hr | head -10 | tee -a "$REPORT_FILE"

# Check for sensitive files that shouldn't be committed
echo "Checking for potentially sensitive files..." | tee -a "$REPORT_FILE"
SENSITIVE_FILES=0
for pattern in "*.env" "*.pem" "*.key" "*.p12" "*.pfx" "*secret*" "*password*" "*token*"; do
    if git ls-files | grep -i "$pattern" > /dev/null 2>&1; then
        echo "⚠ Found $pattern files in repository" | tee -a "$REPORT_FILE"
        git ls-files | grep -i "$pattern" | head -5 | tee -a "$REPORT_FILE"
        SENSITIVE_FILES=$((SENSITIVE_FILES + 1))
    fi
done
if [ $SENSITIVE_FILES -eq 0 ]; then
    echo "✓ No obvious sensitive files found" | tee -a "$REPORT_FILE"
fi

# ==================== SUMMARY ====================
print_section "AUDIT SUMMARY"

echo "Report saved to: $REPORT_FILE" | tee -a "$REPORT_FILE"
echo "Detailed logs available in: logs/" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ No critical issues found!${NC}" | tee -a "$REPORT_FILE"
    exit 0
else
    echo -e "${RED}✗ Found $ISSUES_FOUND issue(s) requiring attention${NC}" | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"
    echo "Review the logs and fix issues before production deployment." | tee -a "$REPORT_FILE"
    exit 1
fi
