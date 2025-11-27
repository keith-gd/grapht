# Storm × Opioid Deaths: Production Roadmap

**Hypothesis**: Opioid overdose deaths spike 1-6 months after major weather disasters due to displacement, treatment disruption, and trauma.

**Prototype Finding**: 2-month lag with +12.8% increase (simulated data)

---

## Phase 1: Data Collection (Week 1)

### Dataset 1: NOAA Storm Events Database

**Source**: https://www.ncei.noaa.gov/stormevents/ftp.jsp

**What You Need**:
- Storm Events Details files (2015-2023)
- Format: CSV (gzipped)
- Size: ~500MB total

**Direct Download Links** (copy these into your browser):

```
# 2015
https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/StormEvents_details-ftp_v1.0_d2015_c20240916.csv.gz

# 2016
https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/StormEvents_details-ftp_v1.0_d2016_c20240916.csv.gz

# 2017 (Hurricane Harvey, Irma, Maria)
https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/StormEvents_details-ftp_v1.0_d2017_c20240916.csv.gz

# 2018
https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/StormEvents_details-ftp_v1.0_d2018_c20240916.csv.gz

# 2019
https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/StormEvents_details-ftp_v1.0_d2019_c20240916.csv.gz

# 2020
https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/StormEvents_details-ftp_v1.0_d2020_c20240916.csv.gz

# 2021
https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/StormEvents_details-ftp_v1.0_d2021_c20240916.csv.gz

# 2022
https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/StormEvents_details-ftp_v1.0_d2022_c20240916.csv.gz

# 2023
https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/StormEvents_details-ftp_v1.0_d2023_c20240916.csv.gz
```

**Key Columns**:
- `EVENT_ID`: Unique event identifier
- `EVENT_TYPE`: Tornado, Flash Flood, Hurricane, etc.
- `BEGIN_DATE_TIME`: When storm started
- `STATE_FIPS` + `CZ_FIPS`: County identifier (combine for 5-digit FIPS)
- `DAMAGE_PROPERTY`: Property damage estimate
- `DEATHS_DIRECT` / `DEATHS_INDIRECT`: Casualties
- `INJURIES_DIRECT` / `INJURIES_INDIRECT`: Injuries
- `BEGIN_LAT` / `BEGIN_LON`: Location

**Documentation**: 
- https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/Storm-Data-Export-Format.pdf

---

### Dataset 2: CDC WONDER Drug Overdose Deaths

**Source**: https://wonder.cdc.gov/mcd.html

**What You Need**:
- County-level monthly drug overdose deaths (2015-2023)
- Grouped by: County, Year, Month
- ICD-10 codes: X40-X44, X60-X64, Y10-Y14 (all drug poisonings)

**Step-by-Step Query Instructions**:

1. **Go to**: https://wonder.cdc.gov/mcd.html
2. **Click**: "I Agree" to terms
3. **Configure Query**:

   **Section 1. Organize table layout**
   - Group Results By:
     - ☑ County (2013+)
     - ☑ Year
     - ☑ Month
   
   **Section 2. Select location**
   - States: All States (leave as default)
   - County: All Counties (leave as default)
   
   **Section 3. Select demographics**
   - Gender: All
   - Hispanic Origin: All
   - Race: All
   - Age Groups: All Ages
   
   **Section 4. Select year and month**
   - Year: 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023
   - Month: All Months
   
   **Section 5. Select weekday, autopsy and place of death**
   - All (leave as default)
   
   **Section 6. Select cause of death** (CRITICAL)
   - UCD - ICD-10 Codes:
     - Expand "Injury" section
     - Find and check:
       - ☑ X40 (Accidental poisoning - nonopioid analgesics)
       - ☑ X41 (Accidental poisoning - antiepileptics, sedatives)
       - ☑ X42 (Accidental poisoning - narcotics and psychodysleptics)
       - ☑ X43 (Accidental poisoning - other drugs)
       - ☑ X44 (Accidental poisoning - other and unspecified drugs)
       - ☑ X60 (Intentional self-poisoning - nonopioid analgesics)
       - ☑ X61 (Intentional self-poisoning - antiepileptics, sedatives)
       - ☑ X62 (Intentional self-poisoning - narcotics)
       - ☑ X63 (Intentional self-poisoning - other drugs)
       - ☑ X64 (Intentional self-poisoning - other and unspecified)
       - ☑ Y10-Y14 (Poisoning of undetermined intent)
   
   **Section 7. Other options**
   - Leave all as default
   
   **Section 8. Select output options**
   - Show Totals: True
   - Show Zero Values: False (important!)
   - Show Suppressed Values: False

