import * as nodemailer from 'nodemailer';
import { Appointment } from '../types';

/**
 * Inizializzazione transporter
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

const STUDIO_INFO = {
    name: "M&C Elaborazioni e Consulenze Aziendali",
    address: "Via G. Brodolini 12, Senorbì (CA), Sardegna",
    email: "info@mcelaborazioni.it",
    phone: "+39 393 990 7903"
};

const COMMON_STYLES = `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    border: 1px solid #eee;
    padding: 20px;
`;

/**
 * Sends a confirmation email for an appointment.
 */
export async function sendConfirmationEmail(to: string, appointment: Appointment): Promise<void> {
  const modalityText = appointment.modality === 'online' 
    ? `Online via Google Meet: <a href="${appointment.meet_link}">${appointment.meet_link}</a>` 
    : `In presenza presso lo studio: ${STUDIO_INFO.address}`;

  const html = `
    <div style="${COMMON_STYLES}">
      <h2 style="color: #0284c7;">Conferma Appuntamento</h2>
      <p>Gentile <strong>${appointment.contact_name}</strong>,</p>
      <p>Il tuo appuntamento presso <strong>${STUDIO_INFO.name}</strong> è stato confermato.</p>
      <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Data:</strong> ${appointment.date}</p>
        <p style="margin: 5px 0 0 0;"><strong>Ora:</strong> ${appointment.time}</p>
        <p style="margin: 5px 0 0 0;"><strong>Modalità:</strong> ${modalityText}</p>
      </div>
      <p>Se hai bisogno di modificare o cancellare l'appuntamento, ti preghiamo di contattarci al più presto.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #777; text-align: center;">
        ${STUDIO_INFO.name}<br>
        ${STUDIO_INFO.address}<br>
        Tel: ${STUDIO_INFO.phone} | Email: ${STUDIO_INFO.email}
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"${STUDIO_INFO.name}" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Conferma Appuntamento - ${STUDIO_INFO.name}`,
    html
  });
}

/**
 * Sends a reminder email for an appointment.
 */
export async function sendReminderEmail(to: string, appointment: Appointment): Promise<void> {
  const modalityText = appointment.modality === 'online' 
    ? `Online via Google Meet: <a href="${appointment.meet_link}">${appointment.meet_link}</a>` 
    : `In presenza presso lo studio: ${STUDIO_INFO.address}`;

  const html = `
    <div style="${COMMON_STYLES}">
      <h2 style="color: #0284c7;">Promemoria Appuntamento</h2>
      <p>Ciao <strong>${appointment.contact_name}</strong>,</p>
      <p>Ti ricordiamo che il tuo appuntamento è previsto per oggi.</p>
      <div style="background-color: #fffbeb; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0;"><strong>Ora:</strong> ${appointment.time}</p>
        <p style="margin: 5px 0 0 0;"><strong>Modalità:</strong> ${modalityText}</p>
      </div>
      <p>Ti aspettiamo!</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #777; text-align: center;">
        ${STUDIO_INFO.name}<br>
        ${STUDIO_INFO.address}
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"${STUDIO_INFO.name}" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Promemoria Appuntamento - ${STUDIO_INFO.name}`,
    html
  });
}

/**
 * Sends a followup email after an appointment.
 */
export async function sendFollowupEmail(to: string, appointment: Appointment): Promise<void> {
  const html = `
    <div style="${COMMON_STYLES}">
      <h2 style="color: #0284c7;">Come è andato l'appuntamento?</h2>
      <p>Gentile <strong>${appointment.contact_name}</strong>,</p>
      <p>Grazie per averci dedicato il tuo tempo oggi.</p>
      <p>Speriamo che la consulenza sia stata utile. Ci farebbe piacere sapere se hai bisogno di ulteriori chiarimenti o se vuoi procedere con i passaggi discussi.</p>
      <p>Se vuoi fissare il prossimo appuntamento, rispondi a questa email o visita il nostro sito.</p>
      <p>A presto,</p>
      <p><strong>Il Team di M&C Elaborazioni</strong></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #777; text-align: center;">
        ${STUDIO_INFO.name}<br>
        <a href="https://ivory-dove-937512.hostingersite.com/">Visita il nostro sito</a>
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"${STUDIO_INFO.name}" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Feedback Appuntamento - ${STUDIO_INFO.name}`,
    html
  });
}
