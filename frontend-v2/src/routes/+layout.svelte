<script lang="ts">
  import '../lib/styles/design-system.css';
  import favicon from '$lib/assets/favicon.svg';

  let { children } = $props();

  let scrollProgress = $state(0);

  function handleScroll() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<svelte:window onscroll={handleScroll} />

<!-- Progress bar -->
<div class="scroll-progress" style="width: {scrollProgress}%"></div>

{@render children()}

<style>
  .scroll-progress {
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: var(--color-blue);
    z-index: 1000;
    transition: width 50ms;
  }
</style>
