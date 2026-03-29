param(
  [switch]$RestoreDb,
  [string]$DbBackup = "pgdata.tar.gz",
  [string]$DbVolume = "web_katalog_postgres_data",
  [switch]$SkipDocker,
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

function Test-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Ensure-Command {
  param([string]$Name)
  if (-not (Test-Command $Name)) {
    throw "Perintah '$Name' tidak ditemukan. Install dulu sebelum lanjut."
  }
}

function Run {
  param([string]$Cmd, [string[]]$Args)
  & $Cmd @Args
  if ($LASTEXITCODE -ne 0) {
    throw "Gagal menjalankan: $Cmd $($Args -join ' ')"
  }
}

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "== Setup web-katalog ==" -ForegroundColor Cyan

$hasNode = Test-Command "node"
$hasNpm = Test-Command "npm"
$hasDocker = Test-Command "docker"
$envExists = (Test-Path ".env") -or (Test-Path ".env.local")
$hasPackageLock = Test-Path "package-lock.json"
$backupPath = Join-Path $Root $DbBackup
$backupExists = if ($RestoreDb) { Test-Path $backupPath } else { $false }
$dockerRunning = $false
if ($hasDocker) {
  try {
    docker info | Out-Null
    $dockerRunning = $true
  } catch {
    $dockerRunning = $false
  }
}

$status = [ordered]@{
  "Node.js" = $hasNode
  "npm" = $hasNpm
  "Docker" = $hasDocker
  "Docker running" = $dockerRunning
  ".env / .env.local" = $envExists
  "package-lock.json" = $hasPackageLock
  "DB backup file" = if ($RestoreDb) { $backupExists } else { $null }
}

Write-Host "== Scan ==" -ForegroundColor Cyan
foreach ($key in $status.Keys) {
  $value = $status[$key]
  if ($null -eq $value) {
    Write-Host ("- {0}: (skip)" -f $key)
    continue
  }
  $label = if ($value) { "OK" } else { "Missing" }
  $color = if ($value) { "Green" } else { "Yellow" }
  Write-Host ("- {0}: {1}" -f $key, $label) -ForegroundColor $color
}

if ($CheckOnly) {
  Write-Host "Selesai scan. Tidak ada aksi dijalankan (-CheckOnly)." -ForegroundColor Yellow
  exit 0
}

Ensure-Command "node"
Ensure-Command "npm"

if (-not (Test-Path ".env") -and -not (Test-Path ".env.local")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env"
    Write-Host "Membuat .env dari .env.example. Silakan sesuaikan variabelnya." -ForegroundColor Yellow
  } else {
    Write-Host "File .env/.env.local tidak ditemukan. Silakan buat manual." -ForegroundColor Yellow
  }
}

if (Test-Path "package-lock.json") {
  Run "npm" @("ci")
} else {
  Run "npm" @("install")
}

Run "npx" @("prisma", "generate")

if (-not $SkipDocker) {
  Ensure-Command "docker"
  if (-not $dockerRunning) {
    throw "Docker terdeteksi tapi belum running. Buka Docker Desktop lalu coba lagi."
  }
  Run "docker" @("compose", "up", "-d", "postgres")
}

if ($RestoreDb) {
  if (-not (Test-Path $backupPath)) {
    throw "Backup tidak ditemukan: $backupPath"
  }

  if (-not $SkipDocker) {
    Run "docker" @("volume", "create", $DbVolume)
    Run "docker" @(
      "run", "--rm",
      "-v", "$DbVolume:/var/lib/postgresql/data",
      "-v", "$Root:/backup",
      "alpine",
      "sh", "-c", "tar xzf /backup/$DbBackup -C /var/lib/postgresql/data"
    )
  } else {
    throw "Restore DB butuh Docker. Jalankan tanpa -SkipDocker."
  }
}

Run "npx" @("prisma", "db", "push")

Write-Host "Selesai. Jalankan 'npm run dev' untuk mulai." -ForegroundColor Green
