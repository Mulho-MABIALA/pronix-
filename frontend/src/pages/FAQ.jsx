import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

const QUESTIONS = [
  {
    category: 'Général',
    items: [
      {
        q: "C'est quoi Pronix ?",
        a: "Pronix est une plateforme de statistiques et de pronostics footballistiques. Elle vous permet de suivre les matchs en temps réel, de consulter des analyses de tipsters, et d'utiliser des outils d'aide à la décision basés sur les données.",
      },
      {
        q: "Pronix propose-t-il des paris sportifs ?",
        a: "Non. Pronix est exclusivement une plateforme d'informations et de statistiques. Nous ne proposons aucun service de paris sportifs et ne sommes affiliés à aucun opérateur de jeux. Les pronostics publiés sont des opinions personnelles, pas des garanties.",
      },
      {
        q: "Qui peut utiliser Pronix ?",
        a: "Toute personne âgée de 18 ans ou plus. Certaines fonctionnalités (publier des pronostics, accès aux données avancées) nécessitent un compte Premium.",
      },
    ],
  },
  {
    category: 'Compte & Abonnement',
    items: [
      {
        q: "Comment créer un compte ?",
        a: "Cliquez sur « S'inscrire » en haut à droite, renseignez votre e-mail et choisissez un mot de passe. L'inscription est gratuite.",
      },
      {
        q: "Quelle est la différence entre FREE et Premium ?",
        a: "Le plan FREE vous donne accès aux matchs, classements et pronostics des autres tipsters. Le plan Premium (8,99 USD/mois) vous permet de publier vos propres pronostics, d'accéder aux analyses IA (Claude), aux données avancées et aux compositions d'équipes.",
      },
      {
        q: "Comment payer l'abonnement Premium ?",
        a: "Nous acceptons Wave, Orange Money, Free Money et carte bancaire via CinetPay et FedaPay. Rendez-vous sur la page « Abonnement » pour choisir votre méthode de paiement.",
      },
      {
        q: "Puis-je annuler mon abonnement ?",
        a: "Oui, à tout moment depuis votre profil. L'annulation prend effet à la fin de la période en cours — vous conservez l'accès jusqu'à la date d'expiration.",
      },
      {
        q: "J'ai oublié mon mot de passe, que faire ?",
        a: "Cliquez sur « Mot de passe oublié » sur la page de connexion. Un lien de réinitialisation vous sera envoyé par e-mail.",
      },
    ],
  },
  {
    category: 'Matchs & Données',
    items: [
      {
        q: "D'où viennent les données des matchs ?",
        a: "Les données sont synchronisées automatiquement depuis FotMob, une source reconnue de données footballistiques. La synchronisation se fait toutes les 4 heures.",
      },
      {
        q: "Pourquoi certains matchs n'affichent pas de statistiques ?",
        a: "Les statistiques détaillées (possession, tirs, corners) ne sont disponibles qu'après le début du match. Pour les matchs programmés, seules les données contextuelles (forme, H2H) sont affichées.",
      },
      {
        q: "Quelles ligues sont disponibles ?",
        a: "Pronix couvre les principales ligues africaines (Sénégal, Côte d'Ivoire, Mali, Ghana, Égypte…) ainsi que les grandes compétitions européennes (Premier League, Ligue 1, Liga, Serie A, Champions League). La liste s'enrichit régulièrement.",
      },
    ],
  },
  {
    category: 'Pronostics & Tipsters',
    items: [
      {
        q: "Comment publier un pronostic ?",
        a: "Vous devez avoir un compte Premium actif. Rendez-vous sur la page d'un match programmé, sélectionnez votre prédiction, choisissez votre niveau de confiance (1 à 5) et publiez. Vous ne pouvez publier qu'un seul pronostic par match.",
      },
      {
        q: "Comment fonctionne le classement des tipsters ?",
        a: "Le classement est basé sur le taux de réussite (% de pronostics corrects) avec un minimum d'un pronostic publié. Les statistiques sont recalculées automatiquement après chaque match terminé.",
      },
      {
        q: "C'est quoi l'analyse IA (Claude) ?",
        a: "Pour chaque match programmé, les abonnés Premium peuvent déclencher une analyse automatique par Claude (IA d'Anthropic). L'IA analyse la forme des équipes, les confrontations directes et les statistiques pour suggérer un pronostic. La limite est de 5 analyses par jour.",
      },
      {
        q: "Les pronostics sont-ils fiables ?",
        a: "Les pronostics sont des opinions d'utilisateurs ou des suggestions algorithmiques. Ils n'ont aucune valeur de garantie. Le sport est imprévisible — même les meilleurs tipsters ne gagnent pas à tous les coups.",
      },
      {
        q: "Comment signaler un pronostic abusif ?",
        a: "Sur la fiche de chaque pronostic, cliquez sur l'icône de signalement. Notre équipe de modération examinera le signalement et prendra les mesures nécessaires.",
      },
    ],
  },
  {
    category: 'Notifications',
    items: [
      {
        q: "Comment activer les notifications ?",
        a: "Cliquez sur l'icône de cloche dans le menu. Votre navigateur vous demandera l'autorisation d'envoyer des notifications. Une fois activées, vous recevrez des alertes pour les résultats et événements importants.",
      },
      {
        q: "Les notifications fonctionnent-elles sur mobile ?",
        a: "Oui, sur Android et iOS (Safari) à condition d'avoir ajouté Pronix à votre écran d'accueil ou d'utiliser un navigateur compatible (Chrome, Edge, Firefox).",
      },
    ],
  },
  {
    category: 'Problèmes techniques',
    items: [
      {
        q: "Le site ne charge pas correctement, que faire ?",
        a: "Essayez de vider le cache de votre navigateur (Ctrl+Shift+R ou Cmd+Shift+R). Si le problème persiste, contactez-nous à contact@pronix.sn en décrivant le problème et votre navigateur.",
      },
      {
        q: "Mon paiement a échoué mais j'ai été débité, que faire ?",
        a: "Contactez-nous immédiatement à contact@pronix.sn avec votre référence de transaction. Nous vérifierons le paiement et activerons votre abonnement manuellement si nécessaire.",
      },
    ],
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-surface-700 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 hover:text-gray-100 transition-colors"
      >
        <span className={`text-sm font-medium ${open ? 'text-gray-100' : 'text-gray-300'}`}>{q}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm text-gray-400 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-50">Questions fréquentes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Vous ne trouvez pas votre réponse ?{' '}
          <a href="mailto:contact@pronix.sn" className="text-primary-400 underline">Contactez-nous</a>
        </p>
      </div>

      {QUESTIONS.map((section) => (
        <section key={section.category} className="space-y-1">
          <h2 className="font-semibold text-primary-400 text-xs uppercase tracking-widest mb-2">
            {section.category}
          </h2>
          <div className="card p-0 overflow-hidden">
            <div className="px-5">
              {section.items.map((item) => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>
      ))}

      <div className="card p-6 text-center space-y-2">
        <p className="text-gray-300 font-medium text-sm">Vous avez d'autres questions ?</p>
        <p className="text-gray-500 text-sm">Notre équipe répond dans les 24h.</p>
        <a
          href="mailto:contact@pronix.sn"
          className="btn-primary mt-2 inline-flex"
        >
          Envoyer un e-mail
        </a>
      </div>
    </div>
  );
}
