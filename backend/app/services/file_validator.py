import io
import os
import re
import csv
import zipfile
import hashlib
from typing import NamedTuple, Optional, List
from backend.app.config import settings

class ValidationResult(NamedTuple):
    is_valid: bool
    detected_mime: str
    sanitized_filename: str
    file_size: int
    sha256_hash: str
    error_detail: Optional[str] = None

# Prohibited binary and script magic signatures
PROHIBITED_SIGNATURES = [
    (b"MZ", "DOS/Windows Portable Executable (PE) binary detected"),
    (b"\x7fELF", "Linux/UNIX ELF executable binary detected"),
    (b"\xca\xfe\xba\xbe", "Java bytecode class binary detected"),
    (b"\xfe\xed\xfa\xce", "Mach-O 32-bit binary detected"),
    (b"\xfe\xed\xfa\xcf", "Mach-O 64-bit binary detected"),
    (b"\xce\xfa\xed\xfe", "Mach-O 32-bit (reverse) binary detected"),
    (b"\xcf\xfa\xed\xfe", "Mach-O 64-bit (reverse) binary detected"),
    (b"<?php", "PHP executable script detected"),
    (b"<script", "Embedded HTML/Javascript script tag detected"),
    (b"#!/bin/sh", "UNIX shell script shebang detected"),
    (b"#!/bin/bash", "UNIX bash script shebang detected"),
    (b"#!/usr/bin/", "UNIX executable script shebang detected"),
]

