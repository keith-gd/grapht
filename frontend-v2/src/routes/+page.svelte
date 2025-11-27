<script lang="ts">
  // Landing page for Agent Analytics
</script>

<svelte:head>
  <title>Agent Analytics | Precise & Weighty</title>
</svelte:head>

<main class="landing">
  <div class="hero">
    <h1>Agent Analytics</h1>
    <p class="tagline">Precise. Weighty. Beautiful.</p>
    <p class="description">
      Track your AI agent usage with visualizations that feel like precision instruments, not generic dashboards.
    </p>
    <div class="cta-row">
      <a href="/archive" class="btn btn-primary">
        View Your Story
      </a>
      <a href="/datasets" class="btn btn-secondary">
        Dataset Discovery
      </a>
    </div>
  </div>

  <section class="features">
    <div class="feature">
      <div class="feature-icon blue">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      <h3>Your First Session</h3>
      <p>Remember when it all started</p>
    </div>
    <div class="feature">
      <div class="feature-icon red">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v20M2 12h20" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      </div>
      <h3>Pattern Discovery</h3>
      <p>Find your most expensive days</p>
    </div>
    <div class="feature">
      <div class="feature-icon green">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
      <h3>Favorite Agent</h3>
      <p>Discover which AI you prefer</p>
    </div>
    <div class="feature">
      <div class="feature-icon amber">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </div>
      <h3>Biggest Wins</h3>
      <p>Celebrate your impact</p>
    </div>
  </section>
</main>

<style>
  .landing {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .hero {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-8);
    min-height: 70vh;
  }

  h1 {
    font-size: clamp(3rem, 12vw, 6rem);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--space-4);
    letter-spacing: -0.02em;
  }

  .tagline {
    font-size: var(--font-size-xl);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-4);
  }

  .description {
    font-size: var(--font-size-base);
    color: var(--color-text-muted);
    max-width: 500px;
    margin-bottom: var(--space-8);
  }

  .cta-row {
    display: flex;
    gap: var(--space-4);
    flex-wrap: wrap;
    justify-content: center;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4) var(--space-8);
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    text-decoration: none;
    border-radius: var(--radius-md);
    transition:
      transform var(--transition-normal) var(--ease-out-bounce),
      box-shadow var(--transition-normal);
  }

  .btn:hover {
    transform: scale(1.02) translateY(-2px);
  }

  .btn:active {
    transform: scale(0.98);
  }

  .btn-primary {
    background: var(--color-blue);
    color: white;
    box-shadow: var(--shadow-md);
  }

  .btn-primary:hover {
    box-shadow: var(--shadow-lg), var(--glow-blue);
  }

  .btn-secondary {
    background: var(--color-surface);
    color: var(--color-text);
    border: 2px solid var(--color-border);
  }

  .btn-secondary:hover {
    border-color: var(--color-text-muted);
  }

  /* Features section */
  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-6);
    padding: var(--space-8);
    background: var(--color-surface);
    border-top: 2px solid var(--color-border);
  }

  .feature {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: var(--space-6);
  }

  .feature-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    margin-bottom: var(--space-4);
    background: var(--color-bg);
    border: 2px solid var(--color-border);
  }

  .feature-icon.blue {
    color: var(--color-blue);
    border-color: var(--color-blue);
    box-shadow: var(--glow-blue);
  }

  .feature-icon.red {
    color: var(--color-red);
    border-color: var(--color-red);
    box-shadow: var(--glow-red);
  }

  .feature-icon.green {
    color: var(--color-green);
    border-color: var(--color-green);
    box-shadow: var(--glow-green);
  }

  .feature-icon.amber {
    color: var(--color-amber);
    border-color: var(--color-amber);
    box-shadow: var(--glow-amber);
  }

  .feature h3 {
    font-size: var(--font-size-base);
    margin-bottom: var(--space-2);
  }

  .feature p {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  @media (max-width: 768px) {
    .features {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
