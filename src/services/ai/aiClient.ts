import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../lib/firebase';

const functions = getFunctions(app, 'europe-west1');

export interface AIRequest {
  prompt: string;
  systemInstruction?: string;
  model?: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  temperature?: number;
  responseMimeType?: 'text/plain' | 'application/json';
}

export interface AIResponse {
  text: string;
  usage?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

/**
 * Chiama Gemini tramite Cloud Function sicura.
 * La API key NON è mai esposta al client.
 */
export async function callAI(request: AIRequest): Promise<AIResponse> {
  const aiProxy = httpsCallable<AIRequest, AIResponse>(functions, 'aiProxy');
  try {
    const result = await aiProxy(request);
    return result.data;
  } catch (error: any) {
    console.error('AI call failed:', error);
    throw new Error(error.message || 'Chiamata AI fallita');
  }
}

/**
 * Helper per risposte JSON strutturate.
 */
export async function callAIJson<T = unknown>(
  request: Omit<AIRequest, 'responseMimeType'>
): Promise<T> {
  const response = await callAI({ ...request, responseMimeType: 'application/json' });
  return JSON.parse(response.text) as T;
}
