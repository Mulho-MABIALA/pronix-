export default function PolitiqueConfidentialite() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-50">Politique de confidentialité</h1>
        <p className="text-sm text-gray-500 mt-1">Dernière mise à jour : juin 2025</p>
      </div>

      <Section title="1. Responsable du traitement">
        <p>
          Pronix SN, éditeur de la plateforme Pronix, est responsable du traitement de vos
          données personnelles. Contact : <a href="mailto:contact@pronix.sn" className="text-primary-400 underline">contact@pronix.sn</a>
        </p>
      </Section>

      <Section title="2. Données collectées">
        <p>Nous collectons les données suivantes :</p>
        <ul>
          <li><strong className="text-gray-300">Données d'inscription :</strong> adresse e-mail, nom d'utilisateur, mot de passe (chiffré)</li>
          <li><strong className="text-gray-300">Données de profil :</strong> nom affiché, biographie, équipes et ligues favorites</li>
          <li><strong className="text-gray-300">Données de paiement :</strong> référence de transaction (nous ne stockons pas vos coordonnées bancaires)</li>
          <li><strong className="text-gray-300">Données d'utilisation :</strong> pronostics publiés, préférences, historique de navigation sur la Plateforme</li>
          <li><strong className="text-gray-300">Données techniques :</strong> adresse IP, type de navigateur, données de connexion</li>
        </ul>
      </Section>

      <Section title="3. Finalités du traitement">
        <p>Vos données sont utilisées pour :</p>
        <ul>
          <li>Gérer votre compte et votre abonnement</li>
          <li>Fournir les fonctionnalités de la Plateforme (pronostics, classements, statistiques)</li>
          <li>Traiter vos paiements via nos prestataires (Wave, CinetPay, FedaPay)</li>
          <li>Vous envoyer des notifications relatives à votre compte (si vous y avez consenti)</li>
          <li>Améliorer nos services et détecter les fraudes</li>
          <li>Respecter nos obligations légales</li>
        </ul>
      </Section>

      <Section title="4. Base légale">
        <p>
          Le traitement de vos données repose sur : l'exécution du contrat (CGU), votre consentement
          (notifications), notre intérêt légitime (sécurité, amélioration du service) et nos
          obligations légales.
        </p>
      </Section>

      <Section title="5. Partage des données">
        <p>
          Vos données ne sont pas vendues à des tiers. Elles peuvent être partagées avec :
        </p>
        <ul>
          <li>Nos prestataires de paiement (Wave, CinetPay, FedaPay) dans le cadre du traitement des transactions</li>
          <li>Nos hébergeurs techniques (serveurs sécurisés en Europe)</li>
          <li>Les autorités compétentes en cas d'obligation légale</li>
        </ul>
      </Section>

      <Section title="6. Durée de conservation">
        <p>
          Vos données sont conservées pendant la durée de votre compte, puis pendant 3 ans après
          sa suppression pour des raisons légales. Les données de paiement sont conservées 10 ans
          conformément aux obligations comptables.
        </p>
      </Section>

      <Section title="7. Vos droits">
        <p>
          Conformément à la loi sénégalaise sur la protection des données personnelles (loi n°2008-12),
          vous disposez des droits suivants :
        </p>
        <ul>
          <li><strong className="text-gray-300">Droit d'accès :</strong> obtenir une copie de vos données</li>
          <li><strong className="text-gray-300">Droit de rectification :</strong> corriger vos données inexactes</li>
          <li><strong className="text-gray-300">Droit à l'effacement :</strong> demander la suppression de votre compte et de vos données</li>
          <li><strong className="text-gray-300">Droit d'opposition :</strong> vous opposer à certains traitements</li>
          <li><strong className="text-gray-300">Droit à la portabilité :</strong> recevoir vos données dans un format lisible</li>
        </ul>
        <p>
          Pour exercer ces droits, contactez-nous à{' '}
          <a href="mailto:contact@pronix.sn" className="text-primary-400 underline">contact@pronix.sn</a>.
          Nous répondons dans un délai de 30 jours.
        </p>
      </Section>

      <Section title="8. Cookies">
        <p>
          La Plateforme utilise uniquement des cookies techniques nécessaires au fonctionnement
          (session, préférences de thème). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
        </p>
      </Section>

      <Section title="9. Sécurité">
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données :
          chiffrement HTTPS, mots de passe hachés (bcrypt), tokens JWT à durée limitée, accès restreint
          aux données.
        </p>
      </Section>

      <Section title="10. Modifications">
        <p>
          Nous pouvons modifier cette politique à tout moment. En cas de modification substantielle,
          vous serez informé par e-mail ou par notification sur la Plateforme.
        </p>
      </Section>

      <Section title="11. Contact">
        <p>
          Pour toute question : <a href="mailto:contact@pronix.sn" className="text-primary-400 underline">contact@pronix.sn</a>
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-gray-100 text-base">{title}</h2>
      <div className="text-sm text-gray-400 space-y-2 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}
