<script>
  import { updateTournament } from '../lib/state.js';
  import { countSetsWon } from '../lib/pairing.js';

  let { match, roundIndex, matchIndex, players, scoreTracking, teamMembers, gameMode } = $props();

  let hasResult = $derived(match.winner !== null);
  let isDraw = $derived(match.winner === 'draw');
  let setsWon = $derived(countSetsWon(match));

  function teamLabel(indices) {
    if (gameMode === 'doubles-selected') {
      const idx = indices[0];
      const name = players[idx];
      const members = teamMembers?.[idx];
      if (members && (members[0] || members[1])) {
        return { name, sub: members.filter(Boolean).join(' & ') };
      }
      return { name, sub: null };
    }
    return { name: indices.map(i => players[i]).join(' & '), sub: null };
  }

  let label1 = $derived(teamLabel(match.team1));
  let label2 = $derived(teamLabel(match.team2));

  function selectWinner(team) {
    updateTournament(s => {
      const m = s.rounds[roundIndex].matches[matchIndex];
      m.winner = m.winner === team ? null : team;
    });
  }

  function selectDraw() {
    updateTournament(s => {
      const m = s.rounds[roundIndex].matches[matchIndex];
      m.winner = m.winner === 'draw' ? null : 'draw';
    });
  }

  function updateSetScore(setIdx, side, value) {
    const num = value === '' ? null : parseInt(value, 10);
    updateTournament(s => {
      const m = s.rounds[roundIndex].matches[matchIndex];
      if (side === 1) m.sets[setIdx].s1 = num;
      else m.sets[setIdx].s2 = num;
      // Auto-determine winner from sets
      autoWinnerFromSets(m);
    });
  }

  function addSet() {
    updateTournament(s => {
      const m = s.rounds[roundIndex].matches[matchIndex];
      m.sets.push({ s1: null, s2: null });
    });
  }

  function removeSet(setIdx) {
    updateTournament(s => {
      const m = s.rounds[roundIndex].matches[matchIndex];
      if (m.sets.length <= 1) return;
      m.sets.splice(setIdx, 1);
      autoWinnerFromSets(m);
    });
  }

  function autoWinnerFromSets(m) {
    const sw = countSetsWon(m);
    if (sw.t1 === 0 && sw.t2 === 0) {
      m.winner = null;
    } else if (sw.t1 > sw.t2) {
      m.winner = 1;
    } else if (sw.t2 > sw.t1) {
      m.winner = 2;
    } else {
      m.winner = 'draw';
    }
  }
</script>

<div class="match-card">
  <div class="court-label">Court {match.court}</div>

  <div class="teams">
    <button
      class="team-btn"
      class:winner={match.winner === 1}
      class:loser={hasResult && match.winner !== 1 && !isDraw}
      class:draw={isDraw}
      onclick={() => selectWinner(1)}
    >
      <span class="team-name">{label1.name}</span>
      {#if label1.sub}
        <span class="team-sub">{label1.sub}</span>
      {/if}
    </button>

    <span class="vs">vs</span>

    <button
      class="team-btn"
      class:winner={match.winner === 2}
      class:loser={hasResult && match.winner !== 2 && !isDraw}
      class:draw={isDraw}
      onclick={() => selectWinner(2)}
    >
      <span class="team-name">{label2.name}</span>
      {#if label2.sub}
        <span class="team-sub">{label2.sub}</span>
      {/if}
    </button>
  </div>

  <div class="draw-row">
    <button
      class="draw-btn"
      class:active={isDraw}
      onclick={selectDraw}
    >
      Draw
    </button>
  </div>

  {#if scoreTracking === 'full'}
    <div class="sets-section">
      <div class="sets-header">
        <span class="sets-label">Sets ({setsWon.t1} - {setsWon.t2})</span>
        <button class="set-add-btn" onclick={addSet}>+ Set</button>
      </div>
      {#each match.sets as set, si}
        <div class="set-row">
          <span class="set-num">{si + 1}</span>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={set.s1 ?? ''}
            oninput={(e) => updateSetScore(si, 1, e.target.value)}
          />
          <span class="set-dash">-</span>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={set.s2 ?? ''}
            oninput={(e) => updateSetScore(si, 2, e.target.value)}
          />
          {#if match.sets.length > 1}
            <button class="set-remove-btn" onclick={() => removeSet(si)}>x</button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .match-card {
    background: white;
    border-radius: 10px;
    padding: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  .court-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .teams {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .vs {
    font-size: 0.8rem;
    color: #999;
    font-weight: 600;
    flex-shrink: 0;
  }

  .team-btn {
    flex: 1;
    padding: 12px 8px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    background: #fafafa;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
    min-height: 48px;
    word-break: break-word;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
  }

  .team-name { font-weight: 600; }
  .team-sub { font-size: 0.75rem; color: #888; font-weight: 400; }

  .team-btn:active { transform: scale(0.97); }

  .team-btn.winner { border-color: #2d6a4f; background: #d8f3dc; color: #1b4332; }
  .team-btn.winner .team-sub { color: #3a7d5c; }

  .team-btn.loser { border-color: #e8a0a0; background: #fde8e8; color: #8b4444; opacity: 0.75; }
  .team-btn.loser .team-sub { color: #b06060; }

  .team-btn.draw { border-color: #c9b458; background: #fef9e7; color: #7a6c1e; }
  .team-btn.draw .team-sub { color: #9a8c3e; }

  .draw-row {
    display: flex;
    justify-content: center;
    margin-top: 8px;
  }

  .draw-btn {
    padding: 6px 24px;
    border: 1.5px solid #ddd;
    border-radius: 6px;
    background: #fafafa;
    font-size: 0.8rem;
    font-weight: 600;
    color: #999;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.15s;
  }

  .draw-btn.active { border-color: #c9b458; background: #fef9e7; color: #7a6c1e; }
  .draw-btn:active { transform: scale(0.97); }

  /* Sets section */
  .sets-section {
    margin-top: 10px;
    border-top: 1px solid #f0f0f0;
    padding-top: 10px;
  }

  .sets-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .sets-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #666;
  }

  .set-add-btn {
    padding: 4px 10px;
    border: 1px solid #d0d7d0;
    border-radius: 4px;
    background: white;
    font-size: 0.75rem;
    font-weight: 600;
    color: #2d6a4f;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .set-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    justify-content: center;
  }

  .set-num {
    font-size: 0.75rem;
    color: #aaa;
    width: 16px;
    text-align: right;
    flex-shrink: 0;
  }

  .set-row input {
    width: 56px;
    padding: 6px;
    border: 1.5px solid #d0d7d0;
    border-radius: 6px;
    font-size: 0.95rem;
    text-align: center;
  }

  .set-row input:focus {
    outline: none;
    border-color: #2d6a4f;
  }

  .set-dash {
    font-weight: 700;
    color: #999;
    flex-shrink: 0;
  }

  .set-remove-btn {
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 4px;
    background: #fde8e8;
    color: #c53030;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }
</style>
