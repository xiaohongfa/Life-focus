import { tauriInvoke } from './core';

export const exportApi = {
  exportLifeMarkdown: (lifeId: string) =>
    tauriInvoke<string>('export_life_markdown', { lifeId }),
  exportLifeJson: (lifeId: string) =>
    tauriInvoke<string>('export_life_json', { lifeId }),
};