4. **Click "Send"** at bottom

5. **On results page**:
   - Click "Export Results"
   - Select "Download" (tab-delimited text file)
   - Save as: `cdc_wonder_drug_deaths_2015_2023.txt`

**IMPORTANT NOTES**:
- Query may be large (>100K records)
- If it times out, break into chunks:
  - 2015-2017
  - 2018-2020
  - 2021-2023
- Counties with <10 deaths are suppressed (will show as "Suppressed")
- Save the "Notes" section at bottom of file - has important caveats

**Alternative**: Use CDC's downloadable datasets
- https://www.cdc.gov/nchs/data-visualization/drug-poisoning-mortality/
- Pre-calculated county estimates (but not monthly)

---

## Phase 2: Data Processing & Analysis (Week 1-2)

### Script 1: Load and Clean Data

```python
import pandas as pd
import numpy as np
from datetime import timedelta

# Load NOAA storms
storms = pd.concat([
    pd.read_csv(f'StormEvents_details-ftp_v1.0_d{year}_c20240916.csv.gz', 
                compression='gzip', low_memory=False)
    for year in range(2015, 2024)
])

# Clean storms
storms['BEGIN_DATE_TIME'] = pd.to_datetime(storms['BEGIN_DATE_TIME'])
storms['COUNTY_FIPS'] = (
    storms['STATE_FIPS'].astype(str).str.zfill(2) + 
    storms['CZ_FIPS'].astype(str).str.zfill(3)
)

# Parse damage (handles K, M, B suffixes)
def parse_damage(val):
    if pd.isna(val): return 0
    val = str(val).upper()
    if 'K' in val: return float(val.replace('K','')) * 1e3
    if 'M' in val: return float(val.replace('M','')) * 1e6
    if 'B' in val: return float(val.replace('B','')) * 1e9
    return float(val) if val else 0

storms['DAMAGE_NUM'] = storms['DAMAGE_PROPERTY'].apply(parse_damage)

# Filter to major storms (>$10M damage OR deaths >0)
major_storms = storms[
    (storms['DAMAGE_NUM'] > 1e7) | 
    (storms['DEATHS_DIRECT'] > 0) |
    (storms['DEATHS_INDIRECT'] > 0)
].copy()

print(f"Total storms: {len(storms):,}")
print(f"Major storms: {len(major_storms):,}")

# Load CDC data (tab-delimited)
overdoses = pd.read_csv('cdc_wonder_drug_deaths_2015_2023.txt', 
                        sep='\t', low_memory=False)

# Clean CDC data
overdoses['County Code'] = overdoses['County Code'].str.extract(r'(\d{5})')
overdoses['Date'] = pd.to_datetime(
    overdoses['Year'].astype(str) + '-' + 
    overdoses['Month Code'].astype(str) + '-01'
)

print(f"Overdose records: {len(overdoses):,}")
print(f"Counties: {overdoses['County Code'].nunique()}")
```

### Script 2: Lag Analysis

