<script>
  import { tournament } from './lib/state.js';
  import SetupScreen from './components/SetupScreen.svelte';
  import RoundsScreen from './components/RoundsScreen.svelte';
</script>

<div class="app">
  <header>
    <h1>Pickleball Round-Robin</h1>
  </header>

  {#if $tournament.currentScreen === 'setup'}
    <SetupScreen />
  {:else}
    <RoundsScreen />
  {/if}
</div>

<style>
  .app {
    max-width: 600px;
    margin: 0 auto;
    padding: 12px;
    padding-bottom: 80px;
  }

  header {
    text-align: center;
    padding: 12px 0 8px;
  }

  header h1 {
    font-size: 1.4rem;
    color: #2d6a4f;
    font-weight: 700;
  }
</style>
