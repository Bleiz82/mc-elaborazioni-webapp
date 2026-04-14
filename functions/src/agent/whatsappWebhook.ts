import { onRequest } from 'firebase-functions/v2/https';

/**
 * WhatsApp Webhook Placeholder.
 * Configure in Meta Developer Portal when WHATSAPP_ENABLED is set to true.
 */
export const whatsappWebhook = onRequest({ cors: true, region: 'us-central1' }, async (req, res) => {
  if (process.env.WHATSAPP_ENABLED !== 'true') {
    res.status(503).json({ error: 'WhatsApp not configured' });
    return;
  }
  
  // Verification for Meta Webhook
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      res.send(challenge);
      return;
    }
    res.status(403).send('Forbidden');
    return;
  }
  
  // POST: Receiving WhatsApp messages
  if (req.method === 'POST') {
    // TODO: Implement WhatsApp message processing
    console.log("[WhatsApp] Received payload:", JSON.stringify(req.body));
    res.json({ success: true });
    return;
  }

  res.status(405).send('Method Not Allowed');
});
