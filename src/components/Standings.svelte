<script>
  import { tournament } from '../lib/state.js';
  import { computeStandings } from '../lib/pairing.js';

  let standings = $derived(computeStandings($tournament));
  let showFullScoring = $derived($tournament.scoreTracking === 'full');
  let isSelectedDoubles = $derived($tournament.gameMode === 'doubles-selected');
</script>

{#if standings.length > 0}
  <div class="standings">
    <h3>Standings</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="rank">#</th>
            <th class="name">{isSelectedDoubles ? 'Team' : 'Player'}</th>
            <th>W</th>
            <th>L</th>
            <th>D</th>
            {#if showFullScoring}
              <th>GW</th>
              <th>GL</th>
              <th>PW</th>
              <th>PL</th>
              <th>PD</th>
            {/if}
            <th>GP</th>
          </tr>
        </thead>
        <tbody>
          {#each standings as row, i}
            <tr>
              <td class="rank">{i + 1}</td>
              <td class="name">{row.name}</td>
              <td>{row.wins}</td>
              <td>{row.losses}</td>
              <td>{row.draws}</td>
              {#if showFullScoring}
                <td class="positive">{row.gamesWon}</td>
                <td class="negative">{row.gamesLost}</td>
                <td class="positive">{row.pointsWon}</td>
                <td class="negative">{row.pointsLost}</td>
                <td class:positive={row.pointDiff > 0} class:negative={row.pointDiff < 0}>{row.pointDiff}</td>
              {/if}
              <td>{row.gamesPlayed}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}

<style>
  .standings {
    background: white;
    border-radius: 10px;
    padding: 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  h3 {
    font-size: 1rem;
    color: #2d6a4f;
    margin-bottom: 10px;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  th, td {
    padding: 8px 6px;
    text-align: center;
  }

  th {
    font-weight: 700;
    color: #555;
    border-bottom: 2px solid #e8e8e8;
    font-size: 0.8rem;
    text-transform: uppercase;
  }

  td {
    border-bottom: 1px solid #f0f0f0;
  }

  .rank {
    width: 30px;
    color: #999;
  }

  .name {
    text-align: left;
    font-weight: 600;
  }

  .positive { color: #2d6a4f; }
  .negative { color: #c53030; }

  tr:last-child td { border-bottom: none; }
</style>
