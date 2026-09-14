import { tauriInvoke } from './core';
import type { Trait, TraitRelation } from './types';

export const traitApi = {
  getTraits: (lifeId: string, includeArchived = false) =>
    tauriInvoke<Trait[]>('get_traits', { lifeId, includeArchived }),
  createTrait: (lifeId: string, title: string, bodyMd: string, icon?: string) =>
    tauriInvoke<Trait>('create_trait', { lifeId, title, bodyMd, icon }),
  archiveTrait: (lifeId: string, traitId: string, archive: boolean) =>
    tauriInvoke<void>('archive_trait', { lifeId, traitId, archive }),
  updateTrait: (lifeId: string, id: string, title: string, bodyMd: string, icon?: string | null) =>
    tauriInvoke<Trait>('update_trait', { lifeId, id, title, bodyMd, icon }),
  setActiveTraitStage: (lifeId: string, groupTraitIds: string[], activeTraitId: string) =>
    tauriInvoke<void>('set_active_trait_stage', { lifeId, groupTraitIds, activeTraitId }),
  setTraitEquipped: (lifeId: string, traitIds: string[], equip: boolean, targetActiveId?: string) =>
    tauriInvoke<void>('set_trait_equipped', { lifeId, traitIds, equip, targetActiveId }),
  deleteTrait: (lifeId: string, traitId: string) =>
    tauriInvoke<void>('delete_trait', { lifeId, traitId }),
  getTraitRelations: (lifeId: string) =>
    tauriInvoke<TraitRelation[]>('get_trait_relations', { lifeId }),
  addTraitRelation: (lifeId: string, predecessorId: string, successorId: string, note?: string) =>
    tauriInvoke<TraitRelation>('add_trait_relation', { lifeId, predecessorId, successorId, note }),
  deleteTraitRelation: (lifeId: string, relationId: string) =>
    tauriInvoke<void>('delete_trait_relation', { lifeId, relationId }),
};