```python
def analyze_storm_overdose_lag(storms_df, overdose_df, max_lag_months=6):
    """
    For each major storm:
    1. Get baseline overdose deaths (3 months before)
    2. Compare to deaths at 1-6 month lags after
    3. Calculate percent change
    """
    
    results = []
    
    for _, storm in major_storms.iterrows():
        storm_date = storm['BEGIN_DATE_TIME']
        county = storm['COUNTY_FIPS']
        
        # Baseline (90 days before storm)
        baseline = overdose_df[
            (overdose_df['County Code'] == county) &
            (overdose_df['Date'] >= storm_date - timedelta(days=90)) &
            (overdose_df['Date'] < storm_date)
        ]['Deaths'].sum()
        
        baseline_monthly = baseline / 3  # Average per month
        
        # Test each lag window
        for lag in range(1, max_lag_months + 1):
            lag_start = storm_date + timedelta(days=30*lag)
            lag_end = lag_start + timedelta(days=30)
            
            lag_deaths = overdose_df[
                (overdose_df['County Code'] == county) &
                (overdose_df['Date'] >= lag_start) &
                (overdose_df['Date'] < lag_end)
            ]['Deaths'].sum()
            
            if baseline_monthly > 0:
                pct_change = ((lag_deaths - baseline_monthly) / baseline_monthly) * 100
            else:
                pct_change = 0
            
            results.append({
                'storm_id': storm['EVENT_ID'],
                'storm_date': storm_date,
                'storm_type': storm['EVENT_TYPE'],
                'county': county,
                'lag_months': lag,
                'baseline_deaths': baseline_monthly,
                'lag_deaths': lag_deaths,
                'pct_change': pct_change,
                'damage': storm['DAMAGE_NUM'],
                'direct_deaths': storm['DEATHS_DIRECT']
            })
    
    return pd.DataFrame(results)

# Run analysis
results = analyze_storm_overdose_lag(major_storms, overdoses)

# Save
results.to_csv('storm_overdose_lag_results.csv', index=False)

# Summary
print("\nAverage % Change by Lag:")
print(results.groupby('lag_months')['pct_change'].mean())

# Find optimal lag
optimal_lag = results.groupby('lag_months')['pct_change'].mean().idxmax()
print(f"\nOptimal lag: {optimal_lag} months")
```

### Script 3: Statistical Testing

```python
from scipy import stats

# Compare lag periods to baseline
for lag in range(1, 7):
    lag_data = results[results['lag_months'] == lag]
    
    # T-test: is mean change significantly > 0?
    t_stat, p_value = stats.ttest_1samp(lag_data['pct_change'], 0)
    
    print(f"\nLag {lag} months:")
    print(f"  Mean change: {lag_data['pct_change'].mean():.1f}%")
    print(f"  T-statistic: {t_stat:.3f}")
    print(f"  P-value: {p_value:.4f}")
    print(f"  Significant: {'YES' if p_value < 0.05 else 'NO'}")
```

### Edge Cases to Explore

1. **Storm Type Differences**
   - Hurricanes vs. tornadoes vs. floods
   - Hypothesis: Hurricanes have longer lag (mass displacement)

2. **Seasonality Control**
   - Opioid deaths peak in winter
   - Need to control for month-of-year effects

3. **Rural vs. Urban**
   - Rural areas: fewer treatment options = bigger spike?

4. **Repeat Events**
   - Counties hit multiple times in same year

5. **Geographic Clustering**
   - Do neighboring counties show effects?

---

## Phase 3: Storyboard (Week 2-3)

### Story Structure (Pudding-Style)

**Opening (Hook)**
- Personal story: Houston after Hurricane Harvey
- Before/after photos of a pharmacy/treatment center
- "In the weeks after the storm, everyone counted the immediate deaths. But there was a second wave no one saw coming."

**Section 1: The Pattern (Scrollytelling Map)**
- Animated choropleth map of US
- Major storms light up (red pulse)
- 1-2 months later, overdose rates increase (darker shading)
- Timeline scrubber lets user explore 2015-2023

