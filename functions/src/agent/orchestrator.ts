import { AgentStage, AgentContext, AgentName } from '../types';
import { generateResponse } from './aiProvider';

/**
 * Orchestrator: decides which specialized agent should handle the conversation.
 */
export async function decideAgent(
  stage: AgentStage,
  context: AgentContext,
  lastMessage: string
): Promise<AgentName> {
  const systemPrompt = `Sei un router. Analizza lo stage, il context e il messaggio dell'utente. Rispondi SOLO con una parola:
- consulente: se l'utente vuole informazioni su servizi, fiscalità, contabilità, lavoro, o domande generali
- qualifier: se mancano nome o email o telefono nel context E l'utente ha mostrato interesse a procedere
- scheduler: se l'utente vuole fissare, modificare o cancellare un appuntamento`;

  const inputMessage = `Stage: ${stage}
Context: nome=${context.contact_name}, email=${context.contact_email}, phone=${context.contact_phone}, problema=${context.main_problem}
Messaggio utente: ${lastMessage}`;

  try {
    const response = await generateResponse(systemPrompt, [{ role: 'user', content: inputMessage }]);
    const agent = response.text.toLowerCase().trim().replace(/[^\w]/g, '') as AgentName;
    
    if (['consulente', 'qualifier', 'scheduler'].includes(agent)) {
      return agent;
    }
    return 'consulente';
  } catch (error) {
    console.error("[Orchestrator] Error deciding agent:", error);
    return 'consulente';
  }
}
