#!/usr/bin/env python3
"""
REAL DATA ANALYSIS: Storm × Opioid Deaths

Performs lag analysis on real NOAA and CDC data.

Usage:
1. Ensure NOAA data is downloaded (run download_real_data.py)
2. Ensure CDC data is downloaded manually to data/raw/storms/cdc_wonder_drug_deaths.txt
3. Run this script.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from datetime import timedelta
from scipy import stats
import sys

# Configuration
DATA_DIR = Path("data/raw/storms")
RESULTS_DIR = Path("data/analysis")
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

def load_data():
    """
    Load storm and overdose data.
    """
    print("LOADING DATA...")
    
    # 1. Load Storm Data
    storm_file = DATA_DIR / "storm_events_2015_2023.csv"
    if not storm_file.exists():
        print(f"✗ Storm data not found: {storm_file}")
        print("  Please run download_real_data.py first.")
        return None, None
        
    storms_df = pd.read_csv(storm_file, low_memory=False)
    storms_df['BEGIN_DATE_TIME'] = pd.to_datetime(storms_df['BEGIN_DATE_TIME'])
    
    # Ensure COUNTY_FIPS is string and padded
    if 'COUNTY_FIPS' in storms_df.columns:
        storms_df['COUNTY_FIPS'] = storms_df['COUNTY_FIPS'].apply(lambda x: str(int(float(x))).zfill(5) if pd.notnull(x) else None)
    
    print(f"✓ Loaded {len(storms_df):,} storm events")
    
    # 2. Load CDC Data
    # Check for processed file first
    overdose_file = DATA_DIR / "overdose_deaths_county_monthly.csv"
    raw_cdc_file = DATA_DIR / "cdc_wonder_drug_deaths.txt"
    
    if overdose_file.exists():
        print(f"✓ Found processed CDC data: {overdose_file}")
        overdose_df = pd.read_csv(overdose_file, low_memory=False)
    elif raw_cdc_file.exists():
        print(f"✓ Found raw CDC data, processing: {raw_cdc_file}")
        overdose_df = process_cdc_wonder_data(raw_cdc_file)
    else:
        print(f"✗ CDC data not found: {raw_cdc_file}")
        print("  Please download data from CDC WONDER (see instructions in download_real_data.py)")
        return storms_df, None
        
    overdose_df['Date'] = pd.to_datetime(overdose_df['Date'])
    if 'COUNTY_FIPS' in overdose_df.columns:
        overdose_df['COUNTY_FIPS'] = overdose_df['COUNTY_FIPS'].apply(lambda x: str(int(float(x))).zfill(5) if pd.notnull(x) else None)
        
    print(f"✓ Loaded {len(overdose_df):,} overdose records")
    
    return storms_df, overdose_df

def process_cdc_wonder_data(filepath):
    """
    Process CDC WONDER downloaded data (tab-delimited).
    Reuse logic from download_real_data.py
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find where data ends (notes section starts with "---")
    data_end = len(lines)
    for i, line in enumerate(lines):
        if line.startswith('---'):
            data_end = i
            break
            
    data_lines = lines[:data_end]
    
    temp_file = DATA_DIR / "temp_cdc_data.txt"
    with open(temp_file, 'w', encoding='utf-8') as f:
        f.writelines(data_lines)
    
    df = pd.read_csv(temp_file, sep='\t', low_memory=False)
    temp_file.unlink()
    
    # Clean column names
    df.columns = df.columns.str.strip()
    
    # Create date column
    # Prefer 'Month Code' (YYYY/MM) if available, else try parsing 'Year' + 'Month'
    if 'Month Code' in df.columns:
        # Format: "2018/01"
        df['Date'] = pd.to_datetime(df['Month Code'], format='%Y/%m', errors='coerce')
    elif 'Year' in df.columns and 'Month' in df.columns:
        # Try to handle "Jan., 2018" or just "January"
        # Clean month string first (remove punctuation/digits)
        df['Month_Clean'] = df['Month'].astype(str).str.replace(r'[.,\d]', '', regex=True).str.strip()
        
        df['Date'] = pd.to_datetime(
            df['Year'].astype(str) + '-' + df['Month_Clean'] + '-01',
            errors='coerce'
        )
    
    # Clean county FIPS
    if 'County Code' in df.columns:
        # Ensure 5 digits (pad with leading zero if needed, e.g., 1073 -> 01073)
        df['COUNTY_FIPS'] = df['County Code'].astype(str).str.extract(r'(\d+)', expand=False).str.zfill(5)
        
    # Clean Deaths column (handle "Suppressed" or "Missing")
    if 'Deaths' in df.columns:
        # "Suppressed" usually means 1-9 deaths. 
        # For this analysis, treating as NaN (skip) or 0 is debated.
        # We'll coerce to numeric, turning strings to NaN.
        df['Deaths'] = pd.to_numeric(df['Deaths'], errors='coerce')
        
    # Save processed data
    output_file = DATA_DIR / "overdose_deaths_county_monthly.csv"
    df.to_csv(output_file, index=False)
    
    return df

