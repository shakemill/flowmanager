import nodemailer from 'nodemailer';

export function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const portNum = port ? parseInt(port, 10) : 587;
  const secure = process.env.SMTP_SECURE === 'true' || portNum === 465;
  return nodemailer.createTransport({
    host,
    port: portNum,
    secure,
    auth: { user, pass },
  });
}

export function getMailFrom(): string {
  return process.env.MAIL_FROM ?? process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? 'noreply@localhost';
}

/**
 * Envoie un email de notification après changement de mot de passe.
 * Ne lève pas d'erreur si SMTP n'est pas configuré (retourne false).
 */
export async function sendPasswordChangeNotification(
  to: string,
  userName: string | null
): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;
  const from = getMailFrom();
  const displayName = userName?.trim() || to;
  const subject = 'Votre mot de passe a été modifié';
  const html = `
    <p>Bonjour ${displayName},</p>
    <p>Nous vous confirmons que le mot de passe de votre compte a été modifié avec succès.</p>
    <p>Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement l'administrateur.</p>
    <p>Cordialement,<br/>L'équipe FlowManager</p>
  `;
  try {
    await transporter.sendMail({ from, to, subject, html });
    return true;
  } catch (err) {
    console.error('Envoi email changement mot de passe', err);
    return false;
  }
}
