# grapht Consolidation Plan

## Overview

Consolidate storm_overdose exploration into grapht as a "data story" while establishing grapht as both:
1. **Agent Analytics Platform** (existing)
2. **Data Visualization Showcase** (new)

---

## Step 1: Create New Directory Structure

```bash
cd ~/git-repos/grapht

# Create design docs folder
mkdir -p docs/design

# Create viz component library
mkdir -p viz/src/lib/components
mkdir -p viz/src/lib/actions
mkdir -p viz/src/lib/utils
mkdir -p viz/src/routes/stories/storm-overdose

# Create data stories folder
mkdir -p data-stories/storm-overdose/analysis
mkdir -p data-stories/storm-overdose/data/raw
mkdir -p data-stories/storm-overdose/data/processed

# Create tools folder for dataset discovery
mkdir -p tools/dataset-discovery/src
```

---

## Step 2: Move storm_overdose Content

```bash
# Copy analysis scripts
cp ~/git-repos/storm_overdose/analyze_real_data.py data-stories/storm-overdose/analysis/
cp ~/git-repos/storm_overdose/find_storm_urls.py data-stories/storm-overdose/analysis/
cp ~/git-repos/storm_overdose/requirements.txt data-stories/storm-overdose/analysis/

# Copy data files
cp -r ~/git-repos/storm_overdose/data/* data-stories/storm-overdose/data/

# Copy documentation
cp ~/git-repos/storm_overdose/files/PRODUCTION_ROADMAP.md data-stories/storm-overdose/
```

---

## Step 3: Create Design Principles Doc

Create `docs/design/DESIGN_PRINCIPLES.md`:

```markdown
# grapht Design Principles

## Philosophy

grapht visualizations should feel **precise and weighty** — like a luxury instrument panel, not a generic dashboard. We draw inspiration from:

- **Swiss design**: Grid systems, clean typography, purposeful whitespace
- **Japanese minimalism**: Restraint, meaningful detail, craft
- **Luxury automotive**: Precision gauges, tactile feedback, premium materials
- **The Pudding**: Scrollytelling, personal entry points, data journalism

## Core Principles

### 1. Craftsmanship Over Utility
We're not building enterprise dashboards. We're building tools for developers who notice details and appreciate quality.

### 2. Meaningful Interactivity
Every interactive element must earn its place. If scrolling, hovering, or clicking doesn't reveal something valuable, remove it.

### 3. Personal Entry Points
Give users a stake in the data. Start with their context (their usage, their county, their timeframe).

### 4. Progressive Disclosure
Start simple. Add complexity as users scroll/explore. Reserve full interactivity for the end.

### 5. Methods Transparency
Show your work. Link to code. Explain limitations. Build trust.

## Visual Language

### Typography
- **Headlines**: Serif (Canela, Tiempos, or Georgia)
- **Body**: Sans-serif (National, Proxima Nova, or system)
- **Data**: Tabular figures, monospace for precision

### Color
- **Primary palette**: Muted, sophisticated (not primary colors)
- **Accent**: Single highlight color for emphasis
- **Data encoding**: Sequential scales for magnitude, diverging for comparison
- **Accessibility**: Test with colorblind simulators

### Animation
- **Purpose**: Reveal relationships, guide attention
- **Timing**: 300-500ms for most transitions
- **Easing**: ease-out for entrances, ease-in for exits
- **Respect preferences**: Honor prefers-reduced-motion

### Layout
- **Grid**: 12-column responsive grid
- **Whitespace**: Generous margins (40px+ on desktop)
- **Mobile**: Design mobile-first, then enhance for desktop

## Anti-Patterns

❌ Rainbow color schemes
❌ Unnecessary 3D effects
❌ Chartjunk (decorative gridlines, excessive labels)
❌ Animation for animation's sake
❌ Tooltips as crutch for bad design
❌ Dashboard fatigue (too many charts competing)

## Inspiration Sources

- The Pudding (https://pudding.cool)
- Flowing Data (https://flowingdata.com)
- Reuters Graphics (https://graphics.reuters.com)
- NYT Graphics (https://www.nytimes.com/spotlight/graphics)
- Information is Beautiful (https://informationisbeautiful.net)
```

