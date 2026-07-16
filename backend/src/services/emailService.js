const env = require('../config/env');

// ── Client Resend (SDK officiel) ──────────────────────────────────────────────
let resendClient = null;
function getResend() {
  if (!resendClient && env.RESEND_API_KEY) {
    const { Resend } = require('resend');
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

// Expéditeur : noreply@fpronix.com (domaine vérifié sur Resend)
// En attendant la vérification de domaine → utiliser onboarding@resend.dev
const FROM = env.EMAIL_FROM || 'fpronix <noreply@fpronix.com>';

// ── Envoi générique ───────────────────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  const resend = getResend();

  if (!resend) {
    // Pas de clé → log console (mode dev ou avant config)
    console.log(`[Email simulé] À: ${to} | Sujet: ${subject}`);
    return;
  }

  const { error } = await resend.emails.send({ from: FROM, to, subject, html });

  if (error) {
    // Log l'erreur mais NE PAS throw — une erreur d'email ne doit jamais
    // faire crasher l'API (domaine non vérifié, quota, etc.)
    console.error('[Email] Erreur Resend (non fatale):', error.message || error);
    return false;
  }

  console.log(`[Email] Envoyé → ${to} | ${subject}`);
  return true;
}

// ── Email de bienvenue ────────────────────────────────────────────────────────
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

          <!-- Logo -->
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

          <!-- Card -->
          <tr>
            <td style="background:#111214;border:1px solid rgba(255,255,255,0.07);border-radius:20px;overflow:hidden;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,#1aa656,#16c666,rgba(26,166,86,0.2));"></td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding:40px 36px 32px;">
                    <p style="margin:0 0 8px;font-size:32px;line-height:1;">⚽</p>
                    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.25;letter-spacing:-0.3px;">
                      Bienvenue, ${user.username} !
                    </h1>
                    <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                      Ton compte fpronix est créé. Tu es maintenant prêt à plonger dans l'univers des statistiques football et des pronostics.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
                      ${[
                        ['📊', 'Statistiques en temps réel', 'Scores en direct, compositions, H2H et forme récente.'],
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
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td align="center">
                          <a href="${appUrl}"
                            style="display:inline-block;padding:14px 32px;background:#1aa656;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:12px;">
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
                Aucune garantie de résultat. Jouez avec modération.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}

// ── Reset mot de passe ────────────────────────────────────────────────────────
async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Réinitialisation de ton mot de passe — fpronix',
    html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0a0b0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0b0d;">
    <tr><td align="center" style="padding:32px 16px;">
      <table style="max-width:520px;width:100%;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="background:rgba(26,166,86,0.15);border:1px solid rgba(26,166,86,0.3);border-radius:12px;padding:8px 14px;font-size:18px;font-weight:800;color:#fff;">
            fp<span style="color:#1aa656;">ronix</span>
          </span>
        </td></tr>
        <tr><td style="background:#111214;border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:36px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">🔐 Réinitialisation du mot de passe</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
            Bonjour ${user.username},<br />
            Clique sur le bouton ci-dessous pour réinitialiser ton mot de passe. Ce lien est valable <strong style="color:#e5e7eb;">1 heure</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${resetUrl}"
                style="display:inline-block;padding:14px 32px;background:#1aa656;color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:12px;">
                Réinitialiser mon mot de passe →
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#4b5563;text-align:center;">
            Si tu n'as pas fait cette demande, ignore cet email. Ton mot de passe ne sera pas modifié.
          </p>
        </td></tr>
        <tr><td style="padding:20px 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#374151;">
            <a href="${env.FRONTEND_URL}" style="color:#1aa656;text-decoration:none;">fpronix.com</a> — Statistiques football & pronostics
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

// ── Rappel expiration abonnement ──────────────────────────────────────────────
async function sendSubscriptionExpiryReminder(user, daysLeft) {
  await sendEmail({
    to: user.email,
    subject: `Ton abonnement expire dans ${daysLeft} jour(s) — fpronix`,
    html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#0a0b0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0b0d;">
    <tr><td align="center" style="padding:32px 16px;">
      <table style="max-width:520px;width:100%;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="background:rgba(26,166,86,0.15);border:1px solid rgba(26,166,86,0.3);border-radius:12px;padding:8px 14px;font-size:18px;font-weight:800;color:#fff;">
            fp<span style="color:#1aa656;">ronix</span>
          </span>
        </td></tr>
        <tr><td style="background:#111214;border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:36px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#f59e0b;">⏰ Abonnement bientôt expiré</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
            Bonjour ${user.username},<br />
            Ton abonnement <strong style="color:#e5e7eb;">${user.subscription?.plan?.displayName || 'Premium'}</strong>
            expire dans <strong style="color:#f59e0b;">${daysLeft} jour(s)</strong>.
            Renouvelle-le pour continuer à profiter de toutes les fonctionnalités.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${env.FRONTEND_URL}/abonnement"
                style="display:inline-block;padding:14px 32px;background:#1aa656;color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:12px;">
                Renouveler mon abonnement →
              </a>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

// ── Vérification d'email ──────────────────────────────────────────────────────
async function sendEmailVerification(user, token) {
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Vérifie ton adresse email — fpronix',
    html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0a0b0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0b0d;">
    <tr><td align="center" style="padding:32px 16px;">
      <table style="max-width:520px;width:100%;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="background:rgba(26,166,86,0.15);border:1px solid rgba(26,166,86,0.3);border-radius:12px;padding:8px 14px;font-size:18px;font-weight:800;color:#fff;">
            fp<span style="color:#1aa656;">ronix</span>
          </span>
        </td></tr>
        <tr><td style="background:#111214;border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:36px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">✉️ Vérifie ton email</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
            Bonjour ${user.username},<br />
            Clique sur le bouton ci-dessous pour vérifier ton adresse email. Ce lien est valable <strong style="color:#e5e7eb;">24 heures</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${verifyUrl}"
                style="display:inline-block;padding:14px 32px;background:#1aa656;color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:12px;">
                Vérifier mon email →
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#4b5563;text-align:center;">
            Si tu n'as pas créé de compte sur fpronix, ignore cet email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

module.exports = { sendWelcomeEmail, sendPasswordResetEmail, sendSubscriptionExpiryReminder, sendEmailVerification };
