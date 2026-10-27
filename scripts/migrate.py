#!/usr/bin/env python3
"""
SAMANVAY — Top-Level Database Migration CLI

Runs database schema migrations via Alembic.
Usage:
    python scripts/migrate.py [--direction upgrade|downgrade] [--revision head]
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructure.scripts.migrate import main

if __name__ == "__main__":
    main()
