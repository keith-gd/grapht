<script lang="ts">
  import CollisionChip from './CollisionChip.svelte';

  interface Collision {
    with: string;
    hypothesis: string;
  }

  interface Dataset {
    id: string;
    title: string;
    source: string;
    url: string;
    description: string;
    granularity: string[];
    years: number[];
    join_key: string;
    download: string;
    collisions: Collision[];
  }

  let { dataset, highlighted = false }: {
    dataset: Dataset;
    highlighted?: boolean;
  } = $props();

  const downloadLabels: Record<string, string> = {
    manual: 'Manual download',
    direct_csv: 'Direct CSV',
    api: 'API access'
  };
</script>

<div class="dataset-card" class:highlighted>
  <div class="card-header">
    <a href={dataset.url} target="_blank" rel="noopener noreferrer" class="title">
      {dataset.title}
      <span class="external-icon">↗</span>
    </a>
    <span class="source-badge">{dataset.source}</span>
  </div>

  <p class="description">{dataset.description}</p>

  <div class="metadata">
    <div class="meta-group">
      <span class="meta-label">Granularity</span>
      <div class="meta-pills">
        {#each dataset.granularity as level}
          <span class="pill">{level}</span>
        {/each}
      </div>
    </div>

    <div class="meta-group">
      <span class="meta-label">Years</span>
      <span class="pill">{dataset.years[0]}–{dataset.years[1]}</span>
    </div>

    <div class="meta-group">
      <span class="meta-label">Join key</span>
      <span class="pill mono">{dataset.join_key}</span>
    </div>

    <div class="meta-group">
      <span class="meta-label">Download</span>
      <span class="pill">{downloadLabels[dataset.download] || dataset.download}</span>
    </div>
  </div>

  {#if dataset.collisions && dataset.collisions.length > 0}
    <div class="collisions">
      <span class="collisions-label">Collision ideas</span>
      <div class="collision-list">
        {#each dataset.collisions as collision}
          <CollisionChip {collision} />
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .dataset-card {
    padding: var(--space-4, 16px);
    background: var(--color-bg, #0f0f0f);
    border-top: 1px solid var(--color-border, #2a2a2a);
    transition: background var(--transition-fast, 100ms) ease-out;
  }

  .dataset-card.highlighted {
    background: var(--color-surface, #1a1a1a);
    border-left: 3px solid var(--color-blue, #3b82f6);
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3, 12px);
    margin-bottom: var(--space-2, 8px);
  }

  .title {
    font-size: var(--font-size-base, 16px);
    font-weight: var(--font-weight-semibold, 600);
    color: var(--color-text, #f5f5f5);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: var(--space-1, 4px);
  }

  .title:hover {
    color: var(--color-blue, #3b82f6);
  }

  .external-icon {
    font-size: var(--font-size-sm, 14px);
    opacity: 0.5;
  }

  .source-badge {
    flex-shrink: 0;
    padding: var(--space-1, 4px) var(--space-2, 8px);
    background: var(--color-surface, #1a1a1a);
    border-radius: 4px;
    font-size: var(--font-size-xs, 12px);
    color: var(--color-text-muted, #a0a0a0);
    font-weight: var(--font-weight-semibold, 600);
  }

  .description {
    margin: 0 0 var(--space-3, 12px);
    font-size: var(--font-size-sm, 14px);
    color: var(--color-text-muted, #a0a0a0);
    line-height: 1.5;
  }

  .metadata {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4, 16px);
    margin-bottom: var(--space-3, 12px);
  }

  .meta-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1, 4px);
  }

  .meta-label {
    font-size: var(--font-size-xs, 12px);
    color: var(--color-text-muted, #a0a0a0);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .meta-pills {
    display: flex;
    gap: var(--space-1, 4px);
  }

  .pill {
    padding: var(--space-1, 4px) var(--space-2, 8px);
    background: var(--color-surface, #1a1a1a);
    border-radius: 4px;
    font-size: var(--font-size-xs, 12px);
    color: var(--color-text, #f5f5f5);
  }

  .pill.mono {
    font-family: var(--font-mono, 'SFMono-Regular', Monaco, Menlo, Consolas, monospace);
  }

  .collisions {
    padding-top: var(--space-3, 12px);
    border-top: 1px solid var(--color-border, #2a2a2a);
  }

  .collisions-label {
    display: block;
    margin-bottom: var(--space-2, 8px);
    font-size: var(--font-size-xs, 12px);
    color: var(--color-text-muted, #a0a0a0);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .collision-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2, 8px);
  }

  @media (max-width: 768px) {
    .card-header {
      flex-direction: column;
    }

    .metadata {
      flex-direction: column;
      gap: var(--space-3, 12px);
    }
  }
</style>
