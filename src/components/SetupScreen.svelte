<script>
  import { tournament } from '../lib/state.js';
  import { generateRound } from '../lib/pairing.js';

  let playerText = $state('');
  let numRounds = $state(5);
  let gameMode = $state('doubles-rotating');
  let pairingMethod = $state('variety');
  let scoreTracking = $state('simple');
  let quickPlayerCount = $state(8);
  let error = $state('');

  // For doubles-selected: list of teams
  let teams = $state([
    { name: 'Team 1', player1: '', player2: '' },
    { name: 'Team 2', player1: '', player2: '' },
  ]);

  let isSelected = $derived(gameMode === 'doubles-selected');
  let isDoubles = $derived(gameMode !== 'singles');

  function addTeam() {
    teams.push({ name: `Team ${teams.length + 1}`, player1: '', player2: '' });
  }

  function removeTeam(index) {
    if (teams.length <= 2) return;
    teams.splice(index, 1);
  }

  function generateQuickTeams() {
    const count = Math.max(2, quickPlayerCount);
    teams = Array.from({ length: count }, (_, i) => ({
      name: `Team ${i + 1}`,
      player1: '',
      player2: ''
    }));
  }

  function getMinPlayers() {
    if (gameMode === 'singles') return 2;
    if (gameMode === 'doubles-selected') return 2; // 2 teams
    return 4;
  }

  function getAutoCourts(count) {
    if (gameMode === 'singles' || gameMode === 'doubles-selected') return Math.floor(count / 2);
    return Math.floor(count / 4);
  }

  function generatePlayerNames() {
    const count = Math.max(2, quickPlayerCount);
    const names = Array.from({ length: count }, (_, i) => `Player ${i + 1}`);
    playerText = names.join('\n');
  }

  function startTournament() {
    error = '';

    if (isSelected) {
      return startSelectedTournament();
    }

    const names = playerText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const minPlayers = getMinPlayers();
    if (names.length < minPlayers) {
      error = `Need at least ${minPlayers} players for ${gameMode === 'singles' ? 'singles' : 'doubles'}`;
      return;
    }

    const uniqueNames = [...new Set(names)];
    if (uniqueNames.length !== names.length) {
      error = 'Player names must be unique';
      return;
    }

    const state = {
      version: 1,
      players: names,
      teamMembers: [],
      numRounds,
      gameMode,
      pairingMethod,
      scoreTracking,
      numCourts: getAutoCourts(names.length),
      rounds: [],
      currentRound: 0,
      currentScreen: 'rounds'
    };

    const round = generateRound(state);
    state.rounds = [round];
    tournament.set(state);
  }

  function startSelectedTournament() {
    // Validate teams
    for (let i = 0; i < teams.length; i++) {
      const t = teams[i];
      if (!t.name.trim()) {
        error = `Team ${i + 1} needs a name`;
        return;
      }
    }

    const teamNames = teams.map(t => t.name.trim());
    const uniqueNames = [...new Set(teamNames)];
    if (uniqueNames.length !== teamNames.length) {
      error = 'Team names must be unique';
      return;
    }

    if (teamNames.length < 2) {
      error = 'Need at least 2 teams';
      return;
    }

    const members = teams.map(t => [t.player1.trim(), t.player2.trim()]);

    const state = {
      version: 1,
      players: teamNames,
      teamMembers: members,
      numRounds,
      gameMode,
      pairingMethod,
      scoreTracking,
      numCourts: getAutoCourts(teamNames.length),
      rounds: [],
      currentRound: 0,
      currentScreen: 'rounds'
    };

    const round = generateRound(state);
    state.rounds = [round];
    tournament.set(state);
  }
</script>

