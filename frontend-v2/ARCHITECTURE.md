# frontend-v2 Architecture

SvelteKit 2 + Svelte 5 application for grapht visualization showcase.

## Quick Start

```bash
cd frontend-v2
npm install
npm run dev -- --port 5174
```

Open http://localhost:5174

## File Structure

```
frontend-v2/
├── src/
│   ├── app.html                 # HTML template
│   ├── app.d.ts                 # Global types
│   ├── routes/
│   │   ├── +layout.svelte       # Root layout (imports design system)
│   │   ├── +page.svelte         # Landing page (/)
│   │   ├── archive/
│   │   │   └── +page.svelte     # Scrollytelling analytics story (/archive)
│   │   ├── datasets/
│   │   │   └── +page.svelte     # Dataset discovery catalog (/datasets)
│   │   └── flow/
│   │       └── +page.svelte     # Particle flow visualization (/flow)
│   └── lib/
│       ├── index.ts             # Component & store exports
│       ├── components/
│       │   ├── ScrollSection.svelte
│       │   ├── ArchiveMetric.svelte
│       │   ├── DatasetAccordion.svelte
│       │   ├── DatasetCard.svelte
│       │   └── CollisionChip.svelte
│       ├── stores/
│       │   └── archiveData.ts   # Svelte stores for archive page
│       ├── data/
│       │   └── datasets.json    # Dataset catalog
│       ├── styles/
│       │   └── design-system.css
│       └── assets/
│           └── favicon.svg
├── static/
│   └── robots.txt
├── package.json
├── svelte.config.js
├── vite.config.ts
└── tsconfig.json
```

## Routes

### `/` - Landing Page
Hero with tagline, CTA buttons to /archive and /datasets, feature grid.

### `/archive` - Archive Wall
Scrollytelling page showing user's agent analytics story:
- First session date
- Most expensive day
- Favorite agent
- Biggest win
- Total stats

**Data source:** Fetches from `http://localhost:3000/api/analytics/archive/summary`

### `/datasets` - Dataset Discovery
Searchable catalog of government datasets with collision hypotheses.
- Accordion UI by category
- Fuse.js client-side search
- Auto-expands matching categories

**Data source:** Static JSON at `$lib/data/datasets.json`

### `/flow` - Flow Field
Canvas-based particle visualization of agent sessions.
- Particles = sessions
- X = time, Y = hour of day
- Size = cost
- Color = agent type

**Data source:** Fetches from `http://localhost:3000/api/analytics/tempo`

## Components

### ScrollSection
Scrollytelling section wrapper with fade-in animation.

```svelte
<ScrollSection theme="dark|blue|green|amber|red" align="center|left|right">
  <content />
</ScrollSection>
```

**Props:**
- `theme`: Background color theme (default: "dark")
- `align`: Content alignment (default: "center")

### ArchiveMetric
Animated counting number display.

```svelte
<ArchiveMetric value={1234} prefix="$" suffix="K" color="blue" duration={1000} />
```

**Props:**
- `value`: Number to display
- `prefix`: Text before number (e.g., "$")
- `suffix`: Text after number (e.g., "K")
- `color`: "blue" | "green" | "amber" | "red" | "highlight"
- `duration`: Animation duration in ms (default: 1000)

### DatasetAccordion
Expandable category container for datasets.

```svelte
<DatasetAccordion
  {category}
  bind:expanded={isExpanded}
  highlightedDatasets={matchedIds}
/>
```

**Props:**
- `category`: `{ id, name, icon, datasets[] }`
- `expanded`: Boolean (bindable)
- `highlightedDatasets`: `Set<string>` of dataset IDs to highlight

### DatasetCard
Individual dataset display with metadata and collisions.

```svelte
<DatasetCard {dataset} highlighted={false} />
```

**Props:**
- `dataset`: Dataset object (see types below)
- `highlighted`: Boolean for search highlight styling

