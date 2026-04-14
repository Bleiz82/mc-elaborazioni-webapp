import { ChatMessage, ToolDefinition, AIResponse } from '../types';

export async function generateResponse(
  systemPrompt: string,
  messages: ChatMessage[],
  tools?: ToolDefinition[],
  toolExecutors?: Record<string, (args: any) => Promise<any>>
): Promise<AIResponse> {
  const provider = (process.env.AI_PROVIDER || 'gemini') as 'gemini' | 'openai' | 'anthropic';
  if (provider === 'openai') return await generateOpenAIResponse(systemPrompt, messages, tools, toolExecutors);
  if (provider === 'anthropic') return await generateAnthropicResponse(systemPrompt, messages, tools, toolExecutors);
  return await generateGeminiResponse(systemPrompt, messages, tools, toolExecutors);
}

async function generateGeminiResponse(
  systemInstruction: string,
  messages: ChatMessage[],
  tools?: ToolDefinition[],
  toolExecutors?: Record<string, (args: any) => Promise<any>>
): Promise<AIResponse> {
  const { GoogleGenAI } = await import('@google/genai');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const ai = new GoogleGenAI({ apiKey });
  const modelStr = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const contents: any[] = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

  if (contents.length === 0) throw new Error("No messages provided");

  const geminiTools = tools && tools.length > 0 ? [{
    functionDeclarations: tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }))
  }] : undefined;

  const config: any = {
    systemInstruction,
    temperature: 0.7,
    maxOutputTokens: 1024,
  };
  if (geminiTools) config.tools = geminiTools;

  let response = await ai.models.generateContent({
    model: modelStr,
    contents,
    config,
  });

  let toolCallsCount = 0;
  const maxToolCalls = 10;

  while (toolCallsCount < maxToolCalls) {
    const parts = response?.candidates?.[0]?.content?.parts || [];
    const functionCalls = parts.filter((p: any) => p.functionCall);

    if (functionCalls.length === 0) {
      const text = parts.map((p: any) => p.text || '').join('').trim();
      return { text };
    }

    if (!toolExecutors) {
      const text = parts.map((p: any) => p.text || '').join('').trim();
      return { text: text || "Non sono riuscito a completare la richiesta." };
    }

    const toolResponseParts: any[] = [];
    for (const fc of functionCalls) {
      const call = fc.functionCall!;
      console.log('[AI] Calling tool:', call.name, call.args);
      const executor = toolExecutors[call.name!];
      const result = executor ? await executor(call.args) : { error: "Tool not found" };
      toolResponseParts.push({
        functionResponse: { name: call.name, response: { result } }
      });
    }

    contents.push({ role: 'model', parts });
    contents.push({ role: 'user', parts: toolResponseParts });

    response = await ai.models.generateContent({
      model: modelStr,
      contents,
      config,
    });
    toolCallsCount++;
  }

  return { text: "Mi scusi, si è verificato un problema. Riprovi tra qualche istante." };
}

async function generateOpenAIResponse(
  systemPrompt: string,
  messages: ChatMessage[],
  tools?: ToolDefinition[],
  toolExecutors?: Record<string, (args: any) => Promise<any>>
): Promise<AIResponse> {
  const { OpenAI } = await import('openai');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const openai = new OpenAI({ apiKey });
  const modelStr = process.env.OPENAI_MODEL || "gpt-4.1";

  const chatMessages: any[] = [
    { role: 'system', content: systemPrompt },
    ...messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.content
    }))
  ];

  const openaiTools = tools && tools.length > 0 ? tools.map(t => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters }
  })) : undefined;

  let response = await openai.chat.completions.create({
    model: modelStr, messages: chatMessages, tools: openaiTools, temperature: 0.7
  });

  let toolCallsCount = 0;
  while (toolCallsCount < 10) {
    const choice = response.choices[0];
    if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
      return { text: choice.message.content || "" };
    }
    chatMessages.push(choice.message);
    if (!toolExecutors) break;
    for (const tc of choice.message.tool_calls) {
      const executor = toolExecutors[tc.function.name];
      const result = executor ? await executor(JSON.parse(tc.function.arguments)) : { error: "Tool not found" };
      chatMessages.push({ tool_call_id: tc.id, role: "tool", name: tc.function.name, content: JSON.stringify(result) });
    }
    response = await openai.chat.completions.create({ model: modelStr, messages: chatMessages, tools: openaiTools });
    toolCallsCount++;
  }
  return { text: response.choices[0].message.content || "" };
}

async function generateAnthropicResponse(
  systemPrompt: string,
  messages: ChatMessage[],
  tools?: ToolDefinition[],
  toolExecutors?: Record<string, (args: any) => Promise<any>>
): Promise<AIResponse> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const anthropic = new Anthropic({ apiKey });
  const modelStr = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const anthropicTools = tools && tools.length > 0 ? tools.map(t => ({
    name: t.name, description: t.description, input_schema: t.parameters as any
  })) : undefined;

  const history: any[] = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'model' ? 'assistant' : 'user', content: m.content
  }));

  let message = await anthropic.messages.create({
    model: modelStr, system: systemPrompt, messages: history,
    tools: anthropicTools, max_tokens: 1024, temperature: 0.7
  });

  let toolCallsCount = 0;
  while (toolCallsCount < 10) {
    const toolUses = message.content.filter((c: any) => c.type === 'tool_use');
    if (toolUses.length === 0) {
      const textBlock = message.content.find((c: any) => c.type === 'text') as any;
      return { text: textBlock ? textBlock.text : "" };
    }
    history.push({ role: 'assistant', content: message.content as any });
    if (!toolExecutors) break;
    const toolResults: any[] = [];
    for (const tu of toolUses as any[]) {
      const executor = toolExecutors[tu.name];
      const result = executor ? await executor(tu.input) : { error: "Tool not found" };
      toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
    }
    history.push({ role: 'user', content: toolResults });
    message = await anthropic.messages.create({
      model: modelStr, system: systemPrompt, messages: history, tools: anthropicTools, max_tokens: 1024
    });
    toolCallsCount++;
  }
  const finalText = message.content.find((c: any) => c.type === 'text') as any;
  return { text: finalText ? finalText.text : "" };
}


