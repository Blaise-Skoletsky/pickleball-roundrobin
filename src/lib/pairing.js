/**
 * Round-robin pairing algorithms.
 *
 * Game modes:
 *   singles          – 1v1
 *   doubles-random   – 2v2, random partners each round
 *   doubles-selected – 2v2, fixed teams with team names (paired like singles)
 *   doubles-rotating – 2v2, partners rotate each round
 */

/** Build opponent count matrix from existing rounds */
function buildOpponentMatrix(playerCount, rounds) {
  const matrix = Array.from({ length: playerCount }, () => new Array(playerCount).fill(0));
  for (const round of rounds) {
    for (const match of round.matches) {
      for (const a of match.team1) {
        for (const b of match.team2) {
          matrix[a][b]++;
          matrix[b][a]++;
        }
      }
    }
  }
  return matrix;
}

/** Build partner count matrix from existing rounds (for rotating doubles) */
function buildPartnerMatrix(playerCount, rounds) {
  const matrix = Array.from({ length: playerCount }, () => new Array(playerCount).fill(0));
  for (const round of rounds) {
    for (const match of round.matches) {
      for (const team of [match.team1, match.team2]) {
        if (team.length === 2) {
          matrix[team[0]][team[1]]++;
          matrix[team[1]][team[0]]++;
        }
      }
    }
  }
  return matrix;
}

/** Count games played per player/team index */
function buildGamesPlayed(playerCount, rounds) {
  const counts = new Array(playerCount).fill(0);
  for (const round of rounds) {
    for (const match of round.matches) {
      for (const p of [...match.team1, ...match.team2]) {
        counts[p]++;
      }
    }
  }
  return counts;
}

/** Count sets won per side in a match. Returns {t1: number, t2: number} */
export function countSetsWon(match) {
  let t1 = 0, t2 = 0;
  if (!match.sets) return { t1, t2 };
  for (const set of match.sets) {
    if (set.s1 != null && set.s2 != null) {
      if (set.s1 > set.s2) t1++;
      else if (set.s2 > set.s1) t2++;
    }
  }
  return { t1, t2 };
}

/** Get records: { wins, losses, draws, setsWon, setsLost } */
function buildRecords(playerCount, rounds) {
  const records = Array.from({ length: playerCount }, () => ({
    wins: 0, losses: 0, draws: 0, setsWon: 0, setsLost: 0
  }));
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.winner === null) continue;
      if (match.winner === 'draw') {
        for (const p of [...match.team1, ...match.team2]) records[p].draws++;
      } else {
        const winners = match.winner === 1 ? match.team1 : match.team2;
        const losers = match.winner === 1 ? match.team2 : match.team1;
        for (const p of winners) records[p].wins++;
        for (const p of losers) records[p].losses++;
      }
      const sw = countSetsWon(match);
      for (const p of match.team1) { records[p].setsWon += sw.t1; records[p].setsLost += sw.t2; }
      for (const p of match.team2) { records[p].setsWon += sw.t2; records[p].setsLost += sw.t1; }
    }
  }
  return records;
}

/** Shuffle array in place */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate the next round of matches.
 */
export function generateRound(state) {
  const { players, gameMode, pairingMethod, numCourts, rounds } = state;
  const n = players.length;
  const opponentMatrix = buildOpponentMatrix(n, rounds);
  const gamesPlayed = buildGamesPlayed(n, rounds);

  const unitsPerMatch = (gameMode === 'singles' || gameMode === 'doubles-selected') ? 2 : 4;
  const maxMatches = numCourts;
  const maxUnits = maxMatches * unitsPerMatch;

  const allIndices = Array.from({ length: n }, (_, i) => i);
  const playing = Math.min(n, maxUnits);
  const actualPlaying = Math.floor(playing / unitsPerMatch) * unitsPerMatch;

  const shuffled = shuffle([...allIndices]);
  shuffled.sort((a, b) => gamesPlayed[a] - gamesPlayed[b]);

  const active = shuffled.slice(0, actualPlaying);
  const byes = shuffled.slice(actualPlaying);

  let matches;
  if (gameMode === 'singles' || gameMode === 'doubles-selected') {
    matches = pairSingles(active, opponentMatrix, pairingMethod, n, rounds);
  } else if (gameMode === 'doubles-random') {
    matches = pairDoublesRandom(active, opponentMatrix, pairingMethod, n, rounds);
  } else {
    const partnerMatrix = buildPartnerMatrix(n, rounds);
    matches = pairDoublesRotating(active, opponentMatrix, partnerMatrix, pairingMethod, n, rounds);
  }

  matches.forEach((m, i) => { m.court = i + 1; });

  return { roundNum: rounds.length + 1, matches, byes };
}

