# PowerShell script to generate self-signed TLS certificates for SAMANVAY local staging / testing
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CertsDir = Join-Path $ScriptDir "certs"

if (-not (Test-Path -Path $CertsDir)) {
    New-Item -ItemType Directory -Path $CertsDir -Force | Out-Null
}

$CrtPath = Join-Path $CertsDir "samanvay.crt"
$KeyPath = Join-Path $CertsDir "samanvay.key"

if ((Test-Path -Path $CrtPath) -and (Test-Path -Path $KeyPath)) {
    Write-Host "[INFO] Existing TLS certificates found in $CertsDir."
    Write-Host "[INFO] Keeping existing certificates. Delete them to regenerate."
    exit 0
}

Write-Host "[INFO] Generating self-signed TLS certificate for SAMANVAY..."
if (Get-Command openssl -ErrorAction SilentlyContinue) {
    openssl req -x509 -nodes -days 365 -newkey rsa:4096 `
        -keyout $KeyPath `
        -out $CrtPath `
        -subj "/C=IN/ST=Delhi/L=New Delhi/O=AICTE/OU=SAMANVAY Project/CN=localhost" `
        -addext "subjectAltName=DNS:localhost,DNS:samanvay.local,IP:127.0.0.1"
    Write-Host "[SUCCESS] Generated self-signed certificates via OpenSSL:"
    Write-Host "  Certificate: $CrtPath"
    Write-Host "  Private Key: $KeyPath"
} else {
    # OpenSSL is required to export an unencrypted PEM private key for Nginx
    throw "OpenSSL is required to export an unencrypted PEM private key for Nginx. Please install OpenSSL (via choco install openssl or Git for Windows) and run this script again."
}

