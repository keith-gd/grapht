# The Pudding: Techniques, Tools & Best Practices

## Executive Summary

This document compiles techniques, tools, and methodologies from The Pudding's visual essays, including their self-evaluation of Claude's performance on their workflow. This serves as a roadmap for Claude Code Lens development.

---

## Part 1: The Pudding's 4-Phase Workflow

From their AI evaluation article, The Pudding breaks story creation into these phases:

### Phase 1: Idea Generation
**What they do:**
- Generate story pitches answering 7 key questions:
  1. What is your story about? (elevator pitch)
  2. One-sentence summary of your single point (not a question)
  3. Why is it exciting to you personally?
  4. What makes it interesting/sets it apart?
  5. What's the "aha" moment or surprising element?
  6. Feasible data sources?
  7. Core visual ideas (what would you draw on a whiteboard?)

**Critical insight:** Ideas need specific entry points and clear points—not just topics. AI struggled here because it produced "safe choices, nothing that blew minds."

### Phase 2: Data Collection & Analysis
**What they do:**
- Write Python scripts to scrape/collect data
- Clean and process data (handle edge cases like multiple artists)
- Run sentiment/emotion analysis
- Generate summary statistics

**Critical insight:** "Claude did the bare minimum, strictly following its prompts." The human effort to fix edge cases and produce comprehensive coverage takes days. AI is "satisfied" with whatever it generates—critical thinking falls to the user.

### Phase 3: Storyboard & Prototyping
**What they do:**
- Create outline with discrete sections
- Specify what data/chart types per section
- Use Python (matplotlib) for quick chart prototypes
- Iterate extensively on this step

**Critical insight:** "The big difference from our process is the lack of iteration. As humans, we would typically iterate a lot on this step, and that's what takes things from good to great."

### Phase 4: Development & Writing
**What they do:**
- Use SvelteKit for production
- Create Svelte components
- Implement D3.js charts
- Write accompanying narrative

**Critical insight:** AI produced code quickly but struggled with complex tasks. Required expert guidance for complicated charts. "Whack-a-mole"—fixing one thing breaks another.

---

## Part 2: Technical Stack

### Core Framework
- **SvelteKit** (Svelte 5) - Primary framework
- **Static-site rendering** - SSR builds by default
- **ArchieML** - Micro-CMS powered by Google Docs/Sheets
- **Style Dictionary** - CSS/JS variable parity

### Visualization Libraries
- **D3.js** - Primary charting library (d3-fetch, d3-scale, d3-shape, d3-array, d3-time-format)
- **LayerCake** - Svelte chart wrapper (must be installed separately)
- **Lucide Icons** - SVG icons

### Key Helper Components
From their `svelte-starter` template:

**Scrollytelling:**
- `Scrolly.svelte` - Core scrollytelling component

**Interaction:**
- `Slider.svelte` / `Slider.Slide.svelte` - Swipe/slide stories
- `Tap.svelte` - Edge-of-screen tapping
- `Range.svelte` - Customizable slider
- `Toggle.svelte` - Accessible toggle inputs
- `ButtonSet.svelte` - Accessible button groups

**Utilities:**
- `MotionToggle.svelte` - User motion preference toggle
- `DarkModeToggle.svelte` - Dark mode toggle
- `Figure.svelte` - Chart figure wrapper
- `SortTable.svelte` - Sortable semantic table

### Svelte Actions (src/actions)
- `inView.js` - Viewport enter/exit detection
- `resize.js` - Element resize detection
- `checkOverlap.js` - Label overlap detection
- `focusTrap.js` - Modal/menu focus trap
- `keepWithinBox.js` - Keep elements within parent

### Runes/Stores
- `useWindowDimensions` - Viewport dimensions (debounced)
- `useClipboard` - Copy to clipboard
- `useFetcher` - Async data loading
- `useWindowFocus` - Window focus state

### Utility Functions
- `checkScrollDir.js` - User scroll direction
- `csvDownload.js` - Convert data to CSV for download
- `loadCsv/loadJson.js` - Data loading
- `urlParams.js` - URL parameter management
- `transformSvg.js` - SVG transform transitions

---

## Part 3: Story-Specific Techniques

### Democracy Story (Congressional Record Analysis)
**Data approach:**
- Downloaded Congressional Records 1873-2017 from Stanford University project
- Used congressional parser for recent records
- LLM analysis (Gemini) for sentiment classification

**Classification prompt structure:**
```
For each speech, analyze 200 words before/after "democracy" mention.
Categorize as:
- threat_foreign_actor
- threat_systemic_policy
- threat_excluded_demographic
- not_threat
```

**Visual techniques:**
- Dot visualization (each dot = 5 speeches)
- Brightness indicates "threat to democracy" speeches
- Timeline with era annotations
- Percentage charts by Congress
- Curated speech excerpts on click