function makeMatch(team1, team2) {
  return {
    court: 0,
    team1,
    team2,
    winner: null,
    sets: [{ s1: null, s2: null }]
  };
}

function pairSingles(players, opponentMatrix, method, playerCount, rounds) {
  const ordered = orderPlayers(players, method, playerCount, rounds);
  const matches = [];
  const used = new Set();

  for (let i = 0; i < ordered.length; i++) {
    const a = ordered[i];
    if (used.has(a)) continue;

    let bestOpponent = null;
    let bestScore = Infinity;

    for (let j = i + 1; j < ordered.length; j++) {
      const b = ordered[j];
      if (used.has(b)) continue;
      const score = opponentMatrix[a][b];
      if (score < bestScore) {
        bestScore = score;
        bestOpponent = b;
      }
    }

    if (bestOpponent !== null) {
      used.add(a);
      used.add(bestOpponent);
      matches.push(makeMatch([a], [bestOpponent]));
    }
  }

  return matches;
}

function pairDoublesRandom(players, opponentMatrix, method, playerCount, rounds) {
  const ordered = orderPlayers(players, method, playerCount, rounds);
  const matches = [];

  for (let i = 0; i < ordered.length - 3; i += 4) {
    const group = ordered.slice(i, i + 4);
    const best = findBestDoublesPairing(group, opponentMatrix);
    matches.push(makeMatch(best[0], best[1]));
  }

  return matches;
}

function pairDoublesRotating(players, opponentMatrix, partnerMatrix, method, playerCount, rounds) {
  const ordered = orderPlayers(players, method, playerCount, rounds);
  const matches = [];

  for (let i = 0; i < ordered.length - 3; i += 4) {
    const group = ordered.slice(i, i + 4);
    const best = findBestRotatingPairing(group, opponentMatrix, partnerMatrix);
    matches.push(makeMatch(best[0], best[1]));
  }

  return matches;
}

/** Order players/teams based on pairing method */
function orderPlayers(players, method, playerCount, rounds) {
  if (method === 'swiss' && rounds.length > 0) {
    const records = buildRecords(playerCount, rounds);
    const arr = [...players];
    arr.sort((a, b) => {
      const wd = records[b].wins - records[a].wins;
      if (wd !== 0) return wd;
      const sd = records[b].setsWon - records[a].setsWon;
      if (sd !== 0) return sd;
      const dd = records[b].draws - records[a].draws;
      if (dd !== 0) return dd;
      return Math.random() - 0.5;
    });
    return arr;
  }
  return shuffle([...players]);
}

function findBestDoublesPairing(group, opponentMatrix) {
  const splits = [
    [[group[0], group[1]], [group[2], group[3]]],
    [[group[0], group[2]], [group[1], group[3]]],
    [[group[0], group[3]], [group[1], group[2]]]
  ];

  let best = splits[0];
  let bestScore = Infinity;

  for (const [t1, t2] of splits) {
    let score = 0;
    for (const a of t1) {
      for (const b of t2) {
        score += opponentMatrix[a][b];
      }
    }
    if (score < bestScore) {
      bestScore = score;
      best = [t1, t2];
    }
  }

  return best;
}

function findBestRotatingPairing(group, opponentMatrix, partnerMatrix) {
  const splits = [
    [[group[0], group[1]], [group[2], group[3]]],
    [[group[0], group[2]], [group[1], group[3]]],
    [[group[0], group[3]], [group[1], group[2]]]
  ];

  let best = splits[0];
  let bestScore = Infinity;

  for (const [t1, t2] of splits) {
    let score = 0;
    for (const a of t1) {
      for (const b of t2) {
        score += opponentMatrix[a][b] * 2;
      }
    }
    score += partnerMatrix[t1[0]][t1[1]] * 3;
    score += partnerMatrix[t2[0]][t2[1]] * 3;

    if (score < bestScore) {
      bestScore = score;
      best = [t1, t2];
    }
  }

  return best;
}

/** Compute standings from tournament state */
export function computeStandings(state) {
  const { players, rounds } = state;
  const n = players.length;
  const records = buildRecords(n, rounds);
  const gamesPlayed = buildGamesPlayed(n, rounds);

  const standings = players.map((name, i) => ({
    index: i,
    name,
    wins: records[i].wins,
    losses: records[i].losses,
    draws: records[i].draws,
    setsWon: records[i].setsWon,
    setsLost: records[i].setsLost,
    gamesPlayed: gamesPlayed[i]
  }));

  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (state.scoreTracking === 'full' && b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
    if (b.draws !== a.draws) return b.draws - a.draws;
    return a.gamesPlayed - b.gamesPlayed;
  });

  return standings;
}
