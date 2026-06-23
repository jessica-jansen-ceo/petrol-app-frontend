# === FuelFlow Deploy Script — develop ➜ demo (static build) ===
# Source of truth:  develop  (your working branch)
# Deploy target:    demo      (disposable branch that hosts the built static site
#                              for GitHub Pages — rebuilt from develop each run)
#
# What it does: pulls latest develop, resets demo to develop, builds Angular,
# strips the branch down to the built static site at the repo root, then
# force-pushes demo. Point GitHub Pages at the `demo` branch (root).
#
# Optional parameter: -DeployType g|d  (skips the interactive prompt)
#   g = GitHub Pages (base-href /petrol-app-frontend/)
#   d = Custom Domain / root (base-href /)
param(
    [string]$DeployType = ""
)

$ErrorActionPreference = "Stop"

# Run from the repo root regardless of where the script is invoked from.
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

# Raise Node.js heap limit so the build doesn't OOM on large projects.
$env:NODE_OPTIONS = "--max-old-space-size=4096"

Write-Host "🚀 FuelFlow Deploy (develop ➜ demo) - Starting..." -ForegroundColor Cyan

# 1. Stash any local changes (e.g. tweaks to this script).
Write-Host "Step 1: Stashing local changes..." -ForegroundColor Yellow
git stash push -m "deploy temp stash" --include-untracked

# 2. Get the latest develop (source of truth).
Write-Host "Step 2: Pulling latest develop..." -ForegroundColor Yellow
git checkout develop
git pull origin develop

# 3. Switch to demo and reset it to develop (demo is the disposable build branch).
Write-Host "Step 3: Resetting demo to develop..." -ForegroundColor Yellow
git checkout demo
git reset --hard develop

# 4. Install dependencies.
Write-Host "Step 4: npm install..." -ForegroundColor Yellow
npm install --legacy-peer-deps

# === Choose deployment type ===
if (-not $DeployType) {
    Write-Host "`nIs this for GitHub Pages (subfolder) or Custom Domain?" -ForegroundColor Cyan
    Write-Host "Enter [g] for GitHub Pages or [d] for Custom Domain: " -NoNewline
    $DeployType = Read-Host
}

if ($DeployType -eq "g" -or $DeployType -eq "G") {
    $baseHref = "/petrol-app-frontend/"
    $deployTypeLabel = "GitHub"
    Write-Host "→ GitHub Pages mode (base-href = /petrol-app-frontend/)" -ForegroundColor Yellow
}
else {
    $baseHref = "/"
    $deployTypeLabel = "Domain"
    Write-Host "→ Custom Domain / Root mode (base-href = /)" -ForegroundColor Yellow
}

# 5. Build Angular with the correct base-href.
Write-Host "Step 5: Building Angular with base-href '$baseHref'..." -ForegroundColor Yellow
npx ng build --configuration production --output-path dist/demo-build --base-href $baseHref

# Check build.
if (-Not (Test-Path "dist/demo-build/browser/index.html")) {
    Write-Host "❌ Build failed - index.html not found in dist/demo-build/browser/" -ForegroundColor Red
    if (-not $DeployType) { Read-Host "Press Enter to exit" }
    exit 1
}
Write-Host "✅ Build successful!" -ForegroundColor Green

# 6. Clean everything except the script folder, .git, dist and dotfiles.
Write-Host "Step 6: Cleaning non-build files..." -ForegroundColor Yellow
Get-ChildItem -Path . | Where-Object {
    $_.Name -ne "script" -and
    $_.Name -ne ".git" -and
    $_.Name -ne "dist" -and
    $_.Name -notlike ".*"
} | Remove-Item -Recurse -Force

# 7. Copy the browser build to the repo root.
Write-Host "Step 7: Copying browser build to root..." -ForegroundColor Yellow
Copy-Item -Path "dist/demo-build/browser/*" -Destination . -Recurse -Force

# 8. SPA routing + Jekyll-bypass files.
Write-Host "Step 8: Creating 404.html + .nojekyll..." -ForegroundColor Yellow
Copy-Item -Path "index.html" -Destination "404.html" -Force
New-Item -ItemType File -Name ".nojekyll" -Force | Out-Null

# 9. Commit & force-push demo.
Write-Host "Step 9: Committing & force pushing demo..." -ForegroundColor Yellow
git add -A
$commitMessage = "Deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $deployTypeLabel"
git commit -m $commitMessage
git push origin demo --force

# Return to develop so you keep working there, and restore stashed changes.
git checkout develop
git stash pop -q 2>$null

Write-Host "`n🎉 SUCCESS! demo branch rebuilt from develop and pushed." -ForegroundColor Green
Write-Host "GitHub demo branch: https://github.com/jessica-jansen-ceo/petrol-app-frontend/tree/demo" -ForegroundColor Magenta
Write-Host "Enable GitHub Pages on the 'demo' branch (root) to publish." -ForegroundColor Magenta

if (-not $DeployType) { Read-Host "`nPress Enter to close window" }
