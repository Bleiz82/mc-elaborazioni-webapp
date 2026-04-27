import { callAI } from './aiClient';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface AIToolResponse {
  text?: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, any>;
  }>;
}

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface AIProvider {
  name: string;
  chat(messages: ChatMessage[], options?: AIOptions): Promise<string>;
  chatWithTools(messages: ChatMessage[], tools: ToolDefinition[], options?: AIOptions): Promise<AIToolResponse>;
}

/**
 * Provider unico che passa tutto dalla Cloud Function aiProxy.
 * Nessuna API key nel browser.
 */
class SecureProxyProvider implements AIProvider {
  name = 'secure-proxy';

  async chat(messages: ChatMessage[], options?: AIOptions): Promise<string> {
    const systemInstruction = messages.find(m => m.role === 'system')?.content;
    const userContent = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n');

    const response = await callAI({
      prompt: userContent,
      systemInstruction,
      model: (options?.model as any) || 'gemini-2.5-flash',
      temperature: options?.temperature,
    });

    return response.text || '';
  }

  async chatWithTools(messages: ChatMessage[], tools: ToolDefinition[], options?: AIOptions): Promise<AIToolResponse> {
    const systemInstruction = messages.find(m => m.role === 'system')?.content;
    const toolsDescription = tools.map(t =>
      `Funzione: ${t.name}\nDescrizione: ${t.description}\nParametri: ${JSON.stringify(t.parameters)}`
    ).join('\n\n');

    const userContent = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n');

    const fullPrompt = `Hai a disposizione questi strumenti:\n\n${toolsDescription}\n\nSe devi usare uno strumento, rispondi SOLO con JSON nel formato:\n{"tool_calls": [{"name": "nome_funzione", "arguments": {...}}]}\n\nAltrimenti rispondi normalmente.\n\n${userContent}`;

    const response = await callAI({
      prompt: fullPrompt,
      systemInstruction,
      model: (options?.model as any) || 'gemini-2.5-flash',
      temperature: options?.temperature,
    });

    const text = response.text || '';

    try {
      const parsed = JSON.parse(text);
      if (parsed.tool_calls) {
        return { toolCalls: parsed.tool_calls };
      }
    } catch {
      // Non è JSON, è una risposta testuale normale
    }

    return { text };
  }
}

export async function getAIProvider(): Promise<AIProvider> {
  return new SecureProxyProvider();
}

export async function chatWithFallback(messages: ChatMessage[], options?: AIOptions): Promise<string> {
  const provider = new SecureProxyProvider();
  return provider.chat(messages, options);
}
