import { tauriInvoke } from './core';

export interface PortableStatus {
  is_portable: boolean;
  data_dir: string;
  db_exists: boolean;
  db_size_bytes: number;
  has_llm_vault: boolean;
}

export interface PortableCandidate {
  folder_name: string;
  full_path: string;
  db_path: string;
  db_size_bytes: number;
  last_modified: number;
}

export const portableApi = {
  getPortableStatus: () => tauriInvoke<PortableStatus>('get_portable_status'),
  scanPortableCandidates: () => tauriInvoke<PortableCandidate[]>('scan_portable_candidates'),
  migratePortableData: (sourceDir: string) =>
    tauriInvoke<string>('migrate_portable_data', { sourceDir }),
};
