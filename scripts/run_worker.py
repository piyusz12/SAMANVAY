#!/usr/bin/env python3
"""
SAMANVAY — Top-Level Background Worker Runner

Starts the background worker daemon for SLA deadline monitoring, notifications, and escalation.
Usage:
    python scripts/run_worker.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructure.scripts.worker import run_worker_loop

if __name__ == "__main__":
    run_worker_loop()