---

## Step 4: Create Dataset Discovery Tool Spec

Create `tools/dataset-discovery/README.md`:

```markdown
# Dataset Discovery Tool

A curated catalog of government datasets with AI-powered collision suggestions.

## Problem

Data.gov has 300K+ datasets but terrible discoverability. Researchers waste hours finding compatible datasets for interesting analyses.

## Solution

A modern, searchable catalog that:
1. Curates high-value datasets across domains
2. Shows quick preview metadata (granularity, date range, join keys)
3. Suggests "collision" hypotheses (Dataset A × Dataset B = interesting story)
4. Links to examples of published stories using each dataset

## Features

### MVP (Week 1)
- [ ] 50 curated datasets across 6 categories
- [ ] Accordion UI with search (like Shaffer's Tableau guide)
- [ ] Preview cards with metadata
- [ ] 3 pre-generated collision ideas per dataset

### Phase 2 (Week 2-3)
- [ ] Claude-powered "Generate collision idea" button
- [ ] Download helpers (direct links, API snippets)
- [ ] "Used In" examples from published stories
- [ ] User submissions

## Categories

1. **Health & Mortality** (CDC WONDER, BRFSS, etc.)
2. **Weather & Climate** (NOAA SWDI, Storm Events, etc.)
3. **Crime & Justice** (FBI UCR, NIBRS, etc.)
4. **Economics & Labor** (BLS, Census ACS, etc.)
5. **Demographics** (Census, ACS, etc.)
6. **Environment** (EPA, USGS, etc.)

## Tech Stack

- SvelteKit (static site)
- Fuse.js for client-side search
- CSS transitions for accordion
- Static JSON for dataset catalog
```

---

## Step 5: Create Initial Dataset Catalog

Create `tools/dataset-discovery/datasets.json`:

```json
{
  "categories": [
    {
      "id": "health",
      "name": "Health & Mortality",
      "icon": "🏥",
      "datasets": [
        {
          "id": "cdc-wonder-overdose",
          "title": "CDC WONDER: Drug Overdose Deaths",
          "source": "CDC/NCHS",
          "url": "https://wonder.cdc.gov/mcd.html",
          "description": "County-level drug overdose deaths by month, 1999-2023",
          "granularity": ["county", "monthly"],
          "years": [1999, 2023],
          "join_key": "county_fips",
          "download": "manual",
          "collisions": [
            {
              "with": "noaa-storm-events",
              "hypothesis": "Do opioid deaths spike 1-6 months after major disasters?"
            },
            {
              "with": "census-migration",
              "hypothesis": "Does population churn correlate with overdose rates?"
            },
            {
              "with": "bls-unemployment",
              "hypothesis": "Economic despair → addiction pathway"
            }
          ]
        },
        {
          "id": "cdc-wonder-mortality",
          "title": "CDC WONDER: Underlying Cause of Death",
          "source": "CDC/NCHS",
          "url": "https://wonder.cdc.gov/ucd-icd10.html",
          "description": "All-cause mortality by county, 1999-2020",
          "granularity": ["county", "yearly"],
          "years": [1999, 2020],
          "join_key": "county_fips",
          "download": "manual"
        }
      ]
    },
    {
      "id": "weather",
      "name": "Weather & Climate",
      "icon": "🌪️",
      "datasets": [
        {
          "id": "noaa-storm-events",
          "title": "NOAA Storm Events Database",
          "source": "NOAA/NCEI",
          "url": "https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/",
          "description": "Tornadoes, floods, hurricanes with damage/casualty data, 1950-present",
          "granularity": ["event", "county"],
          "years": [1950, 2024],
          "join_key": "state_fips + cz_fips",
          "download": "direct_csv",
          "collisions": [
            {
              "with": "cdc-wonder-overdose",
              "hypothesis": "Invisible second wave of deaths after disasters"
            },
            {
              "with": "fbi-ucr-crime",
              "hypothesis": "Does crime spike after weather disasters?"
            }
          ]
        },
        {
          "id": "noaa-climate-normals",
          "title": "NOAA Daily Climate Normals",
          "source": "NOAA/NCEI",
          "url": "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals",
          "description": "30-year average temperatures by station",
          "granularity": ["station", "daily"],
          "years": [1991, 2020],
          "join_key": "station_id",
          "download": "api"
        }
      ]
    },
    {
      "id": "crime",
      "name": "Crime & Justice",
      "icon": "⚖️",
      "datasets": [
        {
          "id": "fbi-ucr-crime",
          "title": "FBI Uniform Crime Reports",
          "source": "FBI",
          "url": "https://cde.ucr.cjis.gov/",
          "description": "County-level crime rates by type, 1979-present",
          "granularity": ["county", "yearly"],
          "years": [1979, 2023],
          "join_key": "county_fips",
          "download": "api",
          "collisions": [
            {
              "with": "epa-heat-waves",
              "hypothesis": "Temperature-crime threshold analysis"
            },
            {
              "with": "noaa-climate-normals",
              "hypothesis": "Unseasonable weather → crime deviation"
            }
          ]
        }
      ]
    },
    {
      "id": "economics",
      "name": "Economics & Labor",
      "icon": "💼",
      "datasets": [
        {
          "id": "bls-unemployment",
          "title": "BLS Local Area Unemployment",
          "source": "BLS",
          "url": "https://www.bls.gov/lau/",
          "description": "County-level unemployment rates, monthly",
          "granularity": ["county", "monthly"],
          "years": [1990, 2024],
          "join_key": "county_fips",
          "download": "api"
        }
      ]
    }
  ]
}
```

