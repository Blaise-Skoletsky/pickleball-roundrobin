import { writable } from 'svelte/store';

const STORAGE_KEY = 'roundrobin';

const defaultState = {
  version: 1,
  players: [],
  teamMembers: [],     // doubles-selected only: [["Alice","Bob"], ["Charlie","Dana"]]
  numRounds: 5,
  gameMode: 'doubles-rotating',
  pairingMethod: 'variety',
  scoreTracking: 'simple',
  numCourts: 1,
  rounds: [],
  currentRound: 0,
  currentScreen: 'setup'
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.version === 1) return { ...defaultState, ...parsed };
    }
  } catch (e) {
    // ignore corrupt data
  }
  return { ...defaultState };
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // storage full or unavailable
  }
}

export const tournament = writable(loadState());

tournament.subscribe(saveState);

export function updateTournament(fn) {
  tournament.update(state => {
    const clone = structuredClone(state);
    fn(clone);
    return clone;
  });
}

export function resetTournament() {
  localStorage.removeItem(STORAGE_KEY);
  tournament.set({ ...defaultState });
}