**Editorial approach:**
- Historical narrative structure
- Expert sources (books by historians)
- Personal reflection in conclusion
- Methods transparency at end

---

### Onions Story (Mathematical Optimization)
**Data approach:**
- Mathematical modeling of onion cross-sections
- Calculated standard deviation for piece size uniformity
- Tested 19,320 combinations of variables

**Visual techniques:**
- Interactive onion cross-section diagrams
- Slider controls to adjust cut parameters
- Exploded view toggle
- Side-by-side comparison tables
- Custom letter styling using onion imagery

**Editorial approach:**
- Start with relatable question (how to dice an onion)
- Progressively introduce complexity
- Expert quotes (Kenji López-Alt) for grounding
- Humorous conclusion acknowledging impracticality

**Key insight:** Strong use of relative standard deviation as unitless comparison metric.

---

### Love Songs Story (Billboard Analysis)
**Data approach:**
- 5,141 Billboard Top 10 hits (1958-2023)
- GPT classification into love song subtypes
- Custom taxonomy development

**Love song subtypes:**
1. Serenade - mutual love
2. Heartache - unrequited/lost love
3. Pursuit - courting stage
4. It's Complicated - ambiguous relationships
5. Good Riddance - post-breakup empowerment
6. Sexual Confidence - prowess-focused
7. Love Song for the Self - self-affirmation

**GPT prompt structure:**
```
You are an expert pop music critic...
For each Billboard Top 10 hit in [song, performer]:
Return [performer, song, justification, love_song_subtype_label]
```

**Visual techniques:**
- Bubble visualization by year
- Color-coded subtypes
- Animated transitions
- Interactive filtering

**Editorial approach:**
- Framed as rebuttal to "Boomer Bob" narrative
- Data reveals transformation, not death

---

### Sitters & Standers Story (Occupational Analysis)
**Data source:**
- BLS Occupational Requirements Survey

**Visual techniques:**
- Scatterplot of all occupations
- User positioning via survey at start
- Dynamic filtering by various metrics
- Annotations linking to historical context

**Variables analyzed:**
- Sitting vs. standing time
- Bachelor's degree requirement
- Income levels
- Problem-solving frequency
- Autonomy (pause work at will)
- Remote work options
- Demographic breakdowns (race)

**Editorial approach:**
- Personal story as entry point (author's parents' dry cleaning business)
- Historical labor context
- Socioeconomic implications
- Allows user exploration at end

---

## Part 4: Scrollytelling Best Practices

### When to Use Scrollytelling
**Good for:**
- Transitions that are meaningful (not just flashy)
- Change over time visualization
- Spatial movement
- Single chart with state changes

**Alternatives:**
- Stacked charts (better for standalone comprehension)
- Step-by-step approach (for smaller stories)
- Stepper (click-through) - generally avoid
- Swipe/tap - overrides browser behavior

### Implementation Principles

**Mobile considerations:**
- Plan mobile from the start
- Options: keep scrolly OR stack charts
- Stack if: performance suffers, charts work standalone, different chart type needed
- Test on actual devices

**Code architecture:**
- Be explicit about visual state at EACH step
- Users scroll quickly—can't rely on previous animations
- Each step must trigger all necessary state changes

**Technical challenges:**
- Many transitions = browser rendering load
- Different viewport heights (mobile/desktop)
- Iteration takes longer than expected

### Scrollama.js
The Pudding created this library specifically for scrollytelling:
- Simple interface for scroll-driven interactives
- Handles enter/exit events
- Offset configuration
- Direction detection

---

## Part 5: AI Evaluation Scorecard

The Pudding graded Claude on their workflow:

| Phase | Grade | Strengths | Weaknesses |
|-------|-------|-----------|------------|
| Idea Generation | C+ | Drilled down when prompted; feasible ideas | Lacked specific entry points; no "wow" factor |
| Data Collection | B- | Fast script generation; worked quickly | Bare minimum execution; couldn't notice edge cases; went in circles on bugs |
| Storyboarding | B+ | Solid imitation; fast prototypes; complete outlines | Safe choices; no iteration; template-like output |
| Development | D | Fast for isolated tasks; good component structure | Struggled with complexity; whack-a-mole bugs; required expert guidance |

**Key takeaways for your project:**
1. AI excels at isolated, well-defined tasks
2. AI struggles with iteration and critical thinking
3. AI is "as good as its operator" for complex coding
4. AI produces superficially appealing but low-quality content without human polish
5. Best used as editor/assistant, not replacement

---

## Part 6: Design Patterns

### Personalization via Survey
- Ask user about themselves at start
- Plot their position in visualizations throughout
- Creates personal stake in data

### Progressive Disclosure
- Start with simple concept
- Add complexity gradually
- Use "keep scrolling" prompts
- Reserve full interactivity for end

