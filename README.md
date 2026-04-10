<div align="center">

# M&C Elaborazioni — Area Clienti

**Gestionale intelligente per studio di consulenza aziendale**  
Powered by React · Firebase · Gemini AI

[![Firebase](https://img.shields.io/badge/Firebase-12.x-orange?logo=firebase)](https://firebase.google.com)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple?logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-cyan?logo=tailwindcss)](https://tailwindcss.com)

[🌐 Sito Istituzionale](https://ivory-dove-937512.hostingersite.com) · [🚀 Web App](https://gen-lang-client-0177996578.web.app)

</div>

---

## 📋 Panoramica

**M&C Elaborazioni e Consulenze Aziendali** è uno studio di consulenza con sede a Senorbì, nel cuore della Trexenta, Sardegna. Questa web app è il gestionale interno dello studio: un portale dual-access che serve sia i **consulenti** (area admin) sia i **clienti** (area riservata), potenziato da un sistema di **8 agenti AI autonomi** che automatizzano le attività ricorrenti.

---

## 🏗️ Stack Tecnologico

| Layer | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript 5.8 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 4 |
| Backend / DB | Firebase Firestore |
| Autenticazione | Firebase Auth (Google OAuth) |
| Storage | Firebase Storage |
| AI Engine | Google Gemini 2.5 Flash (primario) |
| AI Fallback | OpenAI GPT-4o · Anthropic Claude 3.5 |
| Pagamenti | Stripe (opzionale) |
| Charts | Recharts |
| Drag & Drop | @dnd-kit |
| PDF Export | jsPDF + jsPDF-AutoTable |
| Notifiche Toast | Sonner |
| Animazioni | Motion |
| Deploy | Firebase Hosting |

---

## 👥 Ruoli e Accessi

L'app gestisce tre ruoli distinti con routing protetto:

- **Admin** — accesso completo a tutte le sezioni gestionali
- **Collaborator** — accesso all'area admin con permessi limitati
- **Client** — accesso alla propria area riservata dopo onboarding

Il primo accesso con Google viene riconosciuto automaticamente: l'email admin è configurata in `src/lib/AuthContext.tsx`. Tutti gli altri utenti vengono registrati come `client` con onboarding obbligatorio.

---

## 🖥️ Area Admin

### Dashboard
KPI in tempo reale da Firestore: fatturato mensile, clienti attivi, pratiche in lavorazione, pagamenti in attesa. Grafico entrate ultimi 6 mesi, prossime scadenze e log attività agenti AI.

### Gestione Clienti
Lista clienti con ricerca, filtri per stato e tipo. Scheda dettaglio cliente con storico pratiche, documenti, pagamenti e log comunicazioni.

### Pratiche (Kanban)
Board drag-and-drop con colonne: Nuova → In Lavorazione → In Attesa Cliente → In Revisione → Completata. Powered by @dnd-kit.

### Scadenze
Calendario scadenze fiscali e documentali con priorità (alta/media/bassa) e assegnazione al cliente.

### Documenti
Upload e classificazione automatica via AI. Ogni documento caricato viene analizzato dall'Agente Documenti e categorizzato (fattura, contratto, dichiarazione, F24, DVR, ecc.).

### Pagamenti / Fatture
Gestione parcelle con stati (da_pagare / pagata / scaduta). Integrazione Stripe opzionale — se non configurata, il sistema propone automaticamente il bonifico bancario.

### Comunicazioni
Chat diretta con i clienti. Bozze di risposta generate automaticamente dall'Agente Comunicazioni.

### Collaboratori
Gestione del team interno con assegnazione ruoli.

### Centro Subagenti AI
Pannello di controllo dell'Orchestratore AI: stato in tempo reale degli 8 agenti, log attività, esecuzione manuale di ogni singolo agente.

### Report
Report periodici (settimanali/mensili) generati automaticamente dall'Agente Report con analisi AI dei KPI e suggerimenti operativi.

### Impostazioni
Configurazione provider AI (Gemini / OpenAI / Claude), API key, impostazioni studio.

---

## 📱 Area Cliente

### Home
Panoramica personalizzata: scadenze imminenti, documenti recenti, pratiche attive, messaggi non letti.

### Le Mie Pratiche
Timeline interattiva con avanzamento visivo (Nuova → In Lavorazione → In Attesa → Completata). Dettagli espandibili e avviso dedicato quando è richiesta un'azione da parte del cliente.

### Documenti
Upload documenti personali. Visualizzazione stato classificazione AI.

### Scadenze
Calendario scadenze personali con priorità e stato.

### Pagamenti
Storico parcelle e pagamenti. Se Stripe è attivo: pagamento online con carta. Se non configurato: istruzioni bonifico bancario.

### Chat
Comunicazione diretta con lo studio. Risposte automatiche AI per domande generali, escalation automatica al consulente per richieste complesse.

### Profilo
Anagrafica completa: dati fiscali (P.IVA / CF), indirizzo, PEC, tipo attività.

---

## 🤖 Sistema Agenti AI

Il cuore del gestionale è un **Orchestratore AI** che si attiva ogni 10 minuti, raccoglie il contesto reale dello studio da Firestore e decide autonomamente quali agenti attivare.

### Orchestratore
- Raccoglie: scadenze entro 7 giorni, fatture scadute, documenti caricati, pratiche bloccate, messaggi non letti, nuovi clienti degli ultimi 7 giorni
- Invia il contesto a Gemini che risponde con un array JSON di azioni prioritizzate
- Esegue gli agenti necessari in sequenza
- Aggiorna il log attività in `ai_activity_log`

### Gli 8 Agenti

| Agente | Funzione |
|---|---|
| **Scadenze** | Genera notifiche AI personalizzate per scadenze fiscali imminenti (entro 7 giorni) |
| **Solleciti** | Invia solleciti pagamento a 3 livelli (cordiale → fermo → urgente) con escalation admin al 3° |
| **Documenti** | Classifica automaticamente i documenti caricati (categoria, metadati, confidence score) |
| **Onboarding** | Accoglie i nuovi clienti con messaggio personalizzato e verifica campi profilo mancanti |
| **Report** | Genera report settimanali/mensili con analisi AI dei KPI e suggerimenti operativi |
| **Comunicazioni** | Crea bozze di risposta AI per i messaggi in arrivo dei clienti |
| **Compliance** | Verifica la completezza documentale delle pratiche e segnala problemi di conformità |
| **Assistente** | Chatbot 24/7 per i clienti: risponde autonomamente alle domande generali, scala all'umano per quelle complesse |

### Provider AI Multi-Modello
Il sistema supporta 3 provider AI configurabili da pannello admin senza toccare il codice:
- **Gemini 2.5 Flash** (default — veloce ed economico)
- **GPT-4o** (fallback OpenAI)
- **Claude 3.5 Sonnet** (fallback Anthropic)

---

## ⚙️ Configurazione

### Prerequisiti
- Node.js 18+
- Account Firebase con Firestore, Auth e Storage abilitati
- Chiave API Gemini (obbligatoria)

### Installazione locale

```bash
git clone https://github.com/Bleiz82/mc-elaborazioni-webapp.git
cd mc-elaborazioni-webapp
npm install
```

### Variabili d'ambiente

Crea un file `.env.local` nella root:

```env
GEMINI_API_KEY=la_tua_chiave_gemini
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...   # opzionale
```

### Configurazione Firebase

Il file `firebase-applet-config.json` nella root contiene la configurazione del progetto Firebase. Le API key aggiuntive (OpenAI, Claude) si configurano direttamente dal pannello **Impostazioni** nell'area admin, vengono salvate in Firestore su `studio_settings/general`.

### Avvio locale

```bash
npm run dev
# App disponibile su http://localhost:3000
```

### Build e deploy

```bash
npm run build
firebase deploy
```

🗄️ Struttura Firestore
Collezione	Descrizione
users	Profili utenti (admin / collaborator / client)
practices	Pratiche con stati kanban
deadlines	Scadenze fiscali e documentali
invoices	Parcelle e stato pagamento
payments	Registro pagamenti effettuati
documents	Metadati documenti caricati
messages	Chat studio ↔ cliente
notifications	Notifiche in-app per utenti
ai_activity_log	Log azioni degli agenti AI
ai_reports	Report generati dall'Agente Report
ai_draft_replies	Bozze risposta generate dall'Agente Comunicazioni
studio_settings	Configurazione studio e provider AI
📁 Struttura del Progetto
Copysrc/
├── layouts/
│   ├── AdminLayout.tsx          # Layout area admin con sidebar
│   └── ClientLayout.tsx         # Layout area cliente
├── lib/
│   ├── AuthContext.tsx           # Provider autenticazione e profili
│   └── firebase.ts              # Inizializzazione Firebase
├── pages/
│   ├── auth/
│   │   ├── Login.tsx            # Pagina login Google
│   │   └── Onboarding.tsx       # Onboarding nuovi clienti
│   ├── admin/
│   │   ├── Dashboard.tsx        # Dashboard KPI
│   │   ├── ClientsList.tsx      # Lista clienti
│   │   ├── ClientDetails.tsx    # Scheda cliente
│   │   ├── Deadlines.tsx        # Gestione scadenze
│   │   ├── Documents.tsx        # Gestione documenti
│   │   ├── Payments.tsx         # Gestione pagamenti
│   │   ├── PracticesKanban.tsx  # Board kanban pratiche
│   │   ├── Communications.tsx   # Comunicazioni clienti
│   │   ├── Collaborators.tsx    # Gestione collaboratori
│   │   ├── AISubagents.tsx      # Centro controllo agenti AI
│   │   ├── Reports.tsx          # Report AI
│   │   └── Settings.tsx         # Impostazioni studio
│   └── client/
│       ├── Home.tsx             # Dashboard cliente
│       ├── Practices.tsx        # Timeline pratiche
│       ├── Documents.tsx        # Documenti cliente
│       ├── Deadlines.tsx        # Scadenze cliente
│       ├── Payments.tsx         # Pagamenti cliente
│       ├── Chat.tsx             # Chat con lo studio
│       └── Profile.tsx          # Profilo cliente
└── services/
    ├── stripe.ts                # Integrazione Stripe (opzionale)
    └── ai/
        ├── aiProvider.ts        # Provider AI multi-modello
        ├── orchestrator.ts      # Orchestratore centrale
        ├── utils.ts             # Utility (logActivity, getAdminUID)
        └── agents/
            ├── agentScadenze.ts
            ├── agentSolleciti.ts
            ├── agentDocumenti.ts
            ├── agentOnboarding.ts
            ├── agentReport.ts
            ├── agentComunicazioni.ts
            ├── agentCompliance.ts
            └── agentAssistente.ts
🔒 Sicurezza
Autenticazione esclusivamente tramite Google OAuth (Firebase Auth)
Routing protetto lato client per ruolo
Regole Firestore da configurare lato Firebase Console per protezione lato server
Le API key AI sono salvate in Firestore (non nel codice sorgente) e mai esposte al client
🚀 Roadmap
 OCR reale documenti tramite Gemini Vision API
 Broadcast newsletter dall'Agente Comunicazioni
 Agente Bandi & Finanziamenti (monitora bandi Sardegna/MIMIT/EU)
 Agente Previsione Cashflow (30/60/90 giorni)
 Agente SUAPE & Pratiche (monitoraggio stato e silenzio-assenso)
 Agente Formazione & Sicurezza (scadenze corsi RSPP, antincendio, HACCP)
 Orchestratore su Firebase Cloud Functions (indipendente dal browser)
 Proxy Cloud Function per API key AI (sicurezza lato server)
 Dominio definitivo: app.mcconsulenze.it
👨‍💻 Sviluppato da
DigIdentity Agency
Web Agency specializzata in digital marketing e sviluppo web per PMI.

M&C Elaborazioni e Consulenze Aziendali — Senorbì, Trexenta, Sardegna
