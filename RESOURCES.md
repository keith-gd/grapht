# Resources

Master resource library for all data work: grapht, government data viz, enterprise semantic layer, career content.

Tags: `#viz` `#dbt` `#ai-tools` `#gov-data` `#design` `#engineering` `#career`

For philosophy and rules, see `DESIGN_PRINCIPLES.md`.

---

## Design Inspiration

### UI/UX Articles
- **[10 UI Design Principles](https://x.com/kieranklaassen/status/1992350089118183433)** - Fewer colors, larger fonts, whitespace, system fonts, high contrast
- **[Avoiding AI Slop Design](https://x.com/mengto/status/1992213336205951143)** - Swiss design, Japanese minimalism, Apple's design system

### Physical Material Inspiration
Study these for "precise and weighty" texture:
- Fine leather goods - grain patterns, natural texture
- Wood furniture - visible grain, solid construction
- Precision instruments - weighted controls, smooth movement
- Luxury automotive dashboards - Ferrari, Lamborghini, Rolls Royce

### Game UI Inspiration
**Diegetic UI (integrated into world):**
- Dead Space - health bar on spine, holographic inventory
- Metro series - watch-based UI, physical map checking
- Alien: Isolation - motion tracker, chunky 70s-futurism

**Weighted interactions:**
- Destiny (Bungie) - legendary weapon feel, "30 seconds of fun"
- DOOM (2016/Eternal) - snappy but weighted weapon switching
- Ghost of Tsushima - Guiding Wind, natural minimalism

**Data visualization in games:**
- Hitman 3 - sophisticated mission briefing overlays
- Watch Dogs 2 - grounded cyberpunk hacking visuals
- The Division - military-grade holographic interfaces

---

## Data Storytelling

### The Pudding
**Process Guides:**
- [How to Make Dope Shit Part 1](https://pudding.cool/process/how-to-make-dope-shit-part-1/)
- [How to Make Dope Shit Part 2](https://pudding.cool/process/how-to-make-dope-shit-part-2/)
- [How to Make Dope Shit Part 3](https://pudding.cool/process/how-to-make-dope-shit-part-3/)
- [Scrollytelling Implementation](https://pudding.cool/process/how-to-implement-scrollytelling/)
- [Responsive Scrollytelling](https://pudding.cool/process/responsive-scrollytelling/)

**GitHub Repos:**
- [Svelte Starter](https://github.com/the-pudding/svelte-starter)
- [Love Songs](https://github.com/the-pudding/pop-love-songs)
- [Svelte Templates](https://github.com/the-pudding/svelte-templates)
- [Data Sets](https://github.com/the-pudding/data)

---

## Frontend Libraries

### Visualization
- **[D3.js](https://d3js.org/)** - Custom data visualizations
- **[LayerCake](https://layercake.graphics/)** - Svelte-D3 integration
- **[Scrollama](https://github.com/russellgoldenberg/scrollama)** - Scroll-driven storytelling
- **[SvelteKit](https://kit.svelte.dev/)** - Production framework

### Animation & Components
- **[aura.build](https://aura.build)** - High-quality animated components
  - [nebula.aura.build](https://nebula.aura.build)
  - [sakura.aura.build](https://sakura.aura.build)
  - [aura.build/components](https://aura.build/components)
- **[codepen.io](https://codepen.io)** - Component examples and animations
- **[21st.dev](https://21st.dev)** - Modern component library
- **[uiverse.io](https://uiverse.io)** - UI elements and animations

### React Utilities
- **[aitmpl.com/hooks](https://aitmpl.com/hooks)** - Ready-to-use hooks collection ([source](https://x.com/dani_avila7/status/1992271574729363928))

---

## Technical Stack

### Observability
- **[Arize Phoenix](https://github.com/Arize-ai/phoenix)** - OpenTelemetry instrumentation patterns
  - `openinference-instrumentation-anthropic` for Claude Code OTEL collection

### Data Transformation
- **dbt** - Data transformation pipelines
- **Docker** - Containerized development environment

### Image Generation
- **[Nano Banana (Gemini) Skill](https://github.com/EveryInc/every-marketplace/tree/d44804fc39d60bb7914d971cc90bdb98e3b3e710/plugins/compounding-engineering/skills/gemini-imagegen)** - Visual assets and mockups
  - Excellent for cartography - hand-drawn maps from satellite imagery ([example](https://x.com/bilawalsidhu/status/1991635734546284703))
- **[Consistent Hero Images Workflow](https://open.substack.com/pub/jennyouyang/p/how-i-create-consistent-hero-images-and-why-i-havent-switched-to-nanobanana)** (Jenny Ouyang) - Process for creating consistent image assets

---

## AI/LLM Tools

- **[LLM Council](https://github.com/karpathy/llm-council)** (Karpathy) - Query multiple LLMs, compare responses
- **[Agentic Data Scientist](https://github.com/K-Dense-AI/agentic-data-scientist)** - AI hypothesis testing ([source](https://x.com/k_dense_ai/status/1991884557021499859))
- **[CodeWiki](https://github.com/FSoft-AI4Code/CodeWiki/)** - AI-generated documentation for large codebases
- **[OpenMemory](https://github.com/CaviraOSS/OpenMemory/)** - Long-term memory for AI agents

---

## Context & Workflow

- **[Filesystems for Context Engineering](https://blog.langchain.com/how-agents-can-use-filesystems-for-context-engineering/)** (LangChain)
- **[ThinkDashboard](https://github.com/MatiasDesuu/ThinkDashboard/)** - Bookmark dashboard

---

## Enterprise / Day Job

*Resources for agentic dbt pipeline + semantic layer development environment*

### Data Catalog & Governance
- **[DataHub](https://datahub.com/)** - Metadata platform, data catalog, AI-ready context management

---

## Government Data `#gov-data`

*For data catalog and collision hypothesis projects*

### Data Sources
- **[NOAA Storm Events Database](https://www.ncdc.noaa.gov/stormevents/)** - Storm data by county, direct download
- **[CDC WONDER](https://wonder.cdc.gov/)** - Mortality data including opioid deaths, county-level
- **[data.gov](https://data.gov/)** - 300k+ datasets (poor discoverability - opportunity for Dataset Discovery Assistant)

### Collision Hypotheses (from past analysis)
Promising correlations to explore:
- Storms × Opioid deaths (2-month lag hypothesis)
- Climate deviation × Crime patterns
- Air quality × Assault rates
- Drought duration × Suicide rates in agricultural areas

### Reference: Organizing Large Link Libraries
- **[Jeffrey Shaffer's Tableau Reference Guide](https://www.intotableaudata.com/)** - Good model for accordion-style organization with categories

---

## Engineering

- **[Every Engineering Skill Explained](https://x.com/kieranklaassen/status/1992349643607617924)** - Fundamental engineering competencies

---

## To Be Categorized

*New resources added here before filing into sections*

---

## Career Content Analysis `#career`

*Reddit data subreddit analysis for editorial decisions*

### Target Subreddits
- r/datascience
- r/dataengineering
- r/BusinessIntelligence

### Key Findings (from past analysis)
- Career advice dominates (~40% of posts)
- Largest segments: career changers, mid-career feeling stalled
- Technical help/tools: ~24%
- Potential for animated bar chart race showing topic trends over time

### Tools Used
- **PRAW** - Python Reddit API Wrapper
- **Anthropic API** - For content classification into categories

---

## Related Documents
- `DESIGN_PRINCIPLES.md` - Philosophy, rules, checklists
- `README.md` - Project overview
- `__The_Pudding__Techniques__Tools___Best_Practices` - Detailed Pudding analysis