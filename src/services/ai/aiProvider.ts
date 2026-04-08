import { GoogleGenAI } from '@google/genai';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

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

async function getSettings() {
  try {
    const docRef = doc(db, 'studio_settings', 'general');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (e) {
    console.error("Error fetching settings", e);
  }
  return {};
}

class GeminiProvider implements AIProvider {
  name = 'gemini';

  private async getClient() {
    const settings = await getSettings();
    const apiKey = settings.gemini_api_key || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key not found');
    return new GoogleGenAI({ apiKey });
  }

  async chat(messages: ChatMessage[], options?: AIOptions): Promise<string> {
    const ai = await this.getClient();
    const systemInstruction = messages.find(m => m.role === 'system')?.content;
    const userMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: options?.model || 'gemini-2.5-flash',
      contents: userMessages,
      config: {
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens,
      }
    });

    return response.text || '';
  }

  async chatWithTools(messages: ChatMessage[], tools: ToolDefinition[], options?: AIOptions): Promise<AIToolResponse> {
    const ai = await this.getClient();
    const systemInstruction = messages.find(m => m.role === 'system')?.content;
    const userMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const formattedTools = tools.map(t => ({
      functionDeclarations: [{
        name: t.name,
        description: t.description,
        parameters: t.parameters as any
      }]
    }));

    const response = await ai.models.generateContent({
      model: options?.model || 'gemini-2.5-flash',
      contents: userMessages,
      config: {
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens,
        tools: formattedTools
      }
    });

    const toolCalls = response.functionCalls?.map(call => ({
      name: call.name,
      arguments: call.args as Record<string, any>
    }));

    return {
      text: response.text,
      toolCalls
    };
  }
}

class OpenAIProvider implements AIProvider {
  name = 'openai';

  private async getApiKey() {
    const settings = await getSettings();
    const apiKey = settings.openai_api_key || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not found');
    return apiKey;
  }

  async chat(messages: ChatMessage[], options?: AIOptions): Promise<string> {
    const apiKey = await this.getApiKey();
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: options?.model || 'gpt-4o',
        messages: messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens
      })
    });

    if (!res.ok) throw new Error(`OpenAI API error: ${res.statusText}`);
    const data = await res.json();
    return data.choices[0].message.content;
  }

  async chatWithTools(messages: ChatMessage[], tools: ToolDefinition[], options?: AIOptions): Promise<AIToolResponse> {
    const apiKey = await this.getApiKey();
    const formattedTools = tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: options?.model || 'gpt-4o',
        messages: messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
        tools: formattedTools
      })
    });

    if (!res.ok) throw new Error(`OpenAI API error: ${res.statusText}`);
    const data = await res.json();
    const message = data.choices[0].message;
    
    const toolCalls = message.tool_calls?.map((call: any) => ({
      name: call.function.name,
      arguments: JSON.parse(call.function.arguments)
    }));

    return {
      text: message.content,
      toolCalls
    };
  }
}

class ClaudeProvider implements AIProvider {
  name = 'claude';

  private async getApiKey() {
    const settings = await getSettings();
    const apiKey = settings.claude_api_key || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Claude API key not found');
    return apiKey;
  }

  async chat(messages: ChatMessage[], options?: AIOptions): Promise<string> {
    const apiKey = await this.getApiKey();
    const systemMessage = messages.find(m => m.role === 'system')?.content;
    const userMessages = messages.filter(m => m.role !== 'system');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: options?.model || 'claude-3-5-sonnet-20240620',
        system: systemMessage,
        messages: userMessages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens || 1024
      })
    });

    if (!res.ok) throw new Error(`Claude API error: ${res.statusText}`);
    const data = await res.json();
    return data.content[0].text;
  }

  async chatWithTools(messages: ChatMessage[], tools: ToolDefinition[], options?: AIOptions): Promise<AIToolResponse> {
    const apiKey = await this.getApiKey();
    const systemMessage = messages.find(m => m.role === 'system')?.content;
    const userMessages = messages.filter(m => m.role !== 'system');

    const formattedTools = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters
    }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: options?.model || 'claude-3-5-sonnet-20240620',
        system: systemMessage,
        messages: userMessages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens || 1024,
        tools: formattedTools
      })
    });

    if (!res.ok) throw new Error(`Claude API error: ${res.statusText}`);
    const data = await res.json();
    
    let text = '';
    const toolCalls: any[] = [];
    
    data.content.forEach((block: any) => {
      if (block.type === 'text') text += block.text;
      if (block.type === 'tool_use') {
        toolCalls.push({
          name: block.name,
          arguments: block.input
        });
      }
    });

    return { text, toolCalls };
  }
}

export async function getAIProvider(providerName?: 'openai' | 'claude' | 'gemini'): Promise<AIProvider> {
  let selected = providerName;
  if (!selected) {
    const settings = await getSettings();
    selected = settings.default_ai_provider || 'gemini';
  }

  switch (selected) {
    case 'openai': return new OpenAIProvider();
    case 'claude': return new ClaudeProvider();
    case 'gemini': 
    default:
      return new GeminiProvider();
  }
}

export async function chatWithFallback(messages: ChatMessage[], options?: AIOptions): Promise<string> {
  const providers: ('gemini' | 'openai' | 'claude')[] = ['gemini', 'openai', 'claude'];
  
  for (const providerName of providers) {
    try {
      const provider = await getAIProvider(providerName);
      return await provider.chat(messages, options);
    } catch (error) {
      console.warn(`Provider ${providerName} failed, trying next...`, error);
    }
  }
  throw new Error("All AI providers failed.");
}
