<script lang="ts">
  import "@fontsource/inter/400.css";
  import "@fontsource/inter/500.css";
  import "@fontsource/inter/600.css";
  import "$lib/styles/tokens.css";
  import "$lib/styles/components.css";

  let { children } = $props();
</script>

{@render children()}
