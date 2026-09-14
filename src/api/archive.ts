import { tauriInvoke } from './core';
import type { Event, Essay, ArchiveItem, WorldSnapshot } from './types';

export const archiveApi = {
  // Events & Essays
  getEvents: (lifeId: string) => tauriInvoke<Event[]>('get_events', { lifeId }),
  createEvent: (
    lifeId: string,
    title: string,
    bodyMd: string,
    kind: 'normal' | 'super',
    occurredOn: string,
    quote?: string,
    imageAttachmentId?: string,
    snapshotId?: string
  ) =>
    tauriInvoke<Event>('create_event', {
      lifeId,
      title,
      bodyMd,
      kind,
      occurredOn,
      imageAttachmentId,
      quote,
      snapshotId,
    }),
  getEssays: (lifeId: string) => tauriInvoke<Essay[]>('get_essays', { lifeId }),
  createEssay: (lifeId: string, title: string, bodyMd: string) =>
    tauriInvoke<Essay>('create_essay', { lifeId, title, bodyMd }),
  updateEssay: (lifeId: string, id: string, title: string, bodyMd: string) =>
    tauriInvoke<Essay>('update_essay', { lifeId, id, title, bodyMd }),
  deleteEssay: (lifeId: string, id: string) =>
    tauriInvoke<void>('delete_essay', { lifeId, id }),

  // Archive & Snapshots
  getArchiveFeed: (lifeId: string, filterType?: string) =>
    tauriInvoke<ArchiveItem[]>('get_archive_feed', { lifeId, filterType }),
  createWorldSnapshot: (lifeId: string, name: string, description: string | undefined, payloadJson: string) =>
    tauriInvoke<WorldSnapshot>('create_world_snapshot', { lifeId, name, description, payloadJson }),
  listWorldSnapshots: (lifeId: string) => tauriInvoke<WorldSnapshot[]>('list_world_snapshots', { lifeId }),
  deleteWorldSnapshot: (lifeId: string, snapshotId: string) =>
    tauriInvoke<void>('delete_world_snapshot', { lifeId, snapshotId }),
};
