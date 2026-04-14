import { ChatMessage, AIResponse, ToolDefinition } from '../types';
import { generateResponse } from './aiProvider';
import { getAvailableSlots, bookAppointment, cancelAppointment } from '../tools/availability';
import { sendConfirmationEmail } from '../tools/email';

/**
 * HandleScheduler: Gestisce appuntamenti in modo interattivo.
 */
export async function handleScheduler(
  messages: ChatMessage[],
  context: any,
  contact_id: string | null
): Promise<AIResponse> {
  const systemPrompt = `Sei l'assistente di M&C Elaborazioni per la gestione appuntamenti. Lo studio riceve su appuntamento il mercoledì e il venerdì, con slot da 45 minuti.

Regole:
- Proponi sempre 2-3 opzioni di slot disponibili usando get_available_slots
- NON confermare l'appuntamento finché l'utente non ha detto esplicitamente "sì", "confermo", "va bene" o equivalente
- Chiedi sempre la modalità: online (videochiamata) o in presenza (presso lo studio a Senorbì)
- Dopo la conferma: usa book_appointment per creare l'appuntamento, poi send_confirmation_email per inviare la conferma via email
- Se l'utente vuole modificare: proponi nuovi slot, cancella il vecchio con cancel_appointment, crea il nuovo con book_appointment
- Se l'utente vuole cancellare: conferma la cancellazione e usa cancel_appointment
- Indirizzo studio per appuntamenti in presenza: Senorbì (CA), Sardegna (Via G. Brodolini 12)`;

  const tools: ToolDefinition[] = [
    {
      name: 'get_available_slots',
      description: 'Ritorna la lista degli orari disponibili per una data specifica.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Formato YYYY-MM-DD' }
        },
        required: ['date']
      }
    },
    {
      name: 'book_appointment',
      description: 'Crea un nuovo appuntamento nel sistema.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          time: { type: 'string' },
          modality: { type: 'string', enum: ['online', 'in_presenza'] },
          notes: { type: 'string' }
        },
        required: ['date', 'time', 'modality']
      }
    },
    {
        name: 'cancel_appointment',
        description: 'Annulla un appuntamento esistente.',
        parameters: {
          type: 'object',
          properties: {
            appointment_id: { type: 'string' }
          },
          required: ['appointment_id']
        }
    },
    {
      name: 'send_confirmation_email',
      description: 'Invia l’email di conferma appuntamento all’utente.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string' }
        },
        required: ['appointment_id']
      }
    }
  ];

  const executors = {
    get_available_slots: async (args: { date: string }) => {
      const slots = await getAvailableSlots(args.date);
      return slots.length > 0 ? slots : "Nessuno slot disponibile per questa data.";
    },
    book_appointment: async (args: any) => {
      if (!contact_id) return { error: "Manca contact_id. Raccogliere dati prima di prenotare." };
      const app = await bookAppointment({
        contact_id,
        contact_name: context.contact_name || "Cliente",
        contact_email: context.contact_email,
        contact_phone: context.contact_phone,
        date: args.date,
        time: args.time,
        modality: args.modality,
        notes: args.notes
      });
      return { success: true, appointment_id: app.id };
    },
    cancel_appointment: async (args: { appointment_id: string }) => {
        await cancelAppointment(args.appointment_id);
        return { success: true };
    },
    send_confirmation_email: async (args: { appointment_id: string }) => {
        // Enforce fetching app details before sending
        const { getFirestore } = await import('firebase-admin/firestore');
        const db = getFirestore('ai-studio-f0b7482f-f418-4061-a54d-ed0b8ffff0cd');
        const snap = await db.collection('appointments').doc(args.appointment_id).get();
        if (!snap.exists) return { error: "Appuntamento non trovato" };
        const app = { id: snap.id, ...snap.data() } as any;
        await sendConfirmationEmail(app.contact_email, app);
        return { success: true };
    }
  };

  return await generateResponse(systemPrompt, messages, tools, executors);
}
