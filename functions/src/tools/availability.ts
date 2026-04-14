import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { AvailabilityConfig, Appointment } from '../types';

const DB_ID = 'ai-studio-f0b7482f-f418-4061-a54d-ed0b8ffff0cd';

/**
 * Gets available slots for a specific date (YYYY-MM-DD).
 */
export async function getAvailableSlots(dateStr: string): Promise<string[]> {
  const db = getFirestore(DB_ID);
  
  // 1. Load config
  const configDoc = await db.collection('availability').doc('config').get();
  if (!configDoc.exists) return [];
  const config = configDoc.data() as AvailabilityConfig;

  // 2. Parse date and check constraints
  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return [];

  // Check if date is in the past (only date part)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (targetDate < today) return [];

  // Check if date is beyond window
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + config.booking_window_days);
  if (targetDate > maxDate) return [];

  // Check weekday (1=Monday, 7=Sunday)
  // JS Date.getDay() returns 0 for Sunday
  let day = targetDate.getDay();
  if (day === 0) day = 7;
  if (!config.days.includes(day)) return [];

  // 3. Query existing non-cancelled appointments for this date
  const appointmentsSnapshot = await db.collection('appointments')
    .where('date', '==', dateStr)
    .where('status', 'in', ['pending', 'confermato', 'completato', 'no_show'])
    .get();

  const bookedSlots = appointmentsSnapshot.docs.map(doc => doc.data().time);

  // 4. Return available slots
  return config.slots.filter(slot => !bookedSlots.includes(slot));
}

/**
 * Books an appointment.
 */
export async function bookAppointment(params: {
  contact_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:MM
  modality: 'online' | 'in_presenza';
  notes?: string;
}): Promise<Appointment> {
  const db = getFirestore(DB_ID);

  // Verify availability
  const availableSlots = await getAvailableSlots(params.date);
  if (!availableSlots.includes(params.time)) {
    throw new Error("Lo slot selezionato non è più disponibile");
  }

  let meetLink = null;
  if (params.modality === 'online') {
    const randomSuffix = Math.random().toString(36).substring(2, 12);
    meetLink = `https://meet.google.com/mc-${randomSuffix}`;
  }

  const newAppointment: Partial<Appointment> = {
    ...params,
    duration_minutes: 45,
    status: 'pending',
    meet_link: meetLink,
    reminder_sent: false,
    followup_sent: false,
    created_at: FieldValue.serverTimestamp() as any,
    updated_at: FieldValue.serverTimestamp() as any
  };

  const docRef = await db.collection('appointments').add(newAppointment);
  const createdDoc = await docRef.get();
  return { id: docRef.id, ...createdDoc.data() } as Appointment;
}

/**
 * Cancels an appointment.
 */
export async function cancelAppointment(appointmentId: string): Promise<void> {
    const db = getFirestore(DB_ID);
    await db.collection('appointments').doc(appointmentId).update({
        status: 'cancellato',
        updated_at: FieldValue.serverTimestamp()
    });
}
