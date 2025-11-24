import os
import duckdb
import requests
import json
import time
from datetime import datetime, timedelta

# Configuration
# Phoenix typically runs on 6006. The API to get traces might differ based on version.
# We will assume a direct DB connection or API fetch.
# If Phoenix allows OTLP export to us, we rely on that. 
# This script serves as a fallback to pull data if push isn't configured.

PHOENIX_HOST = os.getenv("PHOENIX_HOST", "http://localhost:6006")
DUCKDB_PATH = os.getenv("DUCKDB_PATH", "../data/agent_analytics.duckdb")
SYNC_INTERVAL = int(os.getenv("SYNC_INTERVAL", "300")) # 5 minutes

def get_recent_spans():
    """
    Fetch spans from Phoenix API.
    Note: This is a placeholder for the actual Phoenix API call.
    Phoenix v1+ uses a GraphQL API or similar.
    """
    try:
        # Example: Fetch traces from the last hour
        # url = f"{PHOENIX_HOST}/v1/traces?start=..."
        # response = requests.get(url)
        # return response.json()
        
        # Since we don't have a running Phoenix to verify the API shape, 
        # we will leave this as a skeleton.
        print(f"Fetching spans from {PHOENIX_HOST}...")
        return []
    except Exception as e:
        print(f"Error fetching spans: {e}")
        return []

def insert_spans_into_duckdb(spans):
    if not spans:
        return
        
    con = duckdb.connect(DUCKDB_PATH)
    
    # Example insertion logic
    # con.execute("INSERT INTO raw.llm_spans ...")
    
    con.close()

def run_sync():
    print(f"Starting Phoenix ETL sync at {datetime.now()}")
    spans = get_recent_spans()
    insert_spans_into_duckdb(spans)
    print("Sync completed.")

if __name__ == "__main__":
    # Run once
    run_sync()

