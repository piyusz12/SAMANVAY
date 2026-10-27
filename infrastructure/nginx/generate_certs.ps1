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
    Write-Host "[WARN] openssl not found in PATH. Generating via PowerShell New-SelfSignedCertificate..."
    $cert = New-SelfSignedCertificate -DnsName "localhost", "samanvay.local", "127.0.0.1" -CertStoreLocation "Cert:\CurrentUser\My" -NotAfter (Get-Date).AddYears(1)
    
    # Export certificate public key (PEM)
    $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
    $certB64 = [System.Convert]::ToBase64String($certBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
    $pemCert = "-----BEGIN CERTIFICATE-----`r`n$certB64`r`n-----END CERTIFICATE-----`r`n"
    [System.IO.File]::WriteAllText($CrtPath, $pemCert)
    
    # Create empty key placeholder with notice if openssl is unavailable
    if (-not (Test-Path $KeyPath)) {
        [System.IO.File]::WriteAllText($KeyPath, "# Windows Certificate Store Thumbprint: $($cert.Thumbprint)`r`n")
    }
    Write-Host "[SUCCESS] Generated self-signed certificate: $CrtPath"
}