def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename against directory traversal, null-byte injection,
    and dangerous shell/filesystem characters.
    """
    if not filename:
        return "evidence_document"
    # Strip directory components (prevents path traversal ../ or ..\)
    base = os.path.basename(filename)
    # Strip null bytes and control chars
    base = base.replace("\0", "").strip()
    # Replace any non-alphanumeric (except . - _) with underscore
    sanitized = re.sub(r"[^a-zA-Z0-9_\.-]", "_", base)
    # Prevent hidden files starting with . or multiple consecutive dots
    sanitized = re.sub(r"^\.+", "", sanitized)
    sanitized = re.sub(r"\.{2,}", ".", sanitized)
    return sanitized if sanitized else "evidence_document"

class FileSignatureValidator:
    """
    Validates file signatures (magic bytes), mime structures, and internal content
    rather than trusting client-supplied file extensions or Content-Type headers.
    """

    @classmethod
    def validate_file(
        cls,
        filename: str,
        file_bytes: bytes,
        max_size_bytes: Optional[int] = None,
        allowed_extensions: Optional[List[str]] = None
    ) -> ValidationResult:
        max_size = max_size_bytes or settings.MAX_ATTACHMENT_SIZE_BYTES
        allowed_exts = set(allowed_extensions or settings.ALLOWED_DOCUMENT_EXTENSIONS)

        # 1. Size checks
        file_size = len(file_bytes)
        if file_size == 0:
            return ValidationResult(
                is_valid=False,
                detected_mime="",
                sanitized_filename="",
                file_size=0,
                sha256_hash="",
                error_detail="Uploaded file is empty (0 bytes)."
            )

        if file_size > max_size:
            max_mb = max_size / (1024 * 1024)
            return ValidationResult(
                is_valid=False,
                detected_mime="",
                sanitized_filename="",
                file_size=file_size,
                sha256_hash="",
                error_detail=f"File size exceeds the {int(max_mb)} MB maximum permitted limit."
            )

        # 2. Filename and extension checks
        clean_filename = sanitize_filename(filename)
        ext = os.path.splitext(clean_filename)[1].lower()
        if not ext or ext not in allowed_exts:
            return ValidationResult(
                is_valid=False,
                detected_mime="",
                sanitized_filename=clean_filename,
                file_size=file_size,
                sha256_hash="",
                error_detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(allowed_exts))}"
            )

        sha256 = hashlib.sha256(file_bytes).hexdigest()

        # 3. Check for explicitly prohibited executable/script signatures regardless of extension
        prefix_sample = file_bytes[:512].lower()
        for sig, reason in PROHIBITED_SIGNATURES:
            if file_bytes.startswith(sig) or (sig.startswith(b"<") and sig in prefix_sample):
                return ValidationResult(
                    is_valid=False,
                    detected_mime="application/x-executable",
                    sanitized_filename=clean_filename,
                    file_size=file_size,
                    sha256_hash=sha256,
                    error_detail=f"Security violation: {reason}"
                )

        # 4. Format-specific magic byte and deep structure verification
        if ext == ".pdf":
            if not file_bytes.startswith(b"%PDF-"):
                return ValidationResult(
                    is_valid=False,
                    detected_mime="application/octet-stream",
                    sanitized_filename=clean_filename,
                    file_size=file_size,
                    sha256_hash=sha256,
                    error_detail="Invalid PDF signature: File does not start with standard '%PDF-' header."
                )
            detected_mime = "application/pdf"

        elif ext == ".png":
            if not file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
                return ValidationResult(
                    is_valid=False,
                    detected_mime="application/octet-stream",
                    sanitized_filename=clean_filename,
                    file_size=file_size,
                    sha256_hash=sha256,
                    error_detail="Invalid PNG signature: File does not start with PNG magic bytes."
                )
            detected_mime = "image/png"

        elif ext in (".jpg", ".jpeg"):
            if not file_bytes.startswith(b"\xff\xd8\xff"):
                return ValidationResult(
                    is_valid=False,
                    detected_mime="application/octet-stream",
                    sanitized_filename=clean_filename,
                    file_size=file_size,
                    sha256_hash=sha256,
                    error_detail="Invalid JPEG signature: File does not start with JPEG SOI marker."
                )
            detected_mime = "image/jpeg"

        elif ext in (".docx", ".xlsx"):
            # Office OpenXML documents are ZIP archives
            if not file_bytes.startswith(b"PK\x03\x04"):
                return ValidationResult(
                    is_valid=False,
                    detected_mime="application/octet-stream",
                    sanitized_filename=clean_filename,
                    file_size=file_size,
                    sha256_hash=sha256,
                    error_detail=f"Invalid {ext.lstrip('.').upper()} signature: File does not start with standard ZIP package marker."
                )
            try:
                with zipfile.ZipFile(io.BytesIO(file_bytes), "r") as zf:
                    namelist = zf.namelist()
                    if "[Content_Types].xml" not in namelist:
                        return ValidationResult(
                            is_valid=False,
                            detected_mime="application/zip",
                            sanitized_filename=clean_filename,
                            file_size=file_size,
                            sha256_hash=sha256,
                            error_detail=f"Invalid {ext.lstrip('.').upper()} package: Missing [Content_Types].xml structure."
                        )
                    if ext == ".docx":
                        detected_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    else:
                        detected_mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            except zipfile.BadZipFile:
                return ValidationResult(
                    is_valid=False,
                    detected_mime="application/octet-stream",
                    sanitized_filename=clean_filename,
                    file_size=file_size,
                    sha256_hash=sha256,
                    error_detail=f"Corrupted {ext.upper()} document package."
                )

        elif ext == ".csv":
            # Must not contain null bytes
            if b"\x00" in file_bytes:
                return ValidationResult(
                    is_valid=False,
                    detected_mime="application/octet-stream",
                    sanitized_filename=clean_filename,
                    file_size=file_size,
                    sha256_hash=sha256,
                    error_detail="Invalid CSV file: Contains binary null bytes."
                )
            try:
                text_content = file_bytes.decode("utf-8", errors="strict")
            except UnicodeDecodeError:
                try:
                    text_content = file_bytes.decode("latin-1")
                except Exception:
                    return ValidationResult(
                        is_valid=False,
                        detected_mime="application/octet-stream",
                        sanitized_filename=clean_filename,
                        file_size=file_size,
                        sha256_hash=sha256,
                        error_detail="Invalid CSV file: Content is not valid text."
                    )
            # Check basic CSV structure
            try:
                reader = csv.reader(io.StringIO(text_content))
                # read first row
                next(reader, None)
            except Exception as e:
                return ValidationResult(
                    is_valid=False,
                    detected_mime="text/plain",
                    sanitized_filename=clean_filename,
                    file_size=file_size,
                    sha256_hash=sha256,
                    error_detail=f"Invalid CSV structure: {str(e)}"
                )
            detected_mime = "text/csv"

        elif ext == ".txt":
            if b"\x00" in file_bytes:
                return ValidationResult(
                    is_valid=False,
                    detected_mime="application/octet-stream",
                    sanitized_filename=clean_filename,
                    file_size=file_size,
                    sha256_hash=sha256,
                    error_detail="Invalid plain text file: Contains binary null bytes."
                )
            try:
                file_bytes.decode("utf-8", errors="strict")
            except UnicodeDecodeError:
                try:
                    file_bytes.decode("latin-1")
                except Exception:
                    return ValidationResult(
                        is_valid=False,
                        detected_mime="application/octet-stream",
                        sanitized_filename=clean_filename,
                        file_size=file_size,
                        sha256_hash=sha256,
                        error_detail="Invalid text file: Content is not decodable text."
                    )
            detected_mime = "text/plain"

        else:
            return ValidationResult(
                is_valid=False,
                detected_mime="application/octet-stream",
                sanitized_filename=clean_filename,
                file_size=file_size,
                sha256_hash=sha256,
                error_detail=f"Unhandled file extension {ext}"
            )

        return ValidationResult(
            is_valid=True,
            detected_mime=detected_mime,
            sanitized_filename=clean_filename,
            file_size=file_size,
            sha256_hash=sha256,
            error_detail=None
        )
