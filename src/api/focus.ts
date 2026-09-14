import { tauriInvoke } from './core';
import type {
  Focus,
  FocusRelation,
  FocusStatus,
  FocusStatusHistory,
  FocusSubItem,
} from './types';

export const focusApi = {
  getFoci: (lifeId: string) => tauriInvoke<Focus[]>('get_foci', { lifeId }),
  getFocusRelations: (lifeId: string) => tauriInvoke<FocusRelation[]>('get_focus_relations', { lifeId }),
  createFocus: (
    lifeId: string,
    title: string,
    bodyMd: string,
    status: FocusStatus,
    positionX: number,
    positionY: number,
    icon?: string,
    imageAttachmentId?: string
  ) =>
    tauriInvoke<Focus>('create_focus', {
      lifeId,
      title,
      bodyMd,
      icon,
      imageAttachmentId,
      status,
      positionX,
      positionY,
    }),
  updateFocusStatus: (
    lifeId: string,
    focusId: string,
    newStatus: FocusStatus,
    reason?: string,
    sourceType?: string,
    sourceId?: string
  ) =>
    tauriInvoke<void>('update_focus_status', {
      lifeId,
      focusId,
      newStatus,
      reason,
      sourceType,
      sourceId,
    }),
  updateFocusPosition: (lifeId: string, focusId: string, positionX: number, positionY: number) =>
    tauriInvoke<void>('update_focus_position', { lifeId, focusId, positionX, positionY }),
  updateFocusContent: (
    lifeId: string,
    focusId: string,
    title: string,
    bodyMd: string,
    icon?: string,
    imageAttachmentId?: string
  ) =>
    tauriInvoke<void>('update_focus_content', {
      lifeId,
      focusId,
      title,
      bodyMd,
      icon,
      imageAttachmentId,
    }),
  deleteFocus: (lifeId: string, focusId: string) => tauriInvoke<void>('delete_focus', { lifeId, focusId }),
  addFocusRelation: (
    lifeId: string,
    sourceId: string,
    targetId: string,
    relationType: 'prerequisite' | 'mutually_exclusive',
    note?: string
  ) =>
    tauriInvoke<FocusRelation>('add_focus_relation', {
      lifeId,
      sourceId,
      targetId,
      relationType,
      note,
    }),
  deleteFocusRelation: (lifeId: string, relationId: string) =>
    tauriInvoke<void>('delete_focus_relation', { lifeId, relationId }),
  getFocusHistory: (lifeId: string, focusId?: string) =>
    tauriInvoke<FocusStatusHistory[]>('get_focus_history', { lifeId, focusId }),

  // Sub-Focus
  getSubFoci: (lifeId: string, focusId: string) =>
    tauriInvoke<FocusSubItem[]>('get_sub_foci', { lifeId, focusId }),
  listAllSubFoci: (lifeId: string) =>
    tauriInvoke<FocusSubItem[]>('list_all_sub_foci', { lifeId }),
  createSubFocus: (lifeId: string, focusId: string, title: string, bodyMd?: string) =>
    tauriInvoke<FocusSubItem>('create_sub_focus', { lifeId, focusId, title, bodyMd }),
  updateSubFocusStatus: (lifeId: string, subId: string, status: string) =>
    tauriInvoke<void>('update_sub_focus_status', { lifeId, subId, status }),
  deleteSubFocus: (lifeId: string, subId: string) =>
    tauriInvoke<void>('delete_sub_focus', { lifeId, subId }),
};
