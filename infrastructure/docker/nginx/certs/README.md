# TLS / SSL Certificates Directory

This directory stores the TLS certificates used by the Nginx reverse-proxy container:

- `samanvay.crt`: Server TLS Certificate (PEM / CRT format, including intermediate bundle if applicable).
- `samanvay.key`: Server Private Key (RSA 2048/4096 or ECDSA P-256).

## Production Certificates
For production deployments (NIC / GovCloud / AWS / Azure / DigitalOcean):
Place the trusted certificate from your certificate authority or Let's Encrypt / Certbot:
```bash
# Example with certbot:
certbot certonly --webroot -w /var/www/certbot -d samanvay.aicte-india.org
cp /etc/letsencrypt/live/samanvay.aicte-india.org/fullchain.pem infrastructure/nginx/certs/samanvay.crt
cp /etc/letsencrypt/live/samanvay.aicte-india.org/privkey.pem infrastructure/nginx/certs/samanvay.key
chmod 600 infrastructure/nginx/certs/samanvay.key
```

## Staging & Local Testing Certificates
To quickly generate a secure self-signed development/staging certificate:
- On Linux/macOS:
  ```bash
  bash infrastructure/nginx/generate_certs.sh
  ```
- On Windows (PowerShell):
  ```powershell
  pwsh infrastructure/nginx/generate_certs.ps1
  ```
