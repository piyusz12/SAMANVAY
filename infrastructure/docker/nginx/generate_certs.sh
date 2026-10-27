#!/usr/bin/env bash
# Generate self-signed TLS certificates for SAMANVAY local staging / testing
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="${SCRIPT_DIR}/certs"

mkdir -p "${CERTS_DIR}"

CRT_PATH="${CERTS_DIR}/samanvay.crt"
KEY_PATH="${CERTS_DIR}/samanvay.key"

if [ -f "${CRT_PATH}" ] && [ -f "${KEY_PATH}" ]; then
    echo "[INFO] Existing TLS certificates found in ${CERTS_DIR}."
    echo "[INFO] Keeping existing certificates. Delete them to regenerate."
    exit 0
fi

echo "[INFO] Generating 4096-bit self-signed TLS certificate for SAMANVAY..."
openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
    -keyout "${KEY_PATH}" \
    -out "${CRT_PATH}" \
    -subj "/C=IN/ST=Delhi/L=New Delhi/O=AICTE/OU=SAMANVAY Project/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:samanvay.local,IP:127.0.0.1"

chmod 600 "${KEY_PATH}"
chmod 644 "${CRT_PATH}"

echo "[SUCCESS] Generated self-signed certificates:"
echo "  Certificate: ${CRT_PATH}"
echo "  Private Key: ${KEY_PATH}"
