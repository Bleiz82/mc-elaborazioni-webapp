import { ChatMessage, AIResponse, ToolDefinition, AgentStage } from '../types';
import { generateResponse } from './aiProvider';
import { resolveOrCreateContact } from '../tools/contacts';

/**
 * HandleQualifier: Raccoglie dati lead in modo naturale.
 */
export async function handleQualifier(
  messages: ChatMessage[],
  context: any,
  session: { id: string, channel: any },
  updateSessionStage: (stage: AgentStage) => Promise<void>
): Promise<AIResponse> {
  const systemPrompt = `Sei l'assistente di M&C Elaborazioni. Il tuo compito è raccogliere le informazioni mancanti del contatto in modo naturale e conversazionale. NON fare un elenco di tutte le domande — chiedi una cosa alla volta, integrandola nel flusso della conversazione.

Informazioni da raccogliere (solo quelle mancanti nel context):
- Nome completo
- Email
- Numero di telefono
- Tipo di attività (lavoratore autonomo, ditta individuale, SRL, SNC, SAS, altro)
- Problema o esigenza principale
- Urgenza (alta, media, bassa)

Regole:
- Controlla il context per sapere cosa hai già — non chiedere dati che sono già presenti
- Massimo 1 domanda per messaggio
- Usa un tono amichevole ma professionale
- Quando hai nome + email + telefono, conferma i dati e usa update_contact per salvarli
- Se l'utente vuole fissare un appuntamento, conferma che hai tutti i dati necessari e indica che stai passando alla prenotazione`;

  const tools: ToolDefinition[] = [
    {
      name: 'update_contact',
      description: 'Crea o aggiorna le informazioni del contatto nel database.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          business_type: { type: 'string' },
          fiscal_problem: { type: 'string' },
          urgency: { type: 'string', enum: ['alta', 'media', 'bassa'] }
        }
      }
    },
    {
      name: 'update_session_stage',
      description: 'Aggiorna lo stato della sessione (es. porta a scheduling se i dati sono pronti).',
      parameters: {
        type: 'object',
        properties: {
          stage: { type: 'string', enum: ['greeting', 'consulting', 'qualifying', 'scheduling', 'confirmed', 'closed'] }
        },
        required: ['stage']
      }
    }
  ];

  const executors = {
    update_contact: async (args: any) => {
      const identifier = args.phone || args.email;
      if (!identifier) return { error: "Manca email o telefono per identificare il contatto" };
      
      const contact = await resolveOrCreateContact(
        session.channel,
        identifier,
        args.name,
        {
          business_type: args.business_type,
          fiscal_problem: args.fiscal_problem,
          urgency: args.urgency
        }
      );
      return { success: true, contact_id: contact.id };
    },
    update_session_stage: async (args: { stage: AgentStage }) => {
      await updateSessionStage(args.stage);
      return { success: true };
    }
  };

  return await generateResponse(systemPrompt, messages, tools, executors);
}
