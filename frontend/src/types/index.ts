export type SupportedLanguage =
  | 'hi'  // Hindi
  | 'mr'  // Marathi
  | 'en'  // English
  | 'bn'  // Bengali
  | 'te'  // Telugu
  | 'ta'  // Tamil
  | 'gu'  // Gujarati
  | 'kn'  // Kannada
  | 'ml'  // Malayalam
  | 'or'  // Odia
  | 'pa'; // Punjabi

export interface FormField {
  id: string;
  label: Record<string, string>;
  prompt: Record<string, string>;
  confirmPrompt: Record<string, string>;
  type: 'text' | 'tel' | 'date' | 'number' | 'select';
  required: boolean;
  value?: string;
  confirmed: boolean;
  confidence?: number;
}

export interface SessionData {
  sessionId: string;
  serviceId: string;
  language: SupportedLanguage;
  currentFieldIndex: number;
  fields: FormField[];
  status: 'idle' | 'in_progress' | 'review' | 'submitted' | 'escalated';
  fallbackActive: boolean;
  pendingValue?: string;
  pendingFieldId?: string;
  confidence?: number;
  ticketId?: string;
  submissionId?: string;
}

export interface AssistTurnResponse {
  session_id: string;
  field_id: string;
  field_name: string;
  transcript: string;
  candidate_value: string;
  confidence: number;
  decision: 'confirm' | 'saved_next' | 'clarify' | 'retry' | 'fallback';
  clarification_prompt?: string;
  assistant_message: string;
  audio_url?: string;
}

export interface MetricsSummary {
  total_sessions: number;
  completed_sessions: number;
  completion_rate: number;
  avg_latency_ms: number;
  retry_count: number;
  fallback_count: number;
  stt_accuracy: number;
  extraction_accuracy: number;
  escalations: number;
}