---

## Step 6: Initialize SvelteKit Projects

```bash
# Initialize viz component library
cd viz
npm create svelte@latest . -- --template skeleton --typescript
npm install d3 d3-geo d3-scale d3-shape d3-array topojson-client
npm install -D @sveltejs/adapter-static

# Initialize dataset discovery tool
cd ../tools/dataset-discovery
npm create svelte@latest . -- --template skeleton --typescript
npm install fuse.js
npm install -D @sveltejs/adapter-static
```

---

## Step 7: Update Main README

Add to grapht README.md:

```markdown
## 🎨 Visualization Showcase

In addition to the agent analytics platform, grapht includes a component library and data stories demonstrating beautiful data visualization.

### Component Library (`/viz`)
Reusable Svelte + D3 components for:
- Scrollytelling
- Choropleth maps
- Timeline visualizations
- Interactive charts

### Data Stories (`/data-stories`)
In-depth data journalism pieces:
- **Storm × Overdose**: Do opioid deaths spike after weather disasters?
- *(more coming)*

### Dataset Discovery (`/tools/dataset-discovery`)
A curated catalog of government datasets with AI-powered collision suggestions.

## 📖 Design System

See `/docs/design/` for:
- `DESIGN_PRINCIPLES.md` - Our visual philosophy
- `PUDDING_REFERENCE.md` - Techniques from The Pudding
- `RESOURCES.md` - Curated design resources
```

---

## Execution Checklist

For Claude Code in Cursor, execute in order:

1. [ ] Create directory structure (Step 1)
2. [ ] Move storm_overdose files (Step 2)
3. [ ] Create DESIGN_PRINCIPLES.md (Step 3)
4. [ ] Create dataset-discovery README (Step 4)
5. [ ] Create datasets.json (Step 5)
6. [ ] Initialize SvelteKit projects (Step 6)
7. [ ] Update main README (Step 7)
8. [ ] Copy The Pudding reference doc to docs/design/PUDDING_REFERENCE.md
9. [ ] Git commit: "feat: consolidate viz showcase and data stories into grapht"

---

## Next Steps After Consolidation

1. **Finish storm-overdose analysis** with real NOAA + CDC data
2. **Build first D3 component** (Choropleth with time slider)
3. **Create dataset discovery UI** (accordion + search)
4. **Add 50 curated datasets** to catalog
5. **Generate collision hypotheses** for each dataset pair
