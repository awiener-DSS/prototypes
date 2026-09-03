import type { ActionStore } from '@/lib/actions';
import type { OutcomeRecord } from '@/lib/learning';

type OutcomeStore = { version: 1; items: OutcomeRecord[] };

type MemoryStore = {
  actions: ActionStore;
  outcomes: OutcomeStore;
  hydrated: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __commerceAnalystStore: MemoryStore | undefined;
}

const memoryStore: MemoryStore = globalThis.__commerceAnalystStore ??= {
  actions: { version: 1, actions: [] },
  outcomes: { version: 1, items: [] },
  hydrated: false,
};

function hydrateFromDisk() {
  if (memoryStore.hydrated) return;
  memoryStore.hydrated = true;
  try {
    // Optional Node disk persistence when the dashboard runs outside Workers.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { existsSync, readFileSync } = require('node:fs') as typeof import('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { join } = require('node:path') as typeof import('node:path');
    const dataDir = join(process.cwd(), '..', 'data');
    const actionsPath = join(dataDir, 'actions.json');
    const outcomesPath = join(dataDir, 'outcomes.json');
    if (existsSync(actionsPath)) {
      memoryStore.actions = JSON.parse(readFileSync(actionsPath, 'utf8')) as ActionStore;
    }
    if (existsSync(outcomesPath)) {
      memoryStore.outcomes = JSON.parse(readFileSync(outcomesPath, 'utf8')) as OutcomeStore;
    }
  } catch {
    // Workers dev keeps the in-memory store.
  }
}

function persistToDisk() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { existsSync, mkdirSync, writeFileSync } = require('node:fs') as typeof import('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { join } = require('node:path') as typeof import('node:path');
    const dataDir = join(process.cwd(), '..', 'data');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, 'actions.json'), `${JSON.stringify(memoryStore.actions, null, 2)}\n`, 'utf8');
    writeFileSync(join(dataDir, 'outcomes.json'), `${JSON.stringify(memoryStore.outcomes, null, 2)}\n`, 'utf8');
  } catch {
    // Workers dev: in-memory only.
  }
}

export function readActions(): ActionStore {
  hydrateFromDisk();
  return memoryStore.actions;
}

export function writeActions(store: ActionStore): ActionStore {
  hydrateFromDisk();
  memoryStore.actions = store;
  persistToDisk();
  return store;
}

export function readOutcomes(): OutcomeStore {
  hydrateFromDisk();
  return memoryStore.outcomes;
}

export function writeOutcomes(store: OutcomeStore) {
  hydrateFromDisk();
  memoryStore.outcomes = store;
  persistToDisk();
  return store;
}
