import * as migration_20261113_060305_initial_payload from './20261113_060305_initial_payload';

export const migrations = [
  {
    up: migration_20261113_060305_initial_payload.up,
    down: migration_20261113_060305_initial_payload.down,
    name: '20261113_060305_initial_payload'
  },
];