**Section 2: The Numbers**
- Bar chart: Avg % increase by lag time
- Reveal optimal 2-month lag
- "For every major disaster, we can expect X additional overdose deaths 2 months later"

**Section 3: Why Does This Happen?**
- Infographic showing 3 mechanisms:
  1. **Displacement** → Lost connection to treatment
  2. **Infrastructure** → Pharmacies/clinics destroyed
  3. **Trauma** → Self-medication for PTSD
- Expert quotes from epidemiologists, FEMA officials

**Section 4: Scale of the Problem**
- National map showing cumulative "invisible deaths"
- Calculate: "Between 2015-2023, an estimated X,XXX overdose deaths can be attributed to disaster aftermath"
- Compare to direct storm casualties

**Section 5: What Now?**
- Policy recommendations:
  - FEMA should include addiction services in disaster response
  - Rapid deployment of mobile treatment units
  - Medication-assisted treatment stockpiles
- Interactive county lookup: "Is your county at risk?"

**Closing**
- Personal story resolution
- Methods section (transparency)
- Link to full data/code on GitHub

---

## Phase 4: D3.js Visualization (Week 3-4)

### Visualization 1: Animated Choropleth Map

**Tech Stack**:
- SvelteKit
- D3.js for map rendering
- TopoJSON for US counties
- Scrollama for scroll-triggered animations

**Features**:
- Color scale: overdose death rate (baseline = gray, increase = red gradient)
- Storm events: animated pulses on impact date
- Timeline slider: user can scrub through 2015-2023
- Tooltip on hover: county name, storm details, death stats
- Mobile: stack maps instead of animate

**Data Format**:
```javascript
{
  "counties": {
    "48201": {  // County FIPS
      "name": "Harris County, TX",
      "baseline_rate": 12.5,  // per 100k
      "monthly_rates": [
        {"date": "2017-08-01", "rate": 12.3, "has_storm": false},
        {"date": "2017-09-01", "rate": 18.7, "has_storm": true, "storm_type": "Hurricane"}
      ]
    }
  }
}
```

### Visualization 2: Lag Pattern Explorer

**Interactive Scatter Plot**:
- X-axis: Property damage (log scale)
- Y-axis: % change in overdose deaths
- Color: Storm type (Hurricane=red, Tornado=blue, etc.)
- Size: Direct deaths from storm
- Click bubble → Show county detail panel
- Filter by: storm type, year range, damage threshold

### Visualization 3: Timeline Comparison

**Small Multiples**:
- One panel per major storm (top 20 by damage)
- X-axis: Months before/after storm
- Y-axis: Overdose deaths
- Show spike at 2-month mark
- Highlight baseline period

---

## Phase 5: Production & Polish (Week 4-5)

### SvelteKit Project Structure

```
storm-overdose-story/
├── src/
│   ├── routes/
│   │   └── +page.svelte          # Main story
│   ├── lib/
│   │   ├── components/
│   │   │   ├── MapSection.svelte
│   │   │   ├── ScatterPlot.svelte
│   │   │   ├── Timeline.svelte
│   │   │   └── CountyLookup.svelte
│   │   ├── data/
│   │   │   ├── processed_data.json
│   │   │   └── us-counties-10m.json
│   │   └── utils/
│   │       ├── formatters.js
│   │       └── scales.js
│   └── app.html
├── static/
│   ├── images/
│   └── data/
└── package.json
```

### Copy Writing

- **Tone**: Empathetic but data-driven (Pudding style)
- **Length**: ~1,500 words narrative + visualizations
- **Headlines**: Short, punchy
  - "The Invisible Second Wave"
  - "After the Storm: America's Hidden Overdose Crisis"
- **Captions**: Explanatory, not decorative

### Expert Review

**Reach out to**:
- Public health researchers (opioid crisis experts)
- Disaster epidemiologists
- FEMA officials (for policy section)
- Local journalists who covered major storms

**Questions for them**:
- Does the 2-month lag align with clinical observations?
- Are there other confounding factors we should control for?
- What policy interventions would be most effective?

