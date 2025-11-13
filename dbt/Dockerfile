# dbt with DuckDB adapter
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install dbt-core and dbt-duckdb
RUN pip install --no-cache-dir \
    dbt-core==1.8.* \
    dbt-duckdb==1.8.*

# Set working directory
WORKDIR /dbt

# Default command
CMD ["dbt", "--version"]
