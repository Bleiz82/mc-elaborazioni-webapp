import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Contact } from '../types';

const DB_ID = 'ai-studio-f0b7482f-f418-4061-a54d-ed0b8ffff0cd';

/**
 * Normalizes an Italian phone number to E.164 format (+39XXXXXXXXXX).
 */
export function normalizePhone(phone: string): string {
  // Remove all non-numeric characters except initial '+'
  let normalized = phone.replace(/[^\d+]/g, '');

  // Handle various formats
  if (normalized.startsWith('0039')) {
    normalized = '+' + normalized.substring(2);
  } else if (normalized.startsWith('39') && normalized.length >= 10 && !normalized.startsWith('+')) {
    normalized = '+' + normalized;
  } else if (normalized.startsWith('0') && normalized.length === 10) {
    // Standard local Italian number usually starts with 0 for landline, 
    // but user says: "Se inizia con 0 (numero locale italiano), sostituire 0 con +39"
    // Usually mobile numbers start with 3. 0 is landline.
    normalized = '+39' + normalized.substring(1);
  } else if (!normalized.startsWith('+') && normalized.length === 10) {
    // Assume Italian mobile if 10 digits and no prefix
    normalized = '+39' + normalized;
  }

  return normalized;
}

/**
 * Resolves an existing contact by phone or email, or creates a new one.
 */
export async function resolveOrCreateContact(
  channel: 'chatbot' | 'whatsapp' | 'email',
  identifier: string,
  name?: string,
  metadata?: Record<string, any>
): Promise<Contact> {
  const db = getFirestore(DB_ID);
  const contactsRef = db.collection('contacts');
  
  const isEmail = identifier.includes('@');
  let phoneNormalized = null;
  
  let query;
  if (isEmail) {
    query = contactsRef.where('email', '==', identifier.toLowerCase().trim()).limit(1);
  } else {
    phoneNormalized = normalizePhone(identifier);
    query = contactsRef.where('phone_normalized', '==', phoneNormalized).limit(1);
  }

  const snapshot = await query.get();
  const now = FieldValue.serverTimestamp();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    const data = doc.data() as Contact;
    
    // Update channel ID
    const channelKey = `channel_ids.${channel}`;
    const updateData: any = {
      [channelKey]: identifier,
      updated_at: now
    };
    
    // Update name if missing
    if (name && !data.name) {
      updateData.name = name;
    }
    
    // Update metadata if provided
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        updateData[`qualification_data.${key}`] = value;
      });
    }

    await doc.ref.update(updateData);
    const updatedDoc = await doc.ref.get();
    return { id: doc.id, ...updatedDoc.data() } as Contact;
  }

  // Create new contact
  const newContact: Partial<Contact> = {
    name: name || 'Nuovo Contatto',
    email: isEmail ? identifier.toLowerCase().trim() : null,
    phone: !isEmail ? identifier : null,
    phone_normalized: phoneNormalized,
    channel_ids: {
      chatbot: channel === 'chatbot' ? identifier : null,
      whatsapp: channel === 'whatsapp' ? identifier : null,
      email: channel === 'email' ? identifier : null
    },
    lead_status: 'new',
    qualification_data: {
      business_type: null,
      fiscal_problem: null,
      urgency: null,
      employees: null,
      annual_revenue_range: null
    },
    created_at: now as any,
    updated_at: now as any
  };

  const docRef = await contactsRef.add(newContact);
  const createdDoc = await docRef.get();
  return { id: docRef.id, ...createdDoc.data() } as Contact;
}
