#!/usr/bin/env python3
"""
SAMANVAY (SIH PS 26264) — Top-Level Benchmark Runner

Executes reproducible performance benchmark profiling across all core endpoints.
Usage:
    python scripts/run_benchmarks.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.tests.benchmark_runner import main

if __name__ == "__main__":
    main()
