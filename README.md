# M&C Elaborazioni - Web App

Applicazione web per la gestione dello studio di consulenza aziendale M&C Elaborazioni.

## Funzionalità Principali

### Area Admin
- **Dashboard Dinamica**: Monitoraggio KPI (Fatturato, Clienti Attivi, Pratiche), grafici di rendimento e attività recenti.
- **Gestione Clienti**: Anagrafica completa, stato onboarding e dettagli specifici.
- **Pratiche Kanban**: Gestione flussi di lavoro tramite board drag-and-drop.
- **Scadenziario**: Monitoraggio scadenze fiscali e amministrative.
- **Centro Notifiche**: Notifiche in tempo reale su attività dei clienti e degli agenti AI.
- **Agenti AI**: Orchestrazione di subagenti specializzati per automazione (Documenti, Solleciti, Compliance, Report).

### Area Cliente
- **Home Personalizzata**: Riepilogo scadenze, pagamenti e stato pratiche.
- **Le Mie Pratiche**: Timeline interattiva per seguire l'avanzamento dei lavori.
- **Documenti**: Caricamento e gestione file con classificazione automatica AI.
- **Pagamenti**: Visualizzazione parcelle e integrazione con Stripe (Carta/PayPal) e Bonifico.
- **Chat Assistenza**: Supporto diretto con assistente virtuale AI integrato.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Lucide React, Recharts, Framer Motion.
- **Backend**: Firebase (Authentication, Firestore).
- **Integrazioni**: Stripe (Pagamenti), Google Gemini (AI).

## Configurazione

### Variabili d'Ambiente
Copia il file `.env.example` in `.env` e inserisci le chiavi necessarie:
- `VITE_STRIPE_PUBLISHABLE_KEY`: Chiave pubblica di Stripe.
- `GEMINI_API_KEY`: Chiave API per i servizi Google AI.

### Installazione
```bash
npm install
npm run dev
```

## Struttura del Progetto
- `src/pages`: Pagine dell'applicazione divise per ruolo (admin/client/auth).
- `src/components`: Componenti UI riutilizzabili.
- `src/services`: Logica di integrazione API (Firebase, Stripe, AI).
- `src/lib`: Configurazioni core (AuthContext, Firebase init).
- `src/layouts`: Template di layout per le diverse aree.