def analyze_lag_patterns(storms_df, overdose_df, max_lag_months=6):
    """
    Analyze percent change in overdose deaths 1-6 months after major storms.
    """
    print("\nANALYZING LAG PATTERNS...")
    
    # Filter for major storms
    # Damage > $10M OR Deaths > 0
    major_storms = storms_df[
        (storms_df['DAMAGE_PROPERTY_NUM'] > 1e7) | 
        (storms_df['DEATHS_DIRECT'] > 0)
    ].copy()
    
    print(f"Identified {len(major_storms):,} major storm events")
    
    results = []
    
    # Optimize lookup by indexing overdose_df
    # MultiIndex (FIPS, Date) for fast lookup
    print("Indexing overdose data...")
    od_indexed = overdose_df.set_index(['COUNTY_FIPS', 'Date']).sort_index()
    
    count = 0
    total = len(major_storms)
    
    for idx, storm in major_storms.iterrows():
        count += 1
        if count % 100 == 0:
            print(f"Processing {count}/{total}...", end='\r')
            
        storm_date = storm['BEGIN_DATE_TIME']
        county_fips = storm['COUNTY_FIPS']
        
        if not county_fips or county_fips not in od_indexed.index.get_level_values(0):
            continue
            
        # Baseline: 3 months before
        # We need monthly data. 
        # If storm is in Oct 2017, baseline is July, Aug, Sept 2017.
        baseline_months = []
        for i in range(1, 4):
            d = storm_date - pd.DateOffset(months=i)
            # Normalize to 1st of month
            d = d.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            baseline_months.append(d)
            
        try:
            baseline_deaths = 0
            valid_baseline_months = 0
            
            for d in baseline_months:
                if (county_fips, d) in od_indexed.index:
                    deaths = od_indexed.loc[(county_fips, d), 'Deaths']
                    # Check for suppressed/missing values? 
                    # Assuming 'Deaths' is numeric. If "Suppressed", it might be NaN or string.
                    if isinstance(deaths, (int, float)) and not pd.isna(deaths):
                        baseline_deaths += deaths
                        valid_baseline_months += 1
                    
            if valid_baseline_months < 3:
                # If we don't have full baseline, skip? Or average what we have?
                # Let's skip to be strict, or accept if we have at least 1 month?
                # User said "Calculate baseline overdose deaths (3 months before)"
                if valid_baseline_months == 0:
                    continue
                baseline_monthly_avg = baseline_deaths / valid_baseline_months
            else:
                baseline_monthly_avg = baseline_deaths / 3
                
            # Test lags
            for lag in range(1, max_lag_months + 1):
                lag_date = storm_date + pd.DateOffset(months=lag)
                lag_date = lag_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                
                lag_deaths = 0
                if (county_fips, lag_date) in od_indexed.index:
                    deaths = od_indexed.loc[(county_fips, lag_date), 'Deaths']
                    if isinstance(deaths, (int, float)) and not pd.isna(deaths):
                        lag_deaths = deaths
                
                # Calculate % change
                if baseline_monthly_avg > 0:
                    pct_change = ((lag_deaths - baseline_monthly_avg) / baseline_monthly_avg) * 100
                elif lag_deaths > 0:
                    pct_change = 100.0 # Infinite increase from 0? Cap it?
                else:
                    pct_change = 0.0
                    
                results.append({
                    'storm_id': storm['EVENT_ID'],
                    'county_fips': county_fips,
                    'storm_date': storm_date,
                    'storm_type': storm['EVENT_TYPE'],
                    'lag_months': lag,
                    'baseline_deaths_avg': baseline_monthly_avg,
                    'lag_deaths': lag_deaths,
                    'pct_change': pct_change,
                    'damage': storm['DAMAGE_PROPERTY_NUM'],
                    'direct_deaths': storm['DEATHS_DIRECT']
                })
                
        except Exception as e:
            continue
            
    print("\nAnalysis complete.")
    return pd.DataFrame(results)

