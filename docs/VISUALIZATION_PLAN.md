# Agent Analytics Dashboard: Visualization Plan

A design-forward approach to building unique, satisfying agentic data visualizations based on our Design Principles.

---

## Current State Assessment

**What exists:**
- Basic D3.js dashboard with summary cards
- GitHub-style activity heatmap
- Cost variance scatter plot
- Sankey flow diagram (session → commits)
- Distribution histograms
- Standard bar/line charts

**What's wrong with it:**
- Generic "tech" styling (purple/indigo gradients)
- Floaty, weightless interactions
- No sense of mass or tactile feedback
- Missing personalization hooks (no "aha" moments)
- No storytelling or progressive disclosure
- Scattered visualizations without a cohesive narrative

---

## Design Philosophy Application

### The "Precise and Weighty" Principle

Every interaction should feel like manipulating a precision instrument:

1. **Weighted Transitions**
   - No instant state changes
   - Elements should ease in/out with mass (ease-out-cubic, 200-300ms)
   - Hover states should feel like pressing a physical button
   - Scroll should have momentum and friction

2. **Tactile Visual Language**
   - Hard shadows instead of soft glows
   - Solid backgrounds instead of glass morphism
   - Borders with actual thickness (2-3px)
   - High contrast (near-black on white, or white on near-black)

3. **Material Inspiration**
   - Think Ferrari gauge cluster, not Stripe dashboard
   - Brushed metal textures for control surfaces
   - Leather-grain patterns for card backgrounds (subtle)
   - Precision instrument bezels around key metrics

---

## Visualization Concepts

### 1. The Command Console (Hero Visualization)

**Inspiration:** Dead Space spine health bar, Alien: Isolation motion tracker

**Concept:** A single, immersive "command console" view that shows your agent activity as if you're monitoring a spacecraft.

**Visual Elements:**
- Central circular gauge showing today's cost vs. budget
- Radial bars around it showing agent activity by type
- Pulse animations when sessions start/end (like a heartbeat)
- Amber/green/red status lighting (no purple!)
- CRT scan-line overlay (subtle, toggleable)

**Interactions:**
- Click gauge segments to drill down
- Drag threshold indicators to set alerts
- Weighted rotation animation on hover

**Data Story:** "You are the commander. This is your mission control."

---

### 2. The Productivity Engine (Mechanical Visualization)

**Inspiration:** Watch movement, engine cutaway diagrams

**Concept:** Show the relationship between input (prompts) → processing (tokens) → output (commits/files) as a mechanical system.

**Visual Elements:**
- Gears that turn based on token throughput
- Flywheel showing cumulative productivity
- Pressure gauges for cost efficiency
- Belt-drive connections between agents
- Physical wear indicators (showing which agents are "overworked")

**Interactions:**
- Click gears to see individual agent details
- Hover to pause animation and inspect
- Drag to "wind" the mechanism back in time

**Data Story:** "Your AI agents are a machine. Understand its moving parts."

---

### 3. The Flow Field (Organic Visualization)

**Inspiration:** Wind maps, particle simulations

**Concept:** Show sessions as particles flowing through your workflow. High-value sessions are larger, errors create turbulence.

**Visual Elements:**
- Particles spawn at session start
- Flow direction shows time progression
- Color intensity shows cost
- Particle trails fade over time
- Confluences where multiple sessions contribute to same commit

**Interactions:**
- Click particles to freeze and inspect
- Drag to create "nets" that capture sessions by criteria
- Scroll to zoom time scale

**Data Story:** "Your work flows like a river. Find the currents."

---

### 4. The Archive Wall (Scrollytelling)

**Inspiration:** The Pudding, museum timeline exhibits

**Concept:** A vertical scroll through your agent history as a narrative journey.

**Sections:**
1. "Your First Session" - personal hook
2. "Your Most Expensive Day" - pattern revelation
3. "Your Favorite Agent" - behavioral insight
4. "Your Biggest Win" - commit with most impact
5. "What's Next" - predictive suggestions

**Visual Elements:**
- Full-bleed images/visualizations per section
- Sticky headers with key stats
- Scroll-triggered animations
- Annotation callouts for key moments

**Interactions:**
- Smooth scroll snapping
- Progress indicator
- Share moments to social

**Data Story:** "This is your story with AI agents."

---

### 5. The Variance Topography (3D Visualization)

**Inspiration:** Terrain maps, thermal imaging

**Concept:** Replace the scatter plot with a terrain map where height = cost, color = efficiency.