### CollisionChip
Displays a collision hypothesis between datasets.

```svelte
<CollisionChip collision={{ with: "dataset-id", hypothesis: "..." }} />
```

**Props:**
- `collision`: `{ with: string, hypothesis: string }`

## Data Types

```typescript
interface Dataset {
  id: string;
  title: string;
  source: string;
  url: string;
  description: string;
  granularity: string[];      // e.g., ["county", "monthly"]
  years: [number, number];    // e.g., [1999, 2023]
  join_key: string;           // e.g., "county_fips"
  download: "manual" | "direct_csv" | "api";
  collisions: Array<{
    with: string;             // target dataset ID
    hypothesis: string;       // research question
  }>;
}

interface Category {
  id: string;
  name: string;
  icon: string;               // emoji
  datasets: Dataset[];
}
```

## Design System

CSS custom properties defined in `src/lib/styles/design-system.css`.

### Colors

```css
/* Backgrounds */
--color-bg: #0f0f0f;          /* Near black */
--color-surface: #1a1a1a;
--color-border: #2a2a2a;

/* Text */
--color-text: #f5f5f5;        /* High contrast white */
--color-text-secondary: #a0a0a0;
--color-text-muted: #666666;

/* Primary palette (NO PURPLE) */
--color-blue: #3b82f6;
--color-green: #22c55e;
--color-amber: #f59e0b;
--color-red: #ef4444;
--color-highlight: #fbbf24;   /* Gold, use sparingly */

/* Agent colors */
--color-agent-claude: var(--color-blue);
--color-agent-cursor: var(--color-green);
--color-agent-copilot: var(--color-amber);
--color-agent-factory: var(--color-red);
```

### Typography

```css
--font-mono: 'SFMono-Regular', Monaco, Menlo, Consolas, monospace;
--font-size-xs: 12px;
--font-size-sm: 14px;
--font-size-base: 16px;
--font-size-lg: 20px;
--font-size-xl: 24px;
--font-size-2xl: 32px;
--font-weight-normal: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### Spacing

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
```

### Transitions

```css
--transition-fast: 100ms;
--transition-normal: 200ms;
--transition-slow: 300ms;
```

## Stores

### archiveData.ts

```typescript
import { archiveStore, isLoading, archiveError, archiveSummary } from '$lib';

// Trigger data fetch
archiveStore.fetchSummary();

// Use in components
$isLoading    // boolean
$archiveError // string | null
$archiveSummary // ArchiveSummary | null
```

## API Dependencies

The /archive and /flow routes require the backend API running:

```bash
cd ../backend
docker-compose up -d
# or
node api/index.js
```

**Endpoints:**
- `GET http://localhost:3000/api/analytics/archive/summary`
- `GET http://localhost:3000/api/analytics/tempo`

Auth: `Bearer dev_local_key` header

## Svelte 5 Patterns

This project uses Svelte 5 runes syntax:

```svelte
<script lang="ts">
  // Props (replaces export let)
  let { value, optional = 'default' } = $props();

  // Bindable props
  let { expanded = $bindable(false) } = $props();

  // Reactive state
  let count = $state(0);

  // Derived values
  let doubled = $derived(count * 2);

  // Complex derived
  let filtered = $derived.by(() => {
    return items.filter(i => i.active);
  });

  // Effects
  $effect(() => {
    console.log('count changed:', count);
  });
</script>
```

## Debugging Tips

1. **Component not rendering:** Check browser console for hydration errors
2. **Styles not applying:** Verify design-system.css is imported in +layout.svelte
3. **Data not loading:** Check Network tab for API calls, verify backend is running
4. **Search not working:** Fuse.js threshold (0.4) may be too strict/loose
5. **Accordion animation janky:** Check `prefers-reduced-motion` media query

## Build & Deploy

```bash
npm run build     # Production build
npm run preview   # Preview production build locally
```

Uses `@sveltejs/adapter-auto` - will auto-detect deployment target.