def create_visualizations(results_df):
    """
    Generate charts.
    """
    print("Creating visualizations...")
    sns.set_style("whitegrid")
    
    # 1. Bar Chart: Avg % Change by Lag
    plt.figure(figsize=(10, 6))
    avg_change = results_df.groupby('lag_months')['pct_change'].mean()
    
    # Filter outliers for robust mean?
    # Let's use median as well to check
    median_change = results_df.groupby('lag_months')['pct_change'].median()
    
    ax = avg_change.plot(kind='bar', color='#e74c3c', alpha=0.8)
    plt.axhline(0, color='black', linestyle='--', linewidth=0.8)
    plt.xlabel("Lag (Months)")
    plt.ylabel("Average % Change in Overdose Deaths")
    plt.title("Average Overdose Death Spike After Major Storms")
    
    # Add value labels
    for i, v in enumerate(avg_change):
        ax.text(i, v + 1 if v > 0 else v - 1, f"{v:.1f}%", ha='center', fontweight='bold')
        
    plt.tight_layout()
    plt.savefig(RESULTS_DIR / "avg_pct_change_by_lag.png", dpi=150)
    plt.close()
    
    # 2. Scatter Plot
    plt.figure(figsize=(10, 6))
    # Use optimal lag (max avg change)
    optimal_lag = avg_change.idxmax()
    subset = results_df[results_df['lag_months'] == optimal_lag]
    
    # Log scale for damage
    plt.scatter(subset['damage'], subset['pct_change'], alpha=0.4, s=20)
    plt.xscale('log')
    plt.xlabel("Property Damage ($)")
    plt.ylabel(f"% Change in Deaths ({optimal_lag}-Month Lag)")
    plt.title(f"Storm Severity vs. Overdose Spike")
    plt.axhline(0, color='black', linestyle='--')
    
    plt.tight_layout()
    plt.savefig(RESULTS_DIR / "severity_vs_spike_scatter.png", dpi=150)
    plt.close()
    
    print(f"✓ Saved visualizations to {RESULTS_DIR}")

def statistical_testing(results_df):
    """
    Run T-tests.
    """
    print("\nSTATISTICAL TESTING")
    print("-" * 40)
    
    report = []
    report.append("Lag Window | Mean Change | P-Value | Significant?")
    report.append("---|---|---|---")
    
    for lag in sorted(results_df['lag_months'].unique()):
        subset = results_df[results_df['lag_months'] == lag]
        # T-test against 0
        t_stat, p_val = stats.ttest_1samp(subset['pct_change'].dropna(), 0)
        
        mean_change = subset['pct_change'].mean()
        sig = "YES" if p_val < 0.05 else "NO"
        
        print(f"Lag {lag}: Mean={mean_change:.2f}%, p={p_val:.4f} ({sig})")
        report.append(f"{lag} months | {mean_change:.2f}% | {p_val:.4f} | {sig}")
        
    # Save report
    with open(RESULTS_DIR / "statistical_report.md", "w") as f:
        f.write("\n".join(report))

if __name__ == "__main__":
    storms, overdoses = load_data()
    
    if storms is not None and overdoses is not None:
        results = analyze_lag_patterns(storms, overdoses)
        
        if not results.empty:
            # Save results
            results.to_csv(RESULTS_DIR / "lag_analysis.csv", index=False)
            print(f"✓ Saved analysis results: {RESULTS_DIR / 'lag_analysis.csv'}")
            
            create_visualizations(results)
            statistical_testing(results)
            
            print("\nDONE.")
        else:
            print("No matching records found for analysis (check FIPS matching or date ranges).")
    else:
        print("\nCannot proceed without both datasets.")

