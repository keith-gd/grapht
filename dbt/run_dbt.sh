#!/bin/bash
# Helper script to run dbt commands with the venv

set -e

# Activate venv and run dbt
cd "$(dirname "$0")"
.venv/bin/dbt "$@" --profiles-dir .
