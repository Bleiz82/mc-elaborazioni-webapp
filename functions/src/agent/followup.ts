import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendReminderEmail, sendFollowupEmail } from '../tools/email';
import { Appointment } from '../types';

const DB_ID = 'ai-studio-f0b7482f-f418-4061-a54d-ed0b8ffff0cd';

/**
 * Scheduled Reminder: runs every hour to find appointments starting in ~1 hour.
 */
export const sendAppointmentReminder = onSchedule(
  { schedule: 'every 1 hours', region: 'us-central1', timeZone: 'Europe/Rome' },
  async () => {
    const db = getFirestore(DB_ID);
    const now = new Date();
    
    // Window: between 50 and 70 minutes from now
    const windowStart = new Date(now.getTime() + 50 * 60000);
    const windowEnd = new Date(now.getTime() + 70 * 60000);
    
    console.log(`[Followup] Checking reminders for window: ${windowStart.toISOString()} - ${windowEnd.toISOString()}`);

    const snapshot = await db.collection('appointments')
      .where('status', '==', 'confermato')
      .where('reminder_sent', '==', false)
      .get();

    for (const docSnapshot of snapshot.docs) {
      const app = { id: docSnapshot.id, ...docSnapshot.data() } as Appointment;
      
      // Combinare date + time (YYYY-MM-DD + HH:MM)
      const appDate = new Date(`${app.date}T${app.time}:00`);
      
      if (appDate >= windowStart && appDate <= windowEnd) {
        try {
          await sendReminderEmail(app.contact_email, app);
          await docSnapshot.ref.update({
            reminder_sent: true,
            updated_at: FieldValue.serverTimestamp()
          });
          console.log(`[Followup] Reminder sent for app: ${app.id}`);
        } catch (error) {
          console.error(`[Followup] Error sending reminder for ${app.id}:`, error);
        }
      }
    }
  }
);

/**
 * Scheduled Followup: runs every hour to find appointments finished ~1 hour ago.
 */
export const sendAppointmentFollowup = onSchedule(
  { schedule: 'every 1 hours', region: 'us-central1', timeZone: 'Europe/Rome' },
  async () => {
    const db = getFirestore(DB_ID);
    const now = new Date();
    
    // Duration is 45 mins. Window: finished 50 to 70 mins ago.
    // Finished at: Date + Time + 45min
    // So if finished at X, now is X + 60min.
    // X = now - 60min.
    
    const windowStart = new Date(now.getTime() - 70 * 60000);
    const windowEnd = new Date(now.getTime() - 50 * 60000);

    const snapshot = await db.collection('appointments')
      .where('status', '==', 'confermato')
      .where('followup_sent', '==', false)
      .get();

    for (const docSnapshot of snapshot.docs) {
      const app = { id: docSnapshot.id, ...docSnapshot.data() } as Appointment;
      
      const appStartDate = new Date(`${app.date}T${app.time}:00`);
      const appEndDate = new Date(appStartDate.getTime() + app.duration_minutes * 60000);
      
      if (appEndDate >= windowStart && appEndDate <= windowEnd) {
        try {
          await sendFollowupEmail(app.contact_email, app);
          await docSnapshot.ref.update({
            followup_sent: true,
            status: 'completato',
            updated_at: FieldValue.serverTimestamp()
          });
          console.log(`[Followup] Followup sent and app completed: ${app.id}`);
        } catch (error) {
          console.error(`[Followup] Error sending followup for ${app.id}:`, error);
        }
      }
    }
  }
);
