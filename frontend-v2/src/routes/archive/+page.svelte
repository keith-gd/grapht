<script lang="ts">
  import { onMount } from 'svelte';
  import ScrollSection from '$lib/components/ScrollSection.svelte';
  import ArchiveMetric from '$lib/components/ArchiveMetric.svelte';
  import { archiveStore, isLoading, archiveError, archiveSummary } from '$lib/stores/archiveData';

  let currentSection = 'intro';
  let reducedMotion = false;

  onMount(() => {
    // Check reduced motion preference
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Fetch archive data
    archiveStore.fetchSummary();
  });

  function handleSectionVisibility(event: CustomEvent<{ id: string; inView: boolean }>) {
    if (event.detail.inView) {
      currentSection = event.detail.id;
    }
  }

  // Format date nicely
  function formatDate(dateStr: string): string {
    if (!dateStr) return 'Unknown date';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Format agent name
  function formatAgent(agent: string): string {
    if (!agent) return 'Unknown';
    return agent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
</script>

<svelte:head>
  <title>Archive Wall | Your Agent Story</title>
  <meta name="description" content="A journey through your AI agent history" />
</svelte:head>

<main class="archive-wall">
  {#if $isLoading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading your story...</p>
    </div>
  {:else if $archiveError}
    <div class="error-state">
      <h2>Something went wrong</h2>
      <p>{$archiveError}</p>
      <button class="btn btn-primary" on:click={() => archiveStore.fetchSummary()}>
        Try Again
      </button>
    </div>
  {:else}
    <!-- Section 1: Introduction -->
    <ScrollSection id="intro" theme="dark" on:visibility={handleSectionVisibility}>
      <h1 class="archive-title">Your Agent Story</h1>
      <p class="archive-subtitle">
        A journey through your AI collaboration history
      </p>
      <div class="scroll-hint">
        <span>Scroll to explore</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </ScrollSection>

    <!-- Section 2: Your First Session -->
    <ScrollSection id="first-session" theme="blue" on:visibility={handleSectionVisibility}>
      <span class="section-label">THE BEGINNING</span>
      <h2 class="section-headline">Your First Session</h2>

      {#if $archiveSummary?.firstSession}
        <p class="section-date">
          {formatDate($archiveSummary.firstSession.session_start)}
        </p>
        <div class="session-detail">
          <span class="detail-label">Agent</span>
          <span class="detail-value agent-badge" data-agent={$archiveSummary.firstSession.agent_type}>
            {formatAgent($archiveSummary.firstSession.agent_type)}
          </span>
        </div>
        <div class="metric-row">
          <ArchiveMetric
            value={$archiveSummary.firstSession.total_cost || 0}
            prefix="$"
            color="blue"
            animate={!reducedMotion}
          />
        </div>
        <p class="section-insight">
          That first conversation set everything in motion.
        </p>
      {:else}
        <p class="no-data">No sessions recorded yet. Start using agents to see your story!</p>
      {/if}
    </ScrollSection>

    <!-- Section 3: Most Expensive Day -->
    <ScrollSection id="expensive-day" theme="red" on:visibility={handleSectionVisibility}>
      <span class="section-label">PATTERN REVEALED</span>
      <h2 class="section-headline">Your Most Expensive Day</h2>

      {#if $archiveSummary?.mostExpensiveDay}
        <p class="section-date">
          {formatDate($archiveSummary.mostExpensiveDay.date)}
        </p>
        <div class="metric-row">
          <ArchiveMetric
            value={$archiveSummary.mostExpensiveDay.cost || 0}
            prefix="$"
            color="red"
            animate={!reducedMotion}
          />
        </div>
        <p class="metric-context">
          across {$archiveSummary.mostExpensiveDay.sessions} sessions
        </p>
        <p class="section-insight">
          Big investment, big output. What did you build that day?
        </p>
      {:else}
        <p class="no-data">Keep using agents to discover your patterns.</p>
      {/if}
    </ScrollSection>

    <!-- Section 4: Favorite Agent -->
    <ScrollSection id="favorite-agent" theme="green" on:visibility={handleSectionVisibility}>
      <span class="section-label">BEHAVIORAL INSIGHT</span>
      <h2 class="section-headline">Your Favorite Agent</h2>

      {#if $archiveSummary?.favoriteAgent}
        <div class="agent-hero">
          <span class="agent-name" data-agent={$archiveSummary.favoriteAgent.agent_type}>
            {formatAgent($archiveSummary.favoriteAgent.agent_type)}
          </span>
        </div>
        <div class="metric-row">
          <ArchiveMetric
            value={$archiveSummary.favoriteAgent.count}
            suffix=" sessions"
            color="green"
            animate={!reducedMotion}
          />
        </div>
        {#if $archiveSummary.totals}
          {@const percentage = (($archiveSummary.favoriteAgent.count / $archiveSummary.totals.total_sessions) * 100).toFixed(0)}
          <p class="metric-context">
            That's {percentage}% of all your sessions
          </p>
        {/if}
        <p class="section-insight">
          You've found your workflow match.
        </p>
      {:else}
        <p class="no-data">Use different agents to see which one you prefer.</p>
      {/if}
    </ScrollSection>

    <!-- Section 5: Biggest Win -->
    <ScrollSection id="biggest-win" theme="amber" on:visibility={handleSectionVisibility}>
      <span class="section-label">IMPACT</span>
      <h2 class="section-headline">Your Biggest Win</h2>

      {#if $archiveSummary?.biggestWin}
        <div class="metric-row">
          <ArchiveMetric
            value={$archiveSummary.biggestWin.lines_added}
            prefix="+"
            suffix=" lines"
            color="amber"
            animate={!reducedMotion}
          />
        </div>
        <p class="commit-message">
          "{$archiveSummary.biggestWin.commit_message || 'No message'}"
        </p>
        {#if $archiveSummary.biggestWin.repository}
          <p class="metric-context">
            in {$archiveSummary.biggestWin.repository}
          </p>
        {/if}
        <p class="section-insight">
          That's a lot of value created with AI assistance.
        </p>
      {:else}
        <p class="no-data">Make commits linked to agent sessions to track your wins.</p>
      {/if}
    </ScrollSection>

    <!-- Section 6: Totals / Summary -->
    <ScrollSection id="totals" theme="dark" on:visibility={handleSectionVisibility}>
      <span class="section-label">THE BIG PICTURE</span>
      <h2 class="section-headline">Your Journey So Far</h2>

      {#if $archiveSummary?.totals}
        <div class="totals-grid">
          <div class="total-item">
            <ArchiveMetric
              value={$archiveSummary.totals.total_sessions}
              color="blue"
              animate={!reducedMotion}
              duration={1500}
            />
            <span class="total-label">Sessions</span>
          </div>
          <div class="total-item">
            <ArchiveMetric
              value={$archiveSummary.totals.total_cost || 0}
              prefix="$"
              color="green"
              animate={!reducedMotion}
              duration={1500}
            />
            <span class="total-label">Total Spent</span>
          </div>
          <div class="total-item">
            <ArchiveMetric
              value={Math.round(($archiveSummary.totals.total_tokens || 0) / 1000)}
              suffix="K"
              color="amber"
              animate={!reducedMotion}
              duration={1500}
            />
            <span class="total-label">Tokens Used</span>
          </div>
        </div>
        <p class="section-insight finale">
          And the story continues...
        </p>
      {/if}
    </ScrollSection>

    <!-- Navigation dots -->
    <nav class="section-nav" aria-label="Section navigation">
      {#each ['intro', 'first-session', 'expensive-day', 'favorite-agent', 'biggest-win', 'totals'] as section}
        <a
          href="#{section}"
          class="nav-dot"
          class:active={currentSection === section}
          aria-label="Jump to {section.replace('-', ' ')}"
        ></a>
      {/each}
    </nav>
  {/if}
</main>

<style>
  .archive-wall {
    min-height: 100vh;
    background: var(--color-bg);
    /* Optional: enable scroll snap for section-by-section scrolling */
    /* scroll-snap-type: y proximity; */
  }

  /* Ensure sections don't fight with scroll */
  :global(.scroll-section) {
    /* scroll-snap-align: start; */
    scroll-margin-top: 0;
  }

  /* Loading state */
  .loading-state,
  .error-state {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    padding: var(--space-8);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-blue);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-state h2 {
    color: var(--color-error);
  }

  /* Title section */
  .archive-title {
    font-size: clamp(2.5rem, 10vw, 5rem);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--space-4);
    background: linear-gradient(135deg, var(--color-text) 0%, var(--color-text-secondary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .archive-subtitle {
    font-size: var(--font-size-xl);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-8);
  }

  .scroll-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-muted);
    animation: bounce 2.5s ease-in-out infinite;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(8px); }
  }

  /* Section styles */
  .section-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
    margin-bottom: var(--space-2);
    display: block;
  }

  .section-headline {
    font-size: clamp(1.5rem, 5vw, 3rem);
    margin-bottom: var(--space-6);
  }

  .section-date {
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-4);
  }

  .section-insight {
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
    margin-top: var(--space-6);
    font-style: italic;
  }

  .section-insight.finale {
    font-size: var(--font-size-xl);
    color: var(--color-highlight);
    font-style: normal;
    margin-top: var(--space-8);
  }

  /* Metrics */
  .metric-row {
    margin: var(--space-6) 0;
  }

  .metric-context {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
  }

  /* Session detail */
  .session-detail {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-bottom: var(--space-4);
  }

  .detail-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .detail-value {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
  }

  .agent-badge {
    display: inline-block;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    border: 2px solid var(--color-border);
  }

  .agent-badge[data-agent="claude_code"] {
    border-color: var(--color-agent-claude);
    color: var(--color-agent-claude);
  }

  .agent-badge[data-agent="cursor"] {
    border-color: var(--color-agent-cursor);
    color: var(--color-agent-cursor);
  }

  /* Agent hero */
  .agent-hero {
    margin: var(--space-6) 0;
  }

  .agent-name {
    font-size: clamp(2rem, 8vw, 4rem);
    font-weight: var(--font-weight-bold);
  }

  .agent-name[data-agent="claude_code"] {
    color: var(--color-agent-claude);
    text-shadow: var(--glow-blue);
  }

  .agent-name[data-agent="cursor"] {
    color: var(--color-agent-cursor);
    text-shadow: var(--glow-green);
  }

  /* Commit message */
  .commit-message {
    font-size: var(--font-size-lg);
    color: var(--color-text);
    padding: var(--space-4);
    background: var(--color-surface);
    border-left: 3px solid var(--color-amber);
    margin: var(--space-6) 0;
    max-width: 500px;
  }

  /* Totals grid */
  .totals-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-8);
    margin: var(--space-8) 0;
    width: 100%;
    max-width: 800px;
  }

  .total-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
  }

  .total-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* No data state */
  .no-data {
    color: var(--color-text-muted);
    font-style: italic;
  }

  /* Section navigation */
  .section-nav {
    position: fixed;
    right: var(--space-6);
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    z-index: 100;
  }

  .nav-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--color-border);
    border: 2px solid var(--color-border);
    transition:
      background var(--transition-normal),
      transform var(--transition-normal) var(--ease-out-bounce);
  }

  .nav-dot:hover {
    background: var(--color-text-muted);
    transform: scale(1.2);
  }

  .nav-dot.active {
    background: var(--color-blue);
    border-color: var(--color-blue);
    box-shadow: var(--glow-blue);
  }

  /* Mobile adjustments */
  @media (max-width: 768px) {
    .section-nav {
      display: none;
    }

    .totals-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .scroll-hint {
      animation: none;
    }

    .loading-spinner {
      animation: none;
      border-top-color: var(--color-blue);
    }
  }
</style>
