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
