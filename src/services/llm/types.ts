import type { Focus, Trait, FocusStatus } from '../../api/types';

export interface LLMConfig {
  provider: 'deepseek' | 'openai' | 'gemini' | 'custom';
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface LlmConfigView {
  provider: 'deepseek' | 'openai' | 'gemini' | 'custom';
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  maskedKey?: string | null;
}

export interface StrategyContext {
  lifeId?: string;
  lifeName?: string;
  leaderName?: string;
  leaderBody?: string;
  situation?: string;
  philosophy?: string;
  stability?: number | null;
  traits?: Trait[];
  activeFoci?: Focus[];
}

export interface AIProposalItem {
  id: string;
  direction: string;
  title: string;
  bodyMd: string;
  status: FocusStatus;
  relationType: 'prerequisite' | 'mutually_exclusive';
}

export interface CabinetDebateResult {
  logs: { speaker: string; round: number; content: string }[];
  minutes: string;
  usedRealLLM: boolean;
  error?: string;
}