**Visual Elements:**
- 3D terrain generated from session data
- Peaks are expensive sessions
- Valleys are efficient sessions
- Color gradient from cool (efficient) to hot (wasteful)
- Contour lines at cost thresholds
- Named "peaks" for outlier sessions

**Interactions:**
- Orbit/rotate the terrain
- Click peaks to see session details
- Toggle between time periods
- Overlay weather (errors = storms)

**Data Story:** "Navigate the landscape of your AI spending."

---

## Implementation Priority

### Phase 1: Foundation (Week 1)
1. New color palette (no purple, high contrast)
2. Typography upgrade (larger, heavier, system fonts)
3. Weighted interaction library (hover, click, transitions)
4. Remove all glass morphism and soft glows
5. Implement dark theme with hard shadows

### Phase 2: Command Console (Weeks 2-3)
1. Central gauge component
2. Radial progress bars
3. Pulse/heartbeat animations
4. Status lighting system
5. Drill-down interactions

### Phase 3: Archive Wall (Weeks 4-5)
1. Scrollama integration
2. Personal data extraction
3. Section designs
4. Scroll animations
5. Share functionality

### Phase 4: Flow Field OR Variance Topography (Weeks 6-8)
- Choose based on user feedback
- Full implementation with interactions

---

## Technical Stack

**Core:**
- D3.js v7 (already in place)
- SvelteKit (migrate from vanilla JS)
- LayerCake (Svelte-D3 integration)
- Scrollama (scroll-driven stories)

**Enhancements:**
- Three.js (for 3D terrain)
- Framer Motion or GSAP (weighted animations)
- Canvas 2D (particle system)

**Performance:**
- WebGL for complex visualizations
- Worker threads for data processing
- Progressive enhancement
- 60fps target

---

## Color Palette

**Primary Palette (no purple!):**
```
Background:     #0f0f0f (near black)
Surface:        #1a1a1a
Border:         #2a2a2a
Text Primary:   #f5f5f5
Text Secondary: #a0a0a0
```

**Status Colors:**
```
Success:   #22c55e (green)
Warning:   #f59e0b (amber)
Error:     #ef4444 (red)
Info:      #3b82f6 (blue)
```

**Agent Colors:**
```
Claude Code:    #3b82f6 (blue)
Cursor:         #22c55e (green)
Copilot:        #f59e0b (amber)
Factory Droid:  #ef4444 (red)
```

**Accent (use sparingly):**
```
Highlight:  #fbbf24 (gold - for "aha" moments)
```

---

## Typography

```css
body {
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Monaco, monospace;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.6;
}

h1 { font-size: 32px; font-weight: 700; }
h2 { font-size: 24px; font-weight: 600; }
h3 { font-size: 18px; font-weight: 600; }

.metric { font-size: 48px; font-weight: 700; font-variant-numeric: tabular-nums; }
.label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
```

---

## Interaction Library

**Hover States:**
```css
.interactive {
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.interactive:hover {
  transform: scale(1.02) translateY(-2px);
}
.interactive:active {
  transform: scale(0.98);
  transition: transform 50ms;
}
```

**Button Press:**
- Scale down to 0.95 on press
- Hard shadow moves from 4px to 1px
- Background lightens slightly
- Release bounces back with overshoot

**Card Hover:**
- Border thickens from 1px to 2px
- Subtle inner glow (not outer)
- Content shifts up 2px
- Shadow deepens

**Chart Interactions:**
- Data points scale up 1.5x on hover
- Connected elements highlight
- Unrelated elements fade to 50%
- Tooltip follows cursor with momentum

---

## Success Metrics

1. **First Impression:** User says "wow" or "cool" within 5 seconds
2. **Engagement:** Average session > 3 minutes (vs current unknown)
3. **Insight Generation:** User discovers something new in first visit
4. **Share Rate:** Users share their "Archive Wall" stories
5. **Return Rate:** Users come back to check metrics daily

---

## Anti-Patterns to Avoid

1. Purple/cyan gradients (AI aesthetic cliche)
2. Glass morphism / frosted glass
3. Outer glows and halos
4. Thin fonts under 14px
5. Low contrast text
6. Generic dashboard templates
7. Unnecessary 3D effects
8. Animations without purpose
9. Hover effects that don't feel physical
10. Loading spinners (use skeleton states)

---

## Next Steps

1. [ ] Review this plan and provide feedback
2. [ ] Choose Phase 1 starting point
3. [ ] Create component library branch
4. [ ] Build weighted interaction primitives
5. [ ] Design Command Console in Figma/code
6. [ ] User test with 3 developers

---

*This plan follows our Design Principles: precise and weighty, not floaty and generic.*
