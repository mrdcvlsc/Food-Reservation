# Food-Reservation

CI status

Frontend: ![Frontend CI](https://github.com/sseMG/Food-Reservation/actions/workflows/frontend-ci.yml/badge.svg)  
Backend: ![Backend CI](https://github.com/sseMG/Food-Reservation/actions/workflows/backend-ci.yml/badge.svg)

## 🔍 How to Run Repository Audit

The repository includes automated audit scripts that check code quality, security vulnerabilities, and best practices.

### Quick Start

**Windows (PowerShell):**
```powershell
# Run full audit
.\tools\audit.ps1

# Quick audit (skip tests and detailed checks)
.\tools\audit.ps1 -Quick

# Skip tests only
.\tools\audit.ps1 -SkipTests
```

**Linux/Mac (Bash):**
```bash
# Make script executable (first time only)
chmod +x tools/audit.sh

# Run full audit
./tools/audit.sh
```

### What Gets Checked

The audit script performs the following checks:

1. **ESLint** - Code style and syntax issues in frontend and backend
2. **Unit Tests** - Runs test suites if configured (can skip with `-SkipTests`)
3. **NPM Audit** - Scans for known vulnerabilities in dependencies
4. **Secret Scanner** - Detects hardcoded passwords, API keys, tokens, and credentials
5. **Code Quality** - Finds TODO comments, console.log statements, and large files
6. **Dependency Health** - Checks for outdated packages
7. **Git Repository** - Scans for large files and accidentally committed secrets

### Reading the Results

Audit reports are saved to `logs/audit-YYYYMMDD-HHMMSS.txt` with timestamped filenames.

**Severity Levels:**
- 🚨 **CRITICAL** - Hardcoded secrets or credentials (fix immediately!)
- ⚠️ **HIGH** - Potential security issues or API keys in code
- ⚡ **MEDIUM** - Code quality issues that should be addressed
- ℹ️ **INFO** - Informational findings (e.g., environment variable usage)

**Exit Codes:**
- `0` - No critical issues found, safe to deploy
- `1` - Issues found, review and fix before production

### Interpretation Guide

**Common Findings:**

1. **"ESLint found issues"**
   - Review `logs/eslint-frontend.log` or `logs/eslint-backend.log`
   - Fix syntax errors, unused variables, and style violations
   - Run `npm run lint -- --fix` to auto-fix some issues

2. **"Hardcoded credentials detected"**
   - 🚨 **NEVER commit real passwords, API keys, or tokens!**
   - Move secrets to `.env` files (already in `.gitignore`)
   - Use `process.env.VARIABLE_NAME` to access environment variables
   - Create `.env.example` with placeholder values for documentation

3. **"npm audit found vulnerabilities"**
   - Review `logs/npm-audit-frontend.json` and `logs/npm-audit-backend.json`
   - Run `npm audit fix` to automatically update vulnerable packages
   - For breaking changes, run `npm audit fix --force` (test thoroughly after)
   - Some vulnerabilities may require manual package updates

4. **"Large file detected (>500 lines)"**
   - Consider refactoring into smaller, more maintainable modules
   - Extract reusable components or utility functions
   - Split business logic from UI code

5. **"Found X console.log statements"**
   - Replace with proper logging in production code
   - Use environment-based logging (e.g., only log in development)
   - Consider using a logging library like Winston or Pino

### Pre-Deployment Checklist

Before deploying to production, ensure:
- ✅ Audit script exits with code `0` (no critical issues)
- ✅ All tests pass
- ✅ No CRITICAL or HIGH severity secrets found
- ✅ NPM audit shows no high/critical vulnerabilities
- ✅ `.env` file exists with all required variables
- ✅ `.env` is in `.gitignore` (never commit secrets!)

### Optional Tools

For enhanced security scanning, install these tools:

```bash
# Snyk (advanced vulnerability scanning)
npm install -g snyk
snyk auth  # Follow prompts to authenticate

# Depcheck (find unused dependencies)
npm install -g depcheck
```

The audit script will automatically use these if available.

### Troubleshooting

**"ESLint not found"**
```bash
cd frontend && npm install
cd ../backend && npm install
```

**"Permission denied" (Linux/Mac)**
```bash
chmod +x tools/audit.sh
```

**"Script execution disabled" (Windows)**
```powershell
# Run PowerShell as Administrator and execute:
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### CI/CD Integration

The audit script can be integrated into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Security Audit
  run: |
    chmod +x tools/audit.sh
    ./tools/audit.sh
```

---