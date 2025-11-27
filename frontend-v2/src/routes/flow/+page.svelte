<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  // Types
  interface Session {
    session_id: string;
    session_start: string;
    session_end?: string;
    total_cost: number;
    agent_type: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  }

  interface Particle {
    id: string;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    alpha: number;
    session: Session;
    trail: { x: number; y: number; alpha: number }[];
  }

  // Config
  const API_BASE = 'http://localhost:3001/api';
  const MAX_PARTICLES = 200;
  const AGENT_COLORS: Record<string, string> = {
    claude_code: '#3b82f6',
    cursor: '#22c55e',
    copilot: '#f59e0b',
    factory_droid: '#ef4444',
    default: '#a0a0a0'
  };

  // State
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationId: number;
  let particles: Particle[] = [];
  let sessions: Session[] = [];
  let isLoading = true;
  let error: string | null = null;
  let isPaused = false;
  let selectedParticle: Particle | null = null;
  let hoveredParticle: Particle | null = null;
  let mouseX = 0;
  let mouseY = 0;
  let timeRange = 30; // days
  let canvasWidth = 0;
  let canvasHeight = 0;

  // Computed time bounds
  $: minTime = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  $: maxTime = new Date();

  // Fetch session data
  async function fetchSessions() {
    try {
      isLoading = true;
      const response = await fetch(`${API_BASE}/analytics/tempo`, {
        headers: { 'Authorization': 'Bearer dev_local_key' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      sessions = await response.json();
      createParticles();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load sessions';
    } finally {
      isLoading = false;
    }
  }

  // Map session to particle
  function createParticles() {
    const filtered = sessions
      .filter(s => new Date(s.session_start) >= minTime)
      .slice(0, MAX_PARTICLES);

    particles = filtered.map(session => {
      const time = new Date(session.session_start).getTime();
      const timeProgress = (time - minTime.getTime()) / (maxTime.getTime() - minTime.getTime());

      // X position based on time (left = old, right = recent)
      const targetX = 80 + timeProgress * (canvasWidth - 160);

      // Y position: slight randomness + time-of-day clustering
      const hour = new Date(session.session_start).getHours();
      const hourNormalized = hour / 24;
      const targetY = 100 + hourNormalized * (canvasHeight - 250) + (Math.random() - 0.5) * 60;

      // Size based on cost
      const minRadius = 4;
      const maxRadius = 20;
      const costNormalized = Math.min(session.total_cost / 1, 1); // Cap at $1 for sizing
      const radius = minRadius + costNormalized * (maxRadius - minRadius);

      // Color based on agent
      const color = AGENT_COLORS[session.agent_type] || AGENT_COLORS.default;

      return {
        id: session.session_id,
        x: targetX + (Math.random() - 0.5) * 20,
        y: targetY + (Math.random() - 0.5) * 20,
        targetX,
        targetY,
        vx: 0,
        vy: 0,
        radius,
        color,
        alpha: 0.8,
        session,
        trail: []
      };
    });
  }

  // Physics update
  function updateParticles() {
    if (isPaused) return;

    const springStrength = 0.02;
    const damping = 0.92;
    const maxTrailLength = 8;

    for (const p of particles) {
      // Spring force toward target
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      p.vx += dx * springStrength;
      p.vy += dy * springStrength;

      // Slight drift for organic feel
      p.vx += (Math.random() - 0.5) * 0.3;
      p.vy += (Math.random() - 0.5) * 0.3;

      // Damping
      p.vx *= damping;
      p.vy *= damping;

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Trail
      if (Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1) {
        p.trail.unshift({ x: p.x, y: p.y, alpha: 0.4 });
        if (p.trail.length > maxTrailLength) p.trail.pop();
      }

      // Fade trail
      for (const t of p.trail) {
        t.alpha *= 0.85;
      }
      p.trail = p.trail.filter(t => t.alpha > 0.05);
    }
  }

  // Render
  function render() {
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw time axis
    drawTimeAxis();

    // Draw trails
    for (const p of particles) {
      for (let i = 0; i < p.trail.length; i++) {
        const t = p.trail[i];
        const trailRadius = p.radius * (1 - i / p.trail.length) * 0.6;
        ctx.beginPath();
        ctx.arc(t.x, t.y, trailRadius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(t.alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }
    }

    // Draw particles
    for (const p of particles) {
      const isHovered = hoveredParticle?.id === p.id;
      const isSelected = selectedParticle?.id === p.id;
      const scale = isHovered || isSelected ? 1.4 : 1;
      const r = p.radius * scale;

      // Glow for selected/hovered
      if (isHovered || isSelected) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 8, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(p.x, p.y, r, p.x, p.y, r + 8);
        gradient.addColorStop(0, p.color + '60');
        gradient.addColorStop(1, p.color + '00');
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Main particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      // Inner highlight
      ctx.beginPath();
      ctx.arc(p.x - r * 0.3, p.y - r * 0.3, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();
    }

    // Draw hover tooltip
    if (hoveredParticle && !selectedParticle) {
      drawTooltip(hoveredParticle);
    }
  }

  function drawTimeAxis() {
    if (!ctx) return;

    const y = canvasHeight - 50;

    // Axis line
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, y);
    ctx.lineTo(canvasWidth - 80, y);
    ctx.stroke();

    // Time labels
    ctx.fillStyle = '#666666';
    ctx.font = '12px ui-monospace, monospace';
    ctx.textAlign = 'center';

    const numTicks = Math.min(timeRange, 7);
    for (let i = 0; i <= numTicks; i++) {
      const progress = i / numTicks;
      const x = 80 + progress * (canvasWidth - 160);
      const date = new Date(minTime.getTime() + progress * (maxTime.getTime() - minTime.getTime()));

      // Tick
      ctx.strokeStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x, y + 5);
      ctx.stroke();

      // Label
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      ctx.fillText(label, x, y + 20);
    }
  }

  function drawTooltip(p: Particle) {
    if (!ctx) return;

    const padding = 10;
    const text = `${p.session.agent_type} · $${p.session.total_cost.toFixed(2)}`;
    ctx.font = '13px ui-monospace, monospace';
    const metrics = ctx.measureText(text);
    const width = metrics.width + padding * 2;
    const height = 28;

    let tx = p.x + p.radius + 10;
    let ty = p.y - height / 2;

    // Keep on screen
    if (tx + width > canvasWidth - 20) tx = p.x - p.radius - width - 10;
    if (ty < 20) ty = 20;
    if (ty + height > canvasHeight - 70) ty = canvasHeight - 70 - height;

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tx, ty, width, height, 4);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#f5f5f5';
    ctx.textAlign = 'left';
    ctx.fillText(text, tx + padding, ty + 18);
  }

  // Animation loop
  function animate() {
    updateParticles();
    render();
    animationId = requestAnimationFrame(animate);
  }

  // Mouse handling
  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    // Find hovered particle
    hoveredParticle = null;
    for (const p of particles) {
      const dx = mouseX - p.x;
      const dy = mouseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < p.radius + 5) {
        hoveredParticle = p;
        break;
      }
    }

    canvas.style.cursor = hoveredParticle ? 'pointer' : 'default';
  }

  function handleClick() {
    if (hoveredParticle) {
      selectedParticle = selectedParticle?.id === hoveredParticle.id ? null : hoveredParticle;
    } else {
      selectedParticle = null;
    }
  }

  // Resize handling
  function handleResize() {
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    canvasWidth = container.clientWidth;
    canvasHeight = container.clientHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Recalculate particle positions
    if (particles.length > 0) {
      createParticles();
    }
  }

  // Lifecycle
  onMount(() => {
    if (!browser) return;

    ctx = canvas.getContext('2d');
    handleResize();
    window.addEventListener('resize', handleResize);

    fetchSessions().then(() => {
      animate();
    });
  });

  onDestroy(() => {
    if (browser) {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    }
  });

  // Time range change
  function setTimeRange(days: number) {
    timeRange = days;
    createParticles();
  }

  // Format helpers
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function formatDuration(start: string, end?: string): string {
    if (!end) return 'In progress';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  function formatAgent(agent: string): string {
    return agent?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  }
</script>

<svelte:head>
  <title>Flow Field | Session Explorer</title>
</svelte:head>

<div class="flow-container">
  <!-- Header -->
  <header class="flow-header">
    <h1>Flow Field</h1>
    <div class="controls">
      <div class="time-selector">
        <button class:active={timeRange === 7} on:click={() => setTimeRange(7)}>7d</button>
        <button class:active={timeRange === 30} on:click={() => setTimeRange(30)}>30d</button>
        <button class:active={timeRange === 90} on:click={() => setTimeRange(90)}>90d</button>
      </div>
      <button class="pause-btn" on:click={() => isPaused = !isPaused}>
        {isPaused ? '▶ Play' : '⏸ Pause'}
      </button>
    </div>
  </header>

  <!-- Canvas -->
  <div class="canvas-container">
    {#if isLoading}
      <div class="loading">Loading sessions...</div>
    {:else if error}
      <div class="error">{error}</div>
    {:else}
      <canvas
        bind:this={canvas}
        on:mousemove={handleMouseMove}
        on:click={handleClick}
        on:mouseleave={() => hoveredParticle = null}
      ></canvas>
    {/if}
  </div>

  <!-- Legend -->
  <div class="legend">
    <span class="legend-title">Agents:</span>
    <span class="legend-item"><span class="dot" style="background: #3b82f6"></span> Claude</span>
    <span class="legend-item"><span class="dot" style="background: #22c55e"></span> Cursor</span>
    <span class="legend-item"><span class="dot" style="background: #f59e0b"></span> Copilot</span>
    <span class="legend-item"><span class="dot" style="background: #ef4444"></span> Factory</span>
    <span class="legend-sep">|</span>
    <span class="legend-title">Size = Cost</span>
  </div>

  <!-- Inspect Panel -->
  {#if selectedParticle}
    <div class="inspect-panel">
      <button class="close-btn" on:click={() => selectedParticle = null}>✕</button>
      <div class="inspect-header">
        <span class="agent-badge" style="background: {selectedParticle.color}">
          {formatAgent(selectedParticle.session.agent_type)}
        </span>
        <span class="cost">${selectedParticle.session.total_cost.toFixed(2)}</span>
      </div>
      <div class="inspect-details">
        <div class="detail-row">
          <span class="label">When</span>
          <span class="value">{formatDate(selectedParticle.session.session_start)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Duration</span>
          <span class="value">{formatDuration(selectedParticle.session.session_start, selectedParticle.session.session_end)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Tokens</span>
          <span class="value">{selectedParticle.session.total_tokens.toLocaleString()}</span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .flow-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--color-bg);
    color: var(--color-text);
  }

  .flow-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) var(--space-6);
    border-bottom: 2px solid var(--color-border);
  }

  .flow-header h1 {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
  }

  .controls {
    display: flex;
    gap: var(--space-4);
  }

  .time-selector {
    display: flex;
    gap: var(--space-1);
  }

  .time-selector button {
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .time-selector button:hover {
    border-color: var(--color-text-muted);
  }

  .time-selector button.active {
    background: var(--color-blue);
    border-color: var(--color-blue);
    color: white;
  }

  .pause-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .pause-btn:hover {
    border-color: var(--color-text-muted);
  }

  .canvas-container {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  canvas {
    display: block;
  }

  .loading, .error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
  }

  .error {
    color: var(--color-error);
  }

  .legend {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-6);
    border-top: 2px solid var(--color-border);
    background: var(--color-surface);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .legend-title {
    color: var(--color-text-muted);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .legend-sep {
    color: var(--color-border);
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .inspect-panel {
    position: absolute;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-4) var(--space-5);
    min-width: 320px;
    box-shadow: var(--shadow-lg);
  }

  .close-btn {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: var(--font-size-lg);
    cursor: pointer;
    padding: var(--space-1);
  }

  .close-btn:hover {
    color: var(--color-text);
  }

  .inspect-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  .agent-badge {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    color: white;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
  }

  .cost {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-highlight);
  }

  .inspect-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
  }

  .detail-row .label {
    color: var(--color-text-muted);
  }

  .detail-row .value {
    color: var(--color-text);
    font-weight: var(--font-weight-semibold);
  }
</style>
