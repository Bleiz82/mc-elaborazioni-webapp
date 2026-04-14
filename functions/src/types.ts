import { Timestamp } from 'firebase-admin/firestore';

// === UNION TYPES ===
export type AgentStage = 'greeting' | 'consulting' | 'qualifying' | 'scheduling' | 'confirmed' | 'closed';
export type LeadStatus = 'new' | 'qualified' | 'scheduled' | 'converted' | 'lost';
export type AppointmentStatus = 'pending' | 'confermato' | 'cancellato' | 'completato' | 'no_show';
export type Channel = 'chatbot' | 'whatsapp' | 'email';
export type AgentName = 'orchestrator' | 'consulente' | 'qualifier' | 'scheduler';
export type AIProvider = 'gemini' | 'openai' | 'anthropic';
export type KBCategory = 'servizi' | 'prezzi' | 'faq' | 'procedure' | 'normativa';

// === CHAT ===
export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

// === CONTACTS ===
export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  phone_normalized: string | null;
  channel_ids: {
    chatbot: string | null;
    whatsapp: string | null;
    email: string | null;
  };
  lead_status: LeadStatus;
  qualification_data: QualificationData;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface QualificationData {
  business_type: string | null;
  fiscal_problem: string | null;
  urgency: 'alta' | 'media' | 'bassa' | null;
  employees: number | null;
  annual_revenue_range: string | null;
}

// === AGENT SESSIONS ===
export interface AgentContext {
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  main_problem: string | null;
  appointment_id: string | null;
}

export interface AgentSession {
  id: string;
  contact_id: string | null;
  channel: Channel;
  session_token: string;
  stage: AgentStage;
  ai_enabled: boolean;
  current_agent: AgentName;
  context: AgentContext;
  message_count: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// === APPOINTMENTS ===
export interface Appointment {
  id: string;
  contact_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  date: string;
  time: string;
  duration_minutes: number;
  modality: 'online' | 'in_presenza';
  meet_link: string | null;
  status: AppointmentStatus;
  notes: string | null;
  reminder_sent: boolean;
  followup_sent: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// === AVAILABILITY ===
export interface AvailabilityConfig {
  days: number[];
  slots: string[];
  slot_duration_minutes: number;
  break_minutes: number;
  booking_window_days: number;
  timezone: string;
}

// === KNOWLEDGE BASE ===
export interface KnowledgeBaseDoc {
  id: string;
  title: string;
  content: string;
  category: KBCategory;
  keywords: string[];
  active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// === TOOL CALLING ===
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  name: string;
  result: any;
}

// === AI PROVIDER RESPONSE ===
export interface AIResponse {
  text: string;
  toolCalls?: ToolCall[];
}
