#!/usr/bin/env python3
"""
SAMANVAY (SIH PS 26264) — Top-Level Database Backup CLI

Creates atomic, SHA-256 cryptographically checksummed database backups.
Usage:
    python scripts/backup.py [--destination-dir /path/to/backups]
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructure.scripts.backup import main

if __name__ == "__main__":
    main()
