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

// ── Constantes visuelles communes aux emails ───────────────────────────────────
// Le rendu précédent (body #0a0b0d / carte #111214) était trop proche pour être
// bien visible dans certains clients (Gmail notamment, qui peut aussi ré-appliquer
// son propre mode sombre sur des emails qui ne déclarent pas color-scheme). On
// augmente l'écart de contraste entre le fond et la carte, on éclaircit le texte
// secondaire, et on ajoute le vrai logo (logo-circle.png) au lieu du badge texte seul.
const APP_URL   = env.FRONTEND_URL || 'https://fpronix.com';
const LOGO_URL  = `${APP_URL}/logo-circle.png`;
const BODY_BG   = '#050607';
const CARD_BG   = '#1a1d21';
const BORDER    = 'rgba(255,255,255,0.14)';
const ACCENT    = '#1aa656';
const TEXT_MAIN = '#f5f6f7';
const TEXT_MUTED = '#a1a8b3';
const TEXT_DIM  = '#6b7280';

// En-tête commun (logo circulaire + wordmark) réutilisé par tous les templates.
function emailHeader() {
  return `
    <table cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="padding-right:10px;vertical-align:middle;">
          <img src="${LOGO_URL}" width="40" height="40" alt="fpronix" style="display:block;border-radius:50%;border:1px solid ${BORDER};" />
        </td>
        <td style="vertical-align:middle;">
          <span style="font-size:20px;font-weight:800;color:${TEXT_MAIN};letter-spacing:-0.5px;">
            fp<span style="color:${ACCENT};">ronix</span>
          </span>
        </td>
      </tr>
    </table>`;
}

// Balises à placer dans <head> pour empêcher Gmail/Outlook de réinterpréter les
// couleurs en mode sombre automatique (ce qui délavait le rendu précédent).
const COLOR_SCHEME_META = `
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />`;

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
  <title>Bienvenue sur fpronix</title>${COLOR_SCHEME_META}
</head>
<body style="margin:0;padding:0;background-color:${BODY_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="${BODY_BG}" style="background-color:${BODY_BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              ${emailHeader()}
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td bgcolor="${CARD_BG}" style="background:${CARD_BG};border:1px solid ${BORDER};border-radius:20px;overflow:hidden;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,#1aa656,#16c666,rgba(26,166,86,0.2));"></td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding:40px 36px 32px;">
                    <p style="margin:0 0 8px;font-size:32px;line-height:1;">⚽</p>
                    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_MAIN};line-height:1.25;letter-spacing:-0.3px;">
                      Bienvenue, ${user.username} !
                    </h1>
                    <p style="margin:0 0 28px;font-size:15px;color:${TEXT_MUTED};line-height:1.6;">
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
                        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
                          <table cellpadding="0" cellspacing="0" role="presentation">
                            <tr>
                              <td style="width:36px;vertical-align:top;padding-top:2px;font-size:18px;">${icon}</td>
                              <td>
                                <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:${TEXT_MAIN};">${title}</p>
                                <p style="margin:0;font-size:12px;color:${TEXT_MUTED};line-height:1.5;">${desc}</p>
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
                            style="display:inline-block;padding:14px 32px;background:${ACCENT};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:12px;">
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
              <p style="margin:0 0 6px;font-size:11px;color:${TEXT_DIM};">
                Tu reçois cet email car tu viens de créer un compte sur
                <a href="${appUrl}" style="color:${ACCENT};text-decoration:none;">fpronix</a>.
              </p>
              <p style="margin:0;font-size:10px;color:#4b5563;line-height:1.6;">
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
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" />${COLOR_SCHEME_META}</head>
<body style="margin:0;padding:0;background:${BODY_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="${BODY_BG}" style="background:${BODY_BG};">
    <tr><td align="center" style="padding:32px 16px;">
      <table style="max-width:520px;width:100%;">
        <tr><td align="center" style="padding-bottom:24px;">
          ${emailHeader()}
        </td></tr>
        <tr><td bgcolor="${CARD_BG}" style="background:${CARD_BG};border:1px solid ${BORDER};border-radius:20px;padding:36px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${TEXT_MAIN};">🔐 Réinitialisation du mot de passe</h1>
          <p style="margin:0 0 24px;font-size:14px;color:${TEXT_MUTED};line-height:1.6;">
            Bonjour ${user.username},<br />
            Clique sur le bouton ci-dessous pour réinitialiser ton mot de passe. Ce lien est valable <strong style="color:${TEXT_MAIN};">1 heure</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${resetUrl}"
                style="display:inline-block;padding:14px 32px;background:${ACCENT};color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:12px;">
                Réinitialiser mon mot de passe →
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:${TEXT_DIM};text-align:center;">
            Si tu n'as pas fait cette demande, ignore cet email. Ton mot de passe ne sera pas modifié.
          </p>
        </td></tr>
        <tr><td style="padding:20px 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:${TEXT_DIM};">
            <a href="${env.FRONTEND_URL}" style="color:${ACCENT};text-decoration:none;">fpronix.com</a> — Statistiques football & pronostics
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
<head><meta charset="UTF-8" />${COLOR_SCHEME_META}</head>
<body style="margin:0;padding:0;background:${BODY_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="${BODY_BG}" style="background:${BODY_BG};">
    <tr><td align="center" style="padding:32px 16px;">
      <table style="max-width:520px;width:100%;">
        <tr><td align="center" style="padding-bottom:24px;">
          ${emailHeader()}
        </td></tr>
        <tr><td bgcolor="${CARD_BG}" style="background:${CARD_BG};border:1px solid ${BORDER};border-radius:20px;padding:36px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#f59e0b;">⏰ Abonnement bientôt expiré</h1>
          <p style="margin:0 0 24px;font-size:14px;color:${TEXT_MUTED};line-height:1.6;">
            Bonjour ${user.username},<br />
            Ton abonnement <strong style="color:${TEXT_MAIN};">${user.subscription?.plan?.displayName || 'Premium'}</strong>
            expire dans <strong style="color:#f59e0b;">${daysLeft} jour(s)</strong>.
            Renouvelle-le pour continuer à profiter de toutes les fonctionnalités.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${env.FRONTEND_URL}/abonnement"
                style="display:inline-block;padding:14px 32px;background:${ACCENT};color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:12px;">
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
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" />${COLOR_SCHEME_META}</head>
<body style="margin:0;padding:0;background:${BODY_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="${BODY_BG}" style="background:${BODY_BG};">
    <tr><td align="center" style="padding:32px 16px;">
      <table style="max-width:520px;width:100%;">
        <tr><td align="center" style="padding-bottom:24px;">
          ${emailHeader()}
        </td></tr>
        <tr><td bgcolor="${CARD_BG}" style="background:${CARD_BG};border:1px solid ${BORDER};border-radius:20px;padding:36px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${TEXT_MAIN};">✉️ Vérifie ton email</h1>
          <p style="margin:0 0 24px;font-size:14px;color:${TEXT_MUTED};line-height:1.6;">
            Bonjour ${user.username},<br />
            Clique sur le bouton ci-dessous pour vérifier ton adresse email. Ce lien est valable <strong style="color:${TEXT_MAIN};">24 heures</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${verifyUrl}"
                style="display:inline-block;padding:14px 32px;background:${ACCENT};color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:12px;">
                Vérifier mon email →
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:${TEXT_DIM};text-align:center;">
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

module.exports = { sendEmail, sendWelcomeEmail, sendPasswordResetEmail, sendSubscriptionExpiryReminder, sendEmailVerification };
