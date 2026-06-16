const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

async function sendEmail({ to, subject, html }) {
  if (!env.SMTP_USER) {
    console.log(`[Email simulé] À: ${to} | Sujet: ${subject}`);
    return;
  }
  await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
}

async function sendWelcomeEmail(user) {
  await sendEmail({
    to: user.email,
    subject: `Bienvenue sur ${env.APP_NAME} !`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h1 style="color:#10b981">Bienvenue, ${user.username} !</h1>
        <p>Votre compte a bien été créé sur <strong>${env.APP_NAME}</strong>.</p>
        <p>Explorez les statistiques, suivez vos tipsters favoris et publiez vos pronostics.</p>
        <p style="font-size:12px;color:#6b7280;margin-top:32px">
          Ceci n'est pas un conseil financier. Aucune garantie de gain.
        </p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h1>Réinitialisation du mot de passe</h1>
        <p>Cliquez sur le lien ci-dessous (valable 1 heure) :</p>
        <a href="${resetUrl}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">
          Réinitialiser mon mot de passe
        </a>
        <p style="margin-top:16px">Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      </div>
    `,
  });
}

async function sendSubscriptionExpiryReminder(user, daysLeft) {
  await sendEmail({
    to: user.email,
    subject: `Votre abonnement expire dans ${daysLeft} jour(s)`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h1 style="color:#f59e0b">Abonnement bientôt expiré</h1>
        <p>Bonjour ${user.username},</p>
        <p>Votre abonnement <strong>${user.subscription?.plan?.displayName}</strong> expire dans <strong>${daysLeft} jour(s)</strong>.</p>
        <a href="${env.FRONTEND_URL}/abonnement" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">
          Renouveler mon abonnement
        </a>
      </div>
    `,
  });
}

module.exports = { sendWelcomeEmail, sendPasswordResetEmail, sendSubscriptionExpiryReminder };
