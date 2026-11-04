# Automated Merge Gate & Pre-Commit Setup
*Based on @fullbytedeveloper's Merge Gate architecture (Reel DfNU_Z9gk5b)*

Stop merging AI code unchecked. AI coding agents frequently duplicate helper functions, introduce dead imports, and occasionally leak sensitive tokens. Enforce these 5 automated checks before every merge or commit:

---

## 🛠️ The 5 Automated Merge Gate Checks

| Tool | License | Purpose | What it Catches |
| :--- | :---: | :--- | :--- |
| **1. gitleaks** | MIT | Secret & Token Detection | Leaked API keys, private keys, high-entropy secrets in commits |
| **2. knip** | ISC | Dead Code & Unused Exports | Unused files, dependencies, exports, and enum members |
| **3. jscpd** | MIT | Duplicate Code Detection | Copy-pasted boilerplate, duplicate logic blocks |
| **4. osv-scanner** | Apache-2.0 | Dependency Vulnerabilities | Known CVEs in transitive dependencies using Google's OSV database |
| **5. lefthook** | MIT | Fast Pre-Commit Runner | Runs all 4 checks in parallel in <1 second before git commit |

---

## 📦 How to Install and Configure

### 1. Install CLI Tools
```bash
# Add Knip and JSCPD as dev dependencies
npm install -D knip jscpd

# Install Lefthook (or use npm package)
npm install -D lefthook
```

### 2. Configure `lefthook.yml`
Create `lefthook.yml` in your project root:

```yaml
pre-commit:
  parallel: true
  commands:
    gitleaks:
      run: gitleaks protect --staged --verbose
    knip:
      run: npx knip
    jscpd:
      run: npx jscpd src/ functions/ app/ --threshold 5
    audit:
      run: npm audit --audit-level=high
    tests:
      run: npm test
```

### 3. Add NPM Scripts to `package.json`
```json
"scripts": {
  "gate:knip": "npx knip",
  "gate:dups": "npx jscpd src/ functions/ app/",
  "gate:audit": "npm audit",
  "gate": "npm run security:check && npm test",
  "gate:all": "npm run security:check && npm test && npm run test:coverage"
}
```
