import { tauriInvoke } from './core';
import type { Life, WorldOverview, Stability, StabilityChange } from './types';

export const lifeApi = {
  listLives: () => tauriInvoke<Life[]>('list_lives'),
  createLife: (name: string) => tauriInvoke<Life>('create_life', { name }),
  renameLife: (lifeId: string, name: string) => tauriInvoke<void>('rename_life', { lifeId, name }),
  deleteLife: (lifeId: string) => tauriInvoke<void>('delete_life', { lifeId }),
  getWorldOverview: (lifeId: string) => tauriInvoke<WorldOverview | null>('get_world_overview', { lifeId }),

  // Stability
  getStability: (lifeId: string) => tauriInvoke<Stability>('get_stability', { lifeId }),
  setStability: (lifeId: string, newValue: number, reason?: string, sourceType?: string, sourceId?: string) =>
    tauriInvoke<StabilityChange>('set_stability', { lifeId, newValue, reason, sourceType, sourceId }),
  getStabilityHistory: (lifeId: string, limit?: number) =>
    tauriInvoke<StabilityChange[]>('get_stability_history', { lifeId, limit }),
};
