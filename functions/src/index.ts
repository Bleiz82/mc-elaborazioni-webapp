import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

// ── Orchestratore automatico ogni 10 minuti ──────────────────────
export const orchestratorScheduled = onSchedule(
  {
    schedule: 'every 10 minutes',
    timeZone: 'Europe/Rome',
    secrets: ['GEMINI_API_KEY'],
  },
  async () => {
    console.log('[Orchestrator] Avvio ciclo schedulato');
    const db = getFirestore('ai-studio-f0b7482f-f418-4061-a54d-ed0b8ffff0cd');
    await db.collection('orchestrator_status').doc('main').set({
      lastRun: new Date().toISOString(),
      status: 'running',
    }, { merge: true });
    console.log('[Orchestrator] Ciclo completato');
  }
);

// ── Chiamata manuale da admin panel ───────────────────────────────
export const runOrchestratorManual = onCall(
  {
    secrets: ['GEMINI_API_KEY'],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Autenticazione richiesta');
    }
    const db = getFirestore('ai-studio-f0b7482f-f418-4061-a54d-ed0b8ffff0cd');
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    if (userDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Solo admin può avviare manualmente');
    }
    await db.collection('orchestrator_status').doc('main').set({
      lastRun: new Date().toISOString(),
      status: 'manual_run',
    }, { merge: true });
    return { success: true, message: 'Orchestratore avviato' };
  }
);

// ── Chatbot pubblico per il sito mcconsulenze.it ─────────────────
export const chatPublic = onRequest(
  {
    secrets: ['GEMINI_API_KEY'],
   cors: ['https://www.mcconsulenze.it', 'http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'],

  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const userMessage: string = req.body?.message || '';
    if (!userMessage.trim()) {
      res.status(400).json({ error: 'Messaggio vuoto' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'API key mancante' });
      return;
    }

    const systemPrompt = `Sei l'assistente virtuale di M&C Elaborazioni e Consulenze, uno studio di consulenza fiscale, contabile e aziendale con sede a Senorbì (SU), Sardegna.

SERVIZI OFFERTI:
- Contabilità ordinaria e semplificata
- Elaborazione buste paga e gestione del personale
- Dichiarazioni fiscali (730, Unico, IVA, CU)
- Consulenza fiscale e ottimizzazione tributaria
- Business plan e accesso a finanziamenti (regionali, nazionali, europei — fino a 175.000€ ottenuti per clienti)
- Pratiche SUAPE: apertura, modifica, subingresso, cessazione attività
- Sicurezza sul lavoro: DVR, HACCP, formazione obbligatoria
- Consulenza societaria: costituzione SRL/SAS/SNC, statuti, fusioni, cessioni quote
- Analisi di bilancio e pianificazione aziendale

INFORMAZIONI PRATICHE:
- Indirizzo operativo: Via G. Brodolini 12, 09040 Senorbì (SU)
- Sede legale: Via Roma 75, 09054 Genoni (SU)
- Telefono: +39 393 990 7903
- Email: info@mcelaborazioni.it
- Orari: Lunedì–Venerdì 09:00–13:00 e 15:00–18:30
- Prima consulenza: SEMPRE gratuita e senza impegno

REGOLE DI RISPOSTA:
1. Rispondi SEMPRE in italiano, con tono professionale ma cordiale
2. Risposte brevi e dirette (massimo 3-4 frasi)
3. Se la domanda è complessa o richiede analisi specifica, invita a contattare lo studio per una consulenza gratuita
4. Non inventare cifre, normative o scadenze fiscali specifiche — rimanda allo studio per dettagli tecnici precisi
5. Concludi sempre con un invito all'azione (chiamare, scrivere o prenotare consulenza gratuita) se pertinente`;

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt + '\n\nUtente: ' + userMessage }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 300,
            }
          })
        }
      );

      if (!geminiRes.ok) {
        throw new Error('Gemini API error: ' + geminiRes.status);
      }

      const geminiData = await geminiRes.json() as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> }
        }>
      };

      const reply =
        geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        'Mi dispiace, non riesco a rispondere in questo momento. Contattaci al +39 393 990 7903.';

      res.status(200).json({ reply });

    } catch (err) {
      console.error('[chatPublic] Errore:', err);
      res.status(200).json({
        reply: 'Mi dispiace, si è verificato un errore. Contattaci direttamente al +39 393 990 7903 o via email a info@mcelaborazioni.it.'
      });
    }
  }
);