### Methods Section

**Include**:
- Data sources with links
- Cleaning steps (how we handled suppressed values)
- Analysis methodology (lag calculation)
- Statistical tests and significance levels
- Limitations:
  - Correlation ≠ causation
  - County-level = ecological fallacy
  - Suppressed values in rural areas
  - Can't prove individual deaths caused by storm

### GitHub Repository

```
github.com/keith-gd/storm-overdose-analysis/
├── README.md
├── data/
│   ├── raw/                  # Original downloads (gitignored)
│   ├── processed/            # Cleaned CSVs
│   └── final/                # Analysis results
├── analysis/
│   ├── 01_data_cleaning.py
│   ├── 02_lag_analysis.py
│   └── 03_visualization_data.py
├── notebooks/
│   └── exploratory_analysis.ipynb
└── web/                      # SvelteKit project
```

---

## Launch Strategy (Week 5-6)

### Pre-Launch Checklist

- [ ] All visualizations working on mobile
- [ ] Accessibility check (screen readers, colorblind)
- [ ] Page speed < 3 seconds
- [ ] Social media images (1200×630 for Twitter/Facebook)
- [ ] Press release draft
- [ ] Email pitch to The Pudding, ProPublica, etc.

### Distribution Channels

1. **The Pudding** - Pitch as guest piece
2. **ProPublica** - Disaster reporting angle
3. **FiveThirtyEight** - Data journalism
4. **Hacker News** - Post on Friday afternoon
5. **Reddit** - r/dataisbeautiful, r/visualization
6. **Twitter** - Thread with key findings + visualizations
7. **LinkedIn** - Professional network (public health officials)

### Success Metrics

- **Engagement**: 10K+ unique visitors first week
- **Impact**: Cited in policy discussions, academic papers
- **Portfolio**: Centerpiece for grapht/Claude Code Lens launch
- **Learning**: Master Pudding workflow for future stories

---

## Technical Resources

### Key Libraries

```bash
npm install -D svelte @sveltejs/kit
npm install d3 d3-geo topojson-client
npm install scrollama intersection-observer
npm install layercake  # Svelte + D3 integration
```

### Color Palettes

- **Storms**: `#e74c3c` (red) for major events
- **Overdoses**: Sequential red scale `#fee5d9` → `#a50f15`
- **Baseline**: `#e0e0e0` (light gray)
- **Background**: `#fafafa` (off-white, Pudding style)

### Fonts

- **Headlines**: Canela or Tiempos (if available), else Georgia
- **Body**: National or Proxima Nova, else system fonts
- **Data**: Tabular numbers, monospace for precision

---

## Estimated Timeline

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Data collection & cleaning | Clean datasets, initial analysis |
| 2 | Deep analysis & storyboard | Statistical tests, story outline |
| 3 | D3 prototypes | Working visualizations (matplotlib) |
| 4 | SvelteKit build | Interactive web story |
| 5 | Polish & review | Expert feedback, copy editing |
| 6 | Launch | Published story, press outreach |

---

## Budget (if needed)

- **Domain**: $12/year (stormoverdose.com)
- **Hosting**: $5/month (Vercel/Netlify free tier sufficient)
- **Stock photos**: $0 (use Unsplash)
- **Expert review**: $0 (most will review pro bono for attribution)
- **Total**: < $100

---

## Next Immediate Steps

1. **Download NOAA data** (links above)
2. **Query CDC WONDER** (follow instructions above)
3. **Run initial analysis** (use scripts above)
4. **Share findings with me** - I want to see if the 2-month lag holds!

This is going to be powerful. The combination of:
- Important topic (opioid crisis)
- Novel insight (invisible second wave)
- Beautiful maps (geography × time)
- Policy relevance (FEMA funding)

...makes this perfect for The Pudding's audience AND a killer piece for your grapht portfolio.

Let's make this happen. 🚀