### Annotation Strategy
- Use annotations to highlight key shifts
- Link to historical events
- Include expert quotes as context
- Provide methods section for transparency

### Color Coding
- Consistent colors for categories throughout
- Brightness/saturation for emphasis
- Consider accessibility (colorblind modes)

### Interactive Elements
- Sliders for parameter adjustment
- Toggles for view modes
- Search for specific items
- Filters for subsetting data
- Tooltips for details on demand

---

## Part 7: Editorial Approach

### Story Structure
1. **Hook** - Personal anecdote or relatable question
2. **Thesis** - Clear single point (not a question)
3. **Evidence** - Data-driven sections with visuals
4. **Context** - Historical/cultural background
5. **Reflection** - Personal or societal implications
6. **Methods** - Transparency about process

### Voice & Tone
- First person for personal stakes
- Expert quotes for credibility
- Humor for approachability
- Acknowledging limitations

### Methods Transparency
- Data sources with links
- Analysis methodology
- Limitations and caveats
- Link to GitHub for full code/data

---

## Part 8: Key Lessons for Claude Code Lens

### From The Pudding's Process
1. **Entry points matter** - Don't just show data; give users a personal stake
2. **Iteration is everything** - First pass is never good enough
3. **Edge cases reveal quality** - Handling exceptions separates good from great
4. **Interactivity should be meaningful** - Not decoration
5. **Methods transparency builds trust**

### From Their AI Evaluation
1. **AI for prototyping** - Fast chart iteration with Python/matplotlib
2. **AI for isolated components** - Single Svelte components work well
3. **Human for critical thinking** - Data quality, edge cases, narrative arc
4. **Human for iteration** - Multiple passes to refine
5. **Human for "aha" moments** - AI produces safe, predictable output

### Technical Recommendations
1. Use SvelteKit for production
2. D3.js for custom visualizations
3. LayerCake for Svelte-D3 integration
4. Scrollama for scrollytelling
5. ArchieML for content management
6. Python for data processing
7. GPT/Claude for classification tasks (with specific prompts)

---

## Part 9: Implementation Checklist

### Pre-Development
- [ ] Define single-point thesis
- [ ] Identify "aha" moment
- [ ] Validate data source feasibility
- [ ] Sketch whiteboard visuals
- [ ] Plan personalization hook

### Data Pipeline
- [ ] Collect raw data
- [ ] Clean and process
- [ ] Handle edge cases
- [ ] Run analysis
- [ ] Generate summary statistics
- [ ] Create prototype visualizations

### Storyboard
- [ ] Write section outline
- [ ] Specify chart types per section
- [ ] Define interactive elements
- [ ] Plan mobile experience
- [ ] Identify annotation opportunities

### Development
- [ ] Set up SvelteKit project
- [ ] Create component structure
- [ ] Implement scrollytelling
- [ ] Build D3 visualizations
- [ ] Add interactivity
- [ ] Test mobile
- [ ] Write narrative copy
- [ ] Add methods section

### Polish
- [ ] Iterate on visualizations
- [ ] Refine narrative
- [ ] Test edge cases
- [ ] Accessibility check
- [ ] Performance optimization
- [ ] Final review

---

## Resources

### The Pudding Documentation
- How to Make Dope Shit Part 1: https://pudding.cool/process/how-to-make-dope-shit-part-1/
- How to Make Dope Shit Part 2: https://pudding.cool/process/how-to-make-dope-shit-part-2/
- How to Make Dope Shit Part 3: https://pudding.cool/process/how-to-make-dope-shit-part-3/
- Scrollytelling Implementation: https://pudding.cool/process/how-to-implement-scrollytelling/
- Responsive Scrollytelling: https://pudding.cool/process/responsive-scrollytelling/

### GitHub Repos
- Svelte Starter: https://github.com/the-pudding/svelte-starter
- Love Songs: https://github.com/the-pudding/pop-love-songs
- Svelte Templates: https://github.com/the-pudding/svelte-templates
- Data Sets: https://github.com/the-pudding/data

### Libraries
- Scrollama: https://github.com/russellgoldenberg/scrollama
- LayerCake: https://layercake.graphics/
- D3.js: https://d3js.org/
- SvelteKit: https://kit.svelte.dev/
- ArchieML: http://archieml.org/

---

## Final Note

The Pudding's work represents the intersection of journalism, data science, and design. Their AI evaluation reveals that while AI tools can accelerate certain tasks, the craftsmanship that distinguishes their work—the iteration, the edge case handling, the narrative arc, the "aha" moments—remains distinctly human.

For Claude Code Lens, this means:
- Use AI for prototyping and component generation
- Invest human effort in iteration and polish
- Focus on unique entry points and "aha" moments
- Build meaningful interactivity, not decoration
- Be transparent about methods