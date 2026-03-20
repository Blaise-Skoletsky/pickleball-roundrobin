<script>
  import { tournament, updateTournament, resetTournament } from '../lib/state.js';
  import { generateRound, computeStandings } from '../lib/pairing.js';
  import MatchCard from './MatchCard.svelte';
  import Standings from './Standings.svelte';

  let confirmNext = $state(false);
  let confirmUndo = $state(false);
  let confirmNew = $state(false);
  let confirmTimer = $state(null);
  let exported = $state(false);

  let currentRound = $derived($tournament.currentRound);
  let rounds = $derived($tournament.rounds);
  let round = $derived(rounds[currentRound]);
  let players = $derived($tournament.players);
  let teamMembers = $derived($tournament.teamMembers ?? []);
  let currentGameMode = $derived($tournament.gameMode);
  let allScored = $derived(round?.matches.every(m => m.winner !== null) ?? false);
  let isLastGeneratedRound = $derived(currentRound === rounds.length - 1);
  let canGenerateNext = $derived(
    allScored && isLastGeneratedRound && rounds.length < $tournament.numRounds
  );
  let isTournamentComplete = $derived(rounds.length >= $tournament.numRounds && allScored);
  let isSwiss = $derived($tournament.pairingMethod === 'swiss');
  let showSwissWarning = $derived(isSwiss && !isLastGeneratedRound);

  function goToRound(i) {
    updateTournament(s => { s.currentRound = i; });
  }

  function startConfirm(which) {
    if (which === 'next') confirmNext = true;
    else if (which === 'undo') confirmUndo = true;
    else confirmNew = true;

    clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => {
      confirmNext = false;
      confirmUndo = false;
      confirmNew = false;
    }, 3000);
  }

  function handleGenerateNext() {
    if (!confirmNext) { startConfirm('next'); return; }
    confirmNext = false;
    updateTournament(s => {
      const newRound = generateRound(s);
      s.rounds = [...s.rounds, newRound];
      s.currentRound = s.rounds.length - 1;
    });
  }

  function handleUndo() {
    if (!confirmUndo) { startConfirm('undo'); return; }
    confirmUndo = false;
    updateTournament(s => {
      if (s.rounds.length <= 1) return;
      s.rounds = s.rounds.slice(0, -1);
      s.currentRound = s.rounds.length - 1;
    });
  }

  function handleNewTournament() {
    if (!confirmNew) { startConfirm('new'); return; }
    confirmNew = false;
    resetTournament();
  }

  function csvEscape(value) {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function exportStandingsCsv() {
    const standings = computeStandings($tournament);
    const full = $tournament.scoreTracking === 'full';

    const headers = ['Rank', 'Name', 'W', 'L', 'D'];
    if (full) headers.push('GW', 'GL', 'PW', 'PL', 'PD');
    headers.push('GP');

    const rows = standings.map((r, i) => {
      const row = [i + 1, r.name, r.wins, r.losses, r.draws];
      if (full) row.push(r.gamesWon, r.gamesLost, r.pointsWon, r.pointsLost, r.pointDiff);
      row.push(r.gamesPlayed);
      return row;
    });

    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `pickleball-standings-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    exported = true;
    setTimeout(() => exported = false, 2000);
  }
</script>

<div class="rounds-screen">
  <!-- Round tabs -->
  <div class="round-tabs">
    {#each rounds as _, i}
      <button
        class="tab"
        class:active={i === currentRound}
        onclick={() => goToRound(i)}
      >
        R{i + 1}
      </button>
    {/each}
  </div>

  {#if showSwissWarning}
    <div class="warning">
      Editing past results won't change already-generated pairings, but will affect future rounds.
    </div>
  {/if}

  <!-- Matches -->
  {#if round}
    <div class="matches">
      {#each round.matches as match, mi}
        <MatchCard
          {match}
          roundIndex={currentRound}
          matchIndex={mi}
          {players}
          {teamMembers}
          gameMode={currentGameMode}
          scoreTracking={$tournament.scoreTracking}
        />
      {/each}
    </div>

    {#if round.byes.length > 0}
      <div class="byes">
        <span class="bye-label">Bye:</span>
        {round.byes.map(i => players[i]).join(', ')}
      </div>
    {/if}
  {/if}

  <!-- Action buttons -->
  <div class="actions">
    {#if isLastGeneratedRound && rounds.length < $tournament.numRounds}
      <button
        class="btn primary"
        onclick={handleGenerateNext}
        disabled={!allScored}
      >
        {#if confirmNext}
          Confirm?
        {:else if !allScored}
          Score all matches to continue
        {:else}
          Generate Next Round
        {/if}
      </button>
    {/if}

    {#if isLastGeneratedRound && rounds.length > 1}
      <button class="btn secondary" onclick={handleUndo}>
        {confirmUndo ? 'Confirm?' : 'Undo Last Round'}
      </button>
    {/if}

    {#if isTournamentComplete}
      <div class="complete-banner">Tournament Complete!</div>
    {/if}
  </div>

  <!-- Standings -->
  <Standings />

  <!-- Bottom actions -->
  <div class="bottom-actions">
    <button class="btn text-btn" onclick={exportStandingsCsv}>
      {exported ? 'Exported!' : 'Export Standings CSV'}
    </button>
    <button class="btn danger-text" onclick={handleNewTournament}>
      {confirmNew ? 'Confirm?' : 'New Tournament'}
    </button>
  </div>
</div>

<style>
  .rounds-screen {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .round-tabs {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding: 4px 0;
    -webkit-overflow-scrolling: touch;
  }

  .tab {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    background: #e8ede8;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }

  .tab.active {
    background: #2d6a4f;
    color: white;
  }

  .warning {
    background: #fef3cd;
    color: #856404;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 0.85rem;
  }

  .matches {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .byes {
    background: white;
    border-radius: 10px;
    padding: 12px 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    font-size: 0.9rem;
    color: #666;
  }

  .bye-label {
    font-weight: 600;
    color: #999;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .complete-banner {
    text-align: center;
    font-size: 1.1rem;
    font-weight: 700;
    color: #2d6a4f;
    padding: 16px;
    background: #d8f3dc;
    border-radius: 10px;
  }

  .btn {
    display: block;
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .primary {
    background: #2d6a4f;
    color: white;
  }

  .primary:active:not(:disabled) {
    background: #1b4332;
  }

  .primary:disabled {
    background: #a0b8a8;
    cursor: default;
  }

  .secondary {
    background: #e8ede8;
    color: #333;
  }

  .secondary:active {
    background: #d0d7d0;
  }

  .bottom-actions {
    display: flex;
    gap: 12px;
    justify-content: space-between;
    padding-top: 8px;
  }

  .text-btn {
    background: none;
    color: #2d6a4f;
    font-size: 0.9rem;
    padding: 10px;
    width: auto;
  }

  .danger-text {
    background: none;
    color: #c53030;
    font-size: 0.9rem;
    padding: 10px;
    width: auto;
  }
</style>
