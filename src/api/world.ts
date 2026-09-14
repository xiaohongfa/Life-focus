import { tauriInvoke } from './core';
import type {
  Leader,
  Situation,
  Philosophy,
  Ideology,
  NationalSpirit,
} from './types';

export const worldApi = {
  // World objects
  getLeader: (lifeId: string) => tauriInvoke<Leader | null>('get_leader', { lifeId }),
  updateLeader: (lifeId: string, name: string, bodyMd: string, portraitAttachmentId?: string) =>
    tauriInvoke<void>('update_leader', { lifeId, name, bodyMd, portraitAttachmentId }),
  getSituation: (lifeId: string) => tauriInvoke<Situation | null>('get_situation', { lifeId }),
  updateSituation: (lifeId: string, bodyMd: string) => tauriInvoke<void>('update_situation', { lifeId, bodyMd }),
  getPhilosophy: (lifeId: string) => tauriInvoke<Philosophy | null>('get_philosophy', { lifeId }),
  updatePhilosophy: (lifeId: string, bodyMd: string) => tauriInvoke<void>('update_philosophy', { lifeId, bodyMd }),

  // Ideologies & Spirits
  getIdeologies: (lifeId: string, includeArchived = false) =>
    tauriInvoke<Ideology[]>('get_ideologies', { lifeId, includeArchived }),
  createIdeology: (lifeId: string, title: string, bodyMd: string, icon?: string) =>
    tauriInvoke<Ideology>('create_ideology', { lifeId, title, bodyMd, icon }),
  updateIdeology: (lifeId: string, id: string, title: string, bodyMd: string, icon?: string | null) =>
    tauriInvoke<Ideology>('update_ideology', { lifeId, id, title, bodyMd, icon }),
  archiveIdeology: (lifeId: string, ideologyId: string, archive: boolean) =>
    tauriInvoke<void>('archive_ideology', { lifeId, ideologyId, archive }),
  deleteIdeology: (lifeId: string, id: string) =>
    tauriInvoke<void>('delete_ideology', { lifeId, id }),
  getNationalSpirits: (lifeId: string, includeArchived = false) =>
    tauriInvoke<NationalSpirit[]>('get_national_spirits', { lifeId, includeArchived }),
  createNationalSpirit: (lifeId: string, title: string, bodyMd: string, icon?: string) =>
    tauriInvoke<NationalSpirit>('create_national_spirit', { lifeId, title, bodyMd, icon }),
  updateNationalSpirit: (lifeId: string, id: string, title: string, bodyMd: string, icon?: string | null) =>
    tauriInvoke<NationalSpirit>('update_national_spirit', { lifeId, id, title, bodyMd, icon }),
  archiveNationalSpirit: (lifeId: string, spiritId: string, archive: boolean) =>
    tauriInvoke<void>('archive_national_spirit', { lifeId, spiritId, archive }),
  deleteNationalSpirit: (lifeId: string, id: string) =>
    tauriInvoke<void>('delete_national_spirit', { lifeId, id }),
};
