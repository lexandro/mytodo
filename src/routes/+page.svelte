<script lang="ts">
  import { formatDuration } from "$lib/core/example";

  let uptime = $state(0);
  setInterval(() => (uptime += 1), 1000);
</script>

<main>
  <h1>mytodo</h1>
  <p>Fut: {formatDuration(uptime)}</p>
  <p class="hint">
    A logika tiszta <code>src/lib/core/*.ts</code> modulokba megy (kolokált vitest teszttel),
    a Tauri API-t kizárólag az <code>src/lib/ipc.ts</code> érheti el.
  </p>
</main>

<style>
  main {
    font-family: system-ui, sans-serif;
    padding: 2rem;
  }
  .hint {
    color: #888;
    font-size: 0.9rem;
    max-width: 40rem;
  }
</style>
