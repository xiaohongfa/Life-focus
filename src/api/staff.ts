import { tauriInvoke } from './core';
import type { StaffMember, StaffMeeting } from './types';

export const staffApi = {
  getStaffMembers: (lifeId: string) =>
    tauriInvoke<StaffMember[]>('get_staff_members', { lifeId }),
  createStaffMember: (lifeId: string, name: string, role: string, prompt: string, model?: string) =>
    tauriInvoke<StaffMember>('create_staff_member', { lifeId, name, role, prompt, model }),
  updateStaffMember: (lifeId: string, memberId: string, name: string, role: string, prompt: string, enabled: boolean) =>
    tauriInvoke<void>('update_staff_member', { lifeId, memberId, name, role, prompt, enabled }),
  deleteStaffMember: (lifeId: string, memberId: string) =>
    tauriInvoke<void>('delete_staff_member', { lifeId, memberId }),
  getStaffMeetings: (lifeId: string) =>
    tauriInvoke<StaffMeeting[]>('get_staff_meetings', { lifeId }),
  createStaffMeeting: (
    lifeId: string,
    topic: string,
    confirmedMinutesMd: string,
    contextModuleNames: string,
    rounds: number,
    messages: [string, number, string][]
  ) =>
    tauriInvoke<StaffMeeting>('create_staff_meeting', {
      lifeId,
      topic,
      confirmedMinutesMd,
      contextModuleNames,
      rounds,
      messages,
    }),
};
