import { ChatMessage, AIResponse, ToolDefinition } from '../types';
import { generateResponse } from './aiProvider';
import { searchKnowledgeBase } from '../tools/knowledge';

/**
 * HandleConsulente: Specializzato in informazioni fiscali e servizi dello studio.
 */
export async function handleConsulente(
  messages: ChatMessage[],
  context: any,
  saveContextField: (field: string, value: string) => Promise<void>
): Promise<AIResponse> {
  const systemPrompt = `Sei Marco, l'assistente virtuale di M&C Elaborazioni e Consulenze Aziendali, studio professionale di consulenza fiscale, contabile e del lavoro con sede a Senorbì, nel cuore della Trexenta, Sardegna. I titolari sono Marco Pala e Claudia Cancedda. Rispondi sempre in italiano, con tono professionale ma accessibile, come un consulente esperto che parla con un imprenditore o lavoratore autonomo.

I servizi dello studio includono: contabilità ordinaria e semplificata, dichiarazioni fiscali (730, Redditi PF/SP/SC, IRAP), consulenza del lavoro e gestione buste paga, pratiche CCIAA (apertura/modifica/chiusura attività), consulenza societaria (SRL, SNC, SAS, ditte individuali), gestione IVA e liquidazioni, consulenza previdenziale INPS/INAIL, autoliquidazione INAIL, CU, 770, gestione TFR.

Regole di comportamento:
- Non inventare mai prezzi o tariffe: usa lo strumento search_knowledge_base per verificare
- Se l'utente mostra interesse concreto per un servizio, chiedi se vuole approfondire o fissare una consulenza
- Non fare più di 2 domande consecutive
- Se non conosci la risposta, di' "Devo verificare con i nostri consulenti" e suggerisci di fissare un appuntamento
- Quando l'utente fornisce informazioni su di sé (nome, tipo attività, problema), usa save_context_field per salvarle nella sessione
- Non salutare ripetutamente — se la conversazione è già avviata, vai al punto`;

  const tools: ToolDefinition[] = [
    {
      name: 'search_knowledge_base',
      description: 'Cerca informazioni nei documenti dello studio su servizi, prezzi e procedure.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'La query di ricerca' }
        },
        required: ['query']
      }
    },
    {
      name: 'save_context_field',
      description: 'Salva un’informazione importante dell’utente nel contesto della sessione.',
      parameters: {
        type: 'object',
        properties: {
          field: { 
            type: 'string', 
            enum: ['contact_name', 'contact_email', 'contact_phone', 'main_problem'],
            description: 'Il campo da salvare' 
          },
          value: { type: 'string', description: 'Il valore da salvare' }
        },
        required: ['field', 'value']
      }
    }
  ];

  const executors = {
    search_knowledge_base: async (args: { query: string }) => {
      const docs = await searchKnowledgeBase(args.query);
      return docs.map(d => `[Doc: ${d.title}] ${d.content}`).join("\n\n");
    },
    save_context_field: async (args: { field: string, value: string }) => {
      await saveContextField(args.field, args.value);
      return { success: true };
    }
  };

  return await generateResponse(systemPrompt, messages, tools, executors);
}
