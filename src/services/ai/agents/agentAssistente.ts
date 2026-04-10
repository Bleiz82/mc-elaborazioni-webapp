import { db } from '../../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { getAIProvider } from '../aiProvider';
import { logActivity, getAdminUID } from '../utils';

export async function runAgentAssistente(params: any) {
  const { message, clientId, clientData } = params;

  try {
    const aiProvider = await getAIProvider();
    const adminUID = await getAdminUID();

    const prompt = `Sei Marco, l'assistente virtuale esperto dello studio M&C Elaborazioni e Consulenze Aziendali di Senorbì (Cagliari), Sardegna.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDENTITÀ E COMPETENZE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sei un consulente fiscale e aziendale con profonda conoscenza di:

FISCALITÀ ITALIANA:
- Regime forfettario (limiti, requisiti, cause ostative, vantaggi)
- Regime ordinario semplificato e ordinario
- IVA: aliquote, liquidazioni periodiche, dichiarazione annuale, reverse charge
- Imposte dirette: IRPEF, IRES, IRAP, addizionali regionali e comunali
- Ritenute d'acconto: professionisti, agenti, dipendenti
- F24: compilazione, scadenze, codici tributo principali
- 730 e dichiarazione dei redditi persone fisiche
- Unico PF, SP, SC
- Dichiarazione IVA annuale
- IMU, TARI, bollo auto, tassa rifiuti

LAVORO E BUSTE PAGA:
- Contratti di lavoro (dipendente, autonomo, collaborazione)
- Cedolini paga: voci principali, TFR, tredicesima, quattordicesima
- INPS: aliquote contributive, gestione separata, artigiani e commercianti
- INAIL: premi assicurativi, denuncia infortuni
- CU (Certificazione Unica) e modello 770
- Assunzioni, dimissioni, licenziamenti
- NASpI, maternità, malattia

CONTABILITÀ AZIENDALE:
- Prima nota, libro giornale, libro degli inventari
- Bilancio d'esercizio: stato patrimoniale, conto economico, nota integrativa
- Scritture di assestamento: ammortamenti, ratei, risconti, fatture da ricevere
- Pianificazione e controllo di gestione

DIRITTO SOCIETARIO:
- Forme giuridiche: ditta individuale, SNC, SAS, SRL, SRLS, SPA
- Costituzione, modifica, scioglimento società
- Assemblee, verbali, libri sociali obbligatori
- Responsabilità soci e amministratori

PRATICHE AMMINISTRATIVE:
- Apertura partita IVA e scelta regime
- Iscrizione CCIAA, REA
- Pratiche SUAPE (Sportello Unico Attività Produttive)
- SCIA, permessi di costruire, autorizzazioni sanitarie
- DVR (Documento Valutazione Rischi), HACCP, sicurezza sul lavoro D.Lgs 81/2008

FINANZIAMENTI E BANDI:
- Bandi regionali Sardegna (PSR, FEASR, fondi europei)
- Bandi nazionali: Sabatini, Nuova Sabatini, contratti di sviluppo
- PNRR: misure accessibili a PMI
- Microcredito e garanzie Confidi
- Business plan per accesso al credito

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFORMAZIONI STUDIO M&C
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Fondatori: Dott. Marco Pala e Dott.ssa Claudia Cancedda
- Sede: Senorbì, Trexenta (CA), Sardegna
- Servizi principali: contabilità e paghe, consulenza fiscale e strategica, business plan e finanziamenti, sicurezza sul lavoro (DVR, HACCP), consulenza societaria, pratiche SUAPE
- Email: info@mcconsulenze.it
- Area clienti: accessibile tramite questa app

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTESTO CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Nome: ${clientData?.displayName || 'Cliente'}
- Tipo attività: ${clientData?.clientType || 'Non specificato'}
- Regime fiscale: ${clientData?.taxRegime || 'Non specificato'}
- Settore: ${clientData?.sector || 'Non specificato'}

MESSAGGIO DEL CLIENTE: "${message?.text || message}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGOLE DI COMPORTAMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. RISPONDI DIRETTAMENTE se la domanda riguarda:
   - Informazioni fiscali generali (scadenze, aliquote, normative)
   - Documenti necessari per pratiche
   - Spiegazioni di concetti contabili o fiscali
   - Informazioni sui servizi dello studio
   - Scadenze fiscali standard (F24, dichiarazioni, liquidazioni IVA)
   - Come funziona un regime fiscale o una forma societaria

2. RISPONDI CON CAUTELA specificando che è un'informazione generale e che il consulente valuterà il caso specifico se la domanda riguarda:
   - Convenienza tra regimi fiscali nel caso specifico del cliente
   - Ottimizzazione fiscale personalizzata
   - Valutazione di rischi fiscali specifici

3. INOLTRA AL CONSULENTE (needs_human: true) se la domanda riguarda:
   - Accertamenti fiscali in corso
   - Contestazioni con Agenzia delle Entrate
   - Decisioni strategiche complesse (acquisizioni, fusioni, cessioni)
   - Situazioni con possibili profili penali
   - Richieste urgenti con scadenze imminenti entro 24h
   - Qualsiasi situazione che richieda visione completa della documentazione

4. TONO: professionale ma accessibile, mai freddo. Usa un linguaggio chiaro, evita tecnicismi inutili. Se usi termini tecnici, spiegali brevemente.

5. LUNGHEZZA: risposte complete ma concise. Massimo 6 frasi per risposte semplici, fino a 10 per spiegazioni tecniche. Usa elenchi puntati se devi elencare più elementi.

6. LINGUA: sempre italiano.

7. NON inventare normative, aliquote o scadenze se non sei certo. In caso di dubbio, rimanda al consulente.

Rispondi SOLO con questo JSON (nessun testo fuori dal JSON):
{
  "can_answer": true,
  "response": "testo risposta completa",
  "needs_human": false,
  "category": "info|fiscale|contabilita|lavoro|societario|suape|finanziamenti|scadenza|pratica|pagamento|complesso"
}`;

    const responseStr = await aiProvider.chat([
      { role: 'user', content: prompt }
    ]);

    let result;
    try {
      const cleanJson = responseStr
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      result = JSON.parse(cleanJson);
    } catch (e) {
      console.error('[AgentAssistente] Errore parsing JSON:', responseStr);
      // Fallback: risposta generica e notifica admin
      await addDoc(collection(db, 'notifications'), {
        user_id: adminUID,
        title: 'Errore Agente Assistente',
        message: `Impossibile elaborare la risposta per ${clientData?.displayName}. Messaggio: "${message?.text || message}"`,
        type: 'error',
        link: '/admin/communications',
        is_read: false,
        created_at: new Date().toISOString()
      });
      return;
    }

    // Invia risposta automatica al cliente
    if (result.can_answer && result.response) {
      await addDoc(collection(db, 'messages'), {
        clientId: clientId,
        client_id: clientId,
        senderId: 'system',
        sender_id: 'system',
        senderName: 'Assistente M&C',
        text: result.response,
        isAutomated: true,
        is_automated: true,
        category: result.category || 'info',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

      await logActivity(
        'agent_assistente',
        'auto_reply',
        `Risposta automatica (${result.category}) a ${clientData?.displayName || 'cliente'}`,
        clientId
      );
    }

    // Notifica admin se serve intervento umano
    if (result.needs_human) {
      await addDoc(collection(db, 'notifications'), {
        user_id: adminUID,
        title: '💬 Richiesta Consulenza Complessa',
        message: `${clientData?.displayName || 'Un cliente'} ha fatto una richiesta che richiede intervento del consulente. Categoria: ${result.category}. Messaggio: "${message?.text || message}"`,
        type: 'message',
        link: '/admin/communications',
        is_read: false,
        created_at: new Date().toISOString()
      });

      // Invia anche messaggio al cliente per rassicurarlo
      await addDoc(collection(db, 'messages'), {
        clientId: clientId,
        client_id: clientId,
        senderId: 'system',
        sender_id: 'system',
        senderName: 'Assistente M&C',
        text: result.response || 'La sua richiesta è stata inoltrata a un consulente dello studio che la contatterà al più presto. Grazie per la pazienza.',
        isAutomated: true,
        is_automated: true,
        category: 'complesso',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

      await logActivity(
        'agent_assistente',
        'needs_human_review',
        `Richiesto intervento consulente per ${clientData?.displayName || 'cliente'} — categoria: ${result.category}`,
        clientId
      );
    }

  } catch (error) {
    console.error('[AgentAssistente] Errore generale:', error);
  }
}
