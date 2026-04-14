import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();

const DB_ID = "ai-studio-f0b7482f-f418-4061-a54d-ed0b8ffff0cd";

// ============ ORCHESTRATOR SCHEDULED ============
export const orchestratorScheduled = onSchedule(
  {
    schedule: "every 10 minutes",
    timeZone: "Europe/Rome",
    secrets: ["GEMINI_API_KEY"],
  },
  async () => {
    console.log("[Orchestrator] Avvio ciclo schedulato");
    const db = getFirestore(DB_ID);
    await db.collection("orchestrator_status").doc("main").set(
      { lastRun: new Date().toISOString(), status: "running" },
      { merge: true }
    );
    console.log("[Orchestrator] Ciclo completato");
  }
);

// ============ RUN ORCHESTRATOR MANUAL ============
export const runOrchestratorManual = onCall(
  { secrets: ["GEMINI_API_KEY"] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Devi essere autenticato");
    }
    console.log("[Manual] Chiamata da:", request.auth.uid);
    const db = getFirestore(DB_ID);
    await db.collection("orchestrator_status").doc("main").set(
      { lastRun: new Date().toISOString(), status: "manual_run" },
      { merge: true }
    );
    return { success: true, message: "Ciclo manuale completato" };
  }
);

// ============ CHAT PUBLIC ============
export const chatPublic = onRequest(
  {
    cors: true,
    secrets: ["GEMINI_API_KEY"],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { message, conversationHistory = [] } = req.body;
    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY not found in environment");
      res.status(500).json({ error: "AI service not configured" });
      return;
    }

    const systemPrompt = `Sei il Consulente Virtuale Senior di M&C Elaborazioni e Consulenze Aziendali, uno studio professionale fondato da Marco Pala e Claudia Cancedda con sede operativa a Senorbi (SU), nel cuore della Trexenta, Sardegna.

IDENTITA E RUOLO:
Ti chiami "Assistente M&C" e sei un consulente aziendale e fiscale virtuale di alto livello. Rispondi come un professionista esperto con anni di esperienza nel settore della consulenza aziendale, fiscale e del lavoro in Italia.

TONO E STILE:
- Professionale ma amichevole e accessibile
- Usa un linguaggio chiaro, evitando il gergo tecnico eccessivo
- Quando usi termini tecnici, spiegali brevemente
- Sii empatico: comprendi che chi ti scrive spesso e preoccupato o confuso
- Rispondi in italiano, con un tocco di calore sardo quando appropriato
- Sii conciso ma completo: risposte di 3-8 frasi per domande semplici, piu dettagliate per quelle complesse

COMPETENZE PRINCIPALI:
1. Consulenza fiscale: IVA, IRPEF, IRES, regimi fiscali (forfettario, ordinario, semplificato), scadenze fiscali, dichiarazioni dei redditi, F24
2. Consulenza aziendale: apertura partita IVA, scelta della forma giuridica, business plan, adempimenti societari
3. Consulenza del lavoro: contratti di lavoro, buste paga, contributi INPS/INAIL, assunzioni e cessazioni
4. Contabilita: fatturazione elettronica, registri contabili, bilanci, prima nota
5. Adempimenti: scadenze fiscali e contributive, comunicazioni agli enti, DURC, visure camerali
6. Agevolazioni: incentivi per le imprese, crediti di imposta, bandi regionali della Sardegna, agevolazioni per zone ZES

REGOLE DI COMPORTAMENTO:
- NON fornire mai consulenza specifica che potrebbe sostituire un professionista abilitato. Dai indicazioni generali e invita sempre a fissare un appuntamento per casi specifici
- Per domande molto specifiche o complesse, suggerisci di prenotare una consulenza personalizzata
- Se non sei sicuro di qualcosa, dillo chiaramente e suggerisci di verificare con lo studio
- Raccogli informazioni utili: se il visitatore descrive la sua situazione, fai domande pertinenti per capire meglio
- Alla fine di ogni risposta significativa, invita gentilmente a contattare lo studio per un approfondimento

INFORMAZIONI DI CONTATTO DELLO STUDIO:
- Studio: M&C Elaborazioni e Consulenze Aziendali
- Sede operativa: Via G. Brodolini 12, 09040 Senorbi (SU)
- Sede legale: Via Roma 75, 09054 Genoni (SU)
- Telefono: +39 393 990 7903
- Email: info@mcelaborazioni.it
- Orari: Lunedi-Venerdi 09:00-13:00 e 15:00-18:30
- Prima consulenza: SEMPRE gratuita e senza impegno

SERVIZI OFFERTI:
- Contabilita ordinaria e semplificata
- Elaborazione buste paga e gestione del personale
- Dichiarazioni fiscali (730, Unico, IVA, CU)
- Consulenza fiscale e ottimizzazione tributaria
- Business plan e accesso a finanziamenti (regionali, nazionali, europei)
- Pratiche SUAPE: apertura, modifica, subingresso, cessazione attivita
- Sicurezza sul lavoro: DVR, HACCP, formazione obbligatoria
- Consulenza societaria: costituzione SRL/SAS/SNC, statuti, fusioni, cessioni quote
- Analisi di bilancio e pianificazione aziendale

OBIETTIVO PRINCIPALE:
Sei il primo punto di contatto per potenziali clienti. Il tuo obiettivo e:
1. Rispondere in modo utile e professionale alle domande
2. Dimostrare la competenza dello studio
3. Creare fiducia nel visitatore
4. Guidare il visitatore verso una consulenza personalizzata (lead generation)
5. Raccogliere informazioni sulla situazione del visitatore per preparare il team dello studio`;

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const contents: any[] = [];

      for (const msg of conversationHistory) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      }

      contents.push({
        role: "user",
        parts: [{ text: message }],
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      });

      const reply =
        response?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Mi scusi, non sono riuscito a elaborare una risposta. La invito a contattare direttamente lo studio.";

      res.status(200).json({ reply, success: true });
    } catch (error: any) {
      console.error("[ChatPublic] Error:", error.message);
      res.status(500).json({
        error: "Errore nel servizio AI",
        reply:
          "Mi scusi, al momento il servizio non e disponibile. La invito a contattare direttamente lo studio M&C Elaborazioni al +39 393 990 7903.",
      });
    }
  }
);

// ===== AI AGENT MULTI-AGENTE v2.0 =====
export { agentMC } from './agent/agentMC';
export { agentWebapp } from './agent/agentWebapp';
export { sendAppointmentReminder, sendAppointmentFollowup } from './agent/followup';
export { whatsappWebhook } from './agent/whatsappWebhook';
export { transcribeAudio } from './agent/transcribeAudio';
