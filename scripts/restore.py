#!/usr/bin/env python3
"""
SAMANVAY — Top-Level Database Restore CLI

Restores database from an atomic backup with SHA-256 integrity verification.
Usage:
    python scripts/restore.py --backup-file /path/to/backup.db
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructure.scripts.restore import main

if __name__ == "__main__":
    main()