<div class="setup">
  <section class="card">
    <span class="label">Game Mode</span>
    <div class="radio-group">
      <label class="radio-label">
        <input type="radio" bind:group={gameMode} value="singles" />
        <span>Singles (1v1)</span>
      </label>
      <label class="radio-label">
        <input type="radio" bind:group={gameMode} value="doubles-random" />
        <span>Doubles (random partners)</span>
      </label>
      <label class="radio-label">
        <input type="radio" bind:group={gameMode} value="doubles-selected" />
        <span>Doubles (selected partners)</span>
      </label>
      <label class="radio-label">
        <input type="radio" bind:group={gameMode} value="doubles-rotating" />
        <span>Doubles (rotating partners)</span>
      </label>
    </div>
  </section>

  {#if isSelected}
    <!-- Team builder for doubles-selected -->
    <section class="card">
      <span class="label">Teams</span>
      <div class="hint">Create your teams. Player names are optional.</div>

      <div class="teams-list">
        {#each teams as team, i}
          <div class="team-card">
            <div class="team-header">
              <input
                class="team-name-input"
                type="text"
                bind:value={team.name}
                placeholder="Team name"
              />
              {#if teams.length > 2}
                <button class="remove-btn" onclick={() => removeTeam(i)} aria-label="Remove team">x</button>
              {/if}
            </div>
            <div class="team-players">
              <input
                type="text"
                bind:value={team.player1}
                placeholder="Player 1"
                class="player-input"
              />
              <input
                type="text"
                bind:value={team.player2}
                placeholder="Player 2"
                class="player-input"
              />
            </div>
          </div>
        {/each}
      </div>

      <div class="team-actions">
        <button class="btn-small" onclick={addTeam}>+ Add Team</button>
        <div class="quick-gen">
          <input type="number" bind:value={quickPlayerCount} min="2" max="50" class="quick-input" />
          <button class="btn-small" onclick={generateQuickTeams}>Quick Fill</button>
        </div>
      </div>
    </section>
  {:else}
    <!-- Player name list for other modes -->
    <section class="card">
      <label class="label" for="players">Players (one per line)</label>
      {#if gameMode === 'doubles-random'}
        <div class="hint">Enter individual names. Partners are randomly assigned each round.</div>
      {:else if gameMode === 'doubles-rotating'}
        <div class="hint">Enter individual names. Partners rotate every round.</div>
      {/if}
      <textarea
        id="players"
        bind:value={playerText}
        rows="6"
        placeholder={"Alice\nBob\nCharlie\nDana\nEve\nFrank\nGrace\nHank"}
      ></textarea>
      <div class="quick-gen">
        <span class="quick-label">Quick fill:</span>
        <input type="number" bind:value={quickPlayerCount} min="2" max="50" class="quick-input" />
        <button class="btn-small" onclick={generatePlayerNames}>Generate</button>
      </div>
    </section>
  {/if}

  <section class="card">
    <label class="label" for="rounds">Number of Rounds</label>
    <input id="rounds" type="number" bind:value={numRounds} min="1" max="50" />
  </section>

  <section class="card">
    <span class="label">Pairing Method</span>
    <div class="radio-group">
      <label class="radio-label">
        <input type="radio" bind:group={pairingMethod} value="variety" />
        <div>
          <span>Maximize Variety</span>
          <span class="desc">Everyone plays different opponents each round.</span>
        </div>
      </label>
      <label class="radio-label">
        <input type="radio" bind:group={pairingMethod} value="swiss" />
        <div>
          <span>Swiss-style</span>
          <span class="desc">Players with similar records face each other. More competitive later rounds.</span>
        </div>
      </label>
    </div>
  </section>

  <section class="card">
    <span class="label">Score Tracking</span>
    <div class="radio-group">
      <label class="radio-label">
        <input type="radio" bind:group={scoreTracking} value="simple" />
        <span>Simple (pick winner or draw)</span>
      </label>
      <label class="radio-label">
        <input type="radio" bind:group={scoreTracking} value="full" />
        <span>Full scores (point differential tiebreaker)</span>
      </label>
    </div>
  </section>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  <button class="btn primary" onclick={startTournament}>Start Tournament</button>
</div>

<style>
  .setup {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .card {
    background: white;
    border-radius: 10px;
    padding: 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  .label {
    display: block;
    font-weight: 600;
    font-size: 0.9rem;
    margin-bottom: 8px;
    color: #2d6a4f;
  }

  .hint {
    font-size: 0.82rem;
    color: #777;
    margin-bottom: 8px;
    line-height: 1.3;
  }

  textarea {
    width: 100%;
    padding: 10px;
    border: 1.5px solid #d0d7d0;
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
    resize: vertical;
  }

  textarea:focus, input[type="number"]:focus, input[type="text"]:focus {
    outline: none;
    border-color: #2d6a4f;
    box-shadow: 0 0 0 2px rgba(45,106,79,0.2);
  }

  input[type="number"] {
    width: 80px;
    padding: 8px 10px;
    border: 1.5px solid #d0d7d0;
    border-radius: 8px;
    font-size: 1rem;
  }

  .quick-gen {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
  }

  .quick-label {
    font-size: 0.85rem;
    color: #777;
  }

  .quick-input {
    width: 60px !important;
    padding: 6px 8px !important;
    font-size: 0.9rem !important;
  }

  .btn-small {
    padding: 6px 14px;
    border: 1.5px solid #2d6a4f;
    border-radius: 6px;
    background: white;
    color: #2d6a4f;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    white-space: nowrap;
  }

  .btn-small:active {
    background: #d8f3dc;
  }

  /* Team builder styles */
  .teams-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 10px;
  }

  .team-card {
    background: #f6f9f6;
    border: 1.5px solid #e0e8e0;
    border-radius: 8px;
    padding: 10px;
  }

  .team-header {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }

  .team-name-input {
    flex: 1;
    padding: 8px 10px;
    border: 1.5px solid #d0d7d0;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .remove-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    background: #fde8e8;
    color: #c53030;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }

  .team-players {
    display: flex;
    gap: 8px;
  }

  .player-input {
    flex: 1;
    padding: 7px 10px;
    border: 1.5px solid #d0d7d0;
    border-radius: 6px;
    font-size: 0.9rem;
  }

  .team-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .radio-label {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 0;
    font-size: 0.95rem;
    cursor: pointer;
  }

  .radio-label input[type="radio"] {
    width: 18px;
    height: 18px;
    accent-color: #2d6a4f;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .desc {
    display: block;
    font-size: 0.8rem;
    color: #888;
    margin-top: 2px;
    line-height: 1.3;
  }

  .error {
    background: #fde8e8;
    color: #c53030;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .btn {
    display: block;
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 10px;
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .primary {
    background: #2d6a4f;
    color: white;
  }

  .primary:active {
    background: #1b4332;
  }
</style>
