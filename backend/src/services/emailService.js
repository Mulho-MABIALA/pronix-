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
  const appUrl = env.FRONTEND_URL || 'https://fpronix.com';
  await sendEmail({
    to: user.email,
    subject: `Bienvenue sur fpronix, ${user.username} ⚽`,
    html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenue sur fpronix</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0b0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#0a0b0d;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;">

          <!-- Logo header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:rgba(26,166,86,0.15);border:1px solid rgba(26,166,86,0.3);border-radius:12px;padding:10px 14px;">
                    <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                      fp<span style="color:#1aa656;">ronix</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:#111214;border:1px solid rgba(255,255,255,0.07);border-radius:20px;overflow:hidden;">

              <!-- Green accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,#1aa656,#16c666,rgba(26,166,86,0.2));border-radius:0;"></td>
                </tr>
              </table>

              <!-- Content -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding:40px 36px 32px;">

                    <!-- Emoji + greeting -->
                    <p style="margin:0 0 8px;font-size:32px;line-height:1;">⚽</p>
                    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.25;letter-spacing:-0.3px;">
                      Bienvenue, ${user.username} !
                    </h1>
                    <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                      Ton compte fpronix est créé. Tu es maintenant prêt à plonger dans l'univers des statistiques football et des pronostics.
                    </p>

                    <!-- Features list -->
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
                      ${[
                        ['📊', 'Statistiques en temps réel', 'Scores en direct, compositions, H2H et form récente.'],
                        ['🏆', 'Tipsters & pronostics', 'Suis les meilleurs pronostiqueurs et publie tes propres picks.'],
                        ['🤖', 'Analyse IA', 'Génère des pronostics assistés par intelligence artificielle.'],
                        ['💎', 'Premium disponible', 'Accède aux cotes, value bets et données avancées.'],
                      ].map(([icon, title, desc]) => `
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                          <table cellpadding="0" cellspacing="0" role="presentation">
                            <tr>
                              <td style="width:36px;vertical-align:top;padding-top:2px;font-size:18px;">${icon}</td>
                              <td>
                                <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#e5e7eb;">${title}</p>
                                <p style="margin:0;font-size:12px;color:#4b5563;line-height:1.5;">${desc}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>`).join('')}
                    </table>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td align="center">
                          <a href="${appUrl}"
                            style="display:inline-block;padding:14px 32px;background:#1aa656;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:12px;letter-spacing:0.1px;">
                            Accéder à fpronix →
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 8px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;color:#374151;">
                Tu reçois cet email car tu viens de créer un compte sur
                <a href="${appUrl}" style="color:#1aa656;text-decoration:none;">fpronix</a>.
              </p>
              <p style="margin:0;font-size:10px;color:#1f2937;line-height:1.6;">
                ⚠️ Ceci n'est pas un conseil financier. Les pronostics sont fournis à titre indicatif.<br />
                Aucune garantie de résultat. Jouer avec modération.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
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
