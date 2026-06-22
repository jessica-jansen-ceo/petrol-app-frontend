# ─────────────────────────────────────────────────────────────────────────────
#  FuelFlow POC — run the website locally
#
#  Usage (from anywhere):
#     powershell -ExecutionPolicy Bypass -File script\run.ps1
#  or, if your policy already allows scripts, just right-click > Run with PowerShell.
#
#  Starts the Angular dev server and opens it in your browser.
#  Optional flags:
#     -Port 4200     pick a port (default 4200)
#     -NoOpen        don't auto-open the browser
# ─────────────────────────────────────────────────────────────────────────────
param(
  [int]$Port = 4200,
  [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'

# Project root is the parent of this script's folder.
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
Write-Host "Project: $root" -ForegroundColor Cyan

# Check Node is available.
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js was not found on PATH. Install it from https://nodejs.org/ and try again." -ForegroundColor Red
  exit 1
}

# Install dependencies on first run.
if (-not (Test-Path (Join-Path $root 'node_modules'))) {
  Write-Host "Installing dependencies (first run)..." -ForegroundColor Yellow
  npm install
  if ($LASTEXITCODE -ne 0) { Write-Host "npm install failed." -ForegroundColor Red; exit 1 }
}

$url = "http://localhost:$Port/"
Write-Host "Starting dev server at $url" -ForegroundColor Green

# Open the browser shortly after the server boots (unless suppressed).
if (-not $NoOpen) {
  Start-Job -ScriptBlock {
    param($u)
    Start-Sleep -Seconds 12
    Start-Process $u
  } -ArgumentList $url | Out-Null
}

# Run the dev server (blocks until you press Ctrl+C).
npx ng serve --port $Port
