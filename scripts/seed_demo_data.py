#!/usr/bin/env python3
"""
SAMANVAY — Top-Level Synthetic Dataset Generator

Entry point to seed the deterministic demonstration dataset.
Usage:
    python scripts/seed_demo_data.py --reset
"""

import sys
import os

# Add workspace root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructure.scripts.seed_demo_data import main

if __name__ == "__main__":
    main()
