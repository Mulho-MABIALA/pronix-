export default function CGU() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-50">Conditions Générales d'Utilisation</h1>
        <p className="text-sm text-gray-500 mt-1">Dernière mise à jour : juin 2025</p>
      </div>

      <Section title="1. Objet">
        <p>
          Pronix (ci-après "la Plateforme") est un service d'informations et de statistiques
          footballistiques édité par Pronix SN. Les présentes Conditions Générales d'Utilisation (CGU)
          régissent l'accès et l'utilisation de la Plateforme par tout utilisateur (ci-après "l'Utilisateur").
        </p>
      </Section>

      <Section title="2. Acceptation des conditions">
        <p>
          En accédant à la Plateforme, l'Utilisateur accepte sans réserve les présentes CGU. Si l'Utilisateur
          n'accepte pas ces conditions, il doit cesser immédiatement d'utiliser la Plateforme.
        </p>
      </Section>

      <Section title="3. Description du service">
        <p>
          Pronix propose :
        </p>
        <ul>
          <li>Des statistiques et données relatives aux matchs de football</li>
          <li>Des pronostics publiés par des utilisateurs (tipsters)</li>
          <li>Des outils d'analyse algorithmique</li>
          <li>Un abonnement Premium donnant accès à des fonctionnalités avancées</li>
        </ul>
        <p className="mt-3 font-medium text-amber-400">
          IMPORTANT : Pronix ne propose en aucun cas des services de paris sportifs. Les informations
          publiées sur la Plateforme sont fournies à titre purement informatif et éducatif.
          Elles ne constituent pas des conseils financiers ou des recommandations d'investissement.
        </p>
      </Section>

      <Section title="4. Inscription et compte utilisateur">
        <p>
          L'accès à certaines fonctionnalités nécessite la création d'un compte. L'Utilisateur
          s'engage à fournir des informations exactes et à maintenir la confidentialité de ses
          identifiants. Toute activité réalisée depuis son compte relève de sa responsabilité.
        </p>
        <p>
          L'Utilisateur doit être âgé d'au moins 18 ans pour s'inscrire sur la Plateforme.
        </p>
      </Section>

      <Section title="5. Abonnement Premium">
        <p>
          L'abonnement Premium est disponible au tarif de 8,99 USD par mois. Le paiement est
          traité via les prestataires Wave, CinetPay ou FedaPay. L'abonnement est renouvelable
          mensuellement et peut être résilié à tout moment.
        </p>
        <p>
          En cas de non-paiement, l'accès aux fonctionnalités Premium sera suspendu à la date
          d'expiration de l'abonnement en cours.
        </p>
      </Section>

      <Section title="6. Contenu des utilisateurs">
        <p>
          Les pronostics publiés par les utilisateurs (tipsters) n'engagent que leurs auteurs.
          Pronix ne garantit pas l'exactitude, la pertinence ou la performance passée ou future
          de ces pronostics.
        </p>
        <p>
          L'Utilisateur s'interdit de publier tout contenu illicite, offensant, trompeur ou
          portant atteinte aux droits de tiers. Pronix se réserve le droit de supprimer tout
          contenu non conforme et de suspendre le compte contrevenant.
        </p>
      </Section>

      <Section title="7. Responsabilité">
        <p>
          Pronix ne saurait être tenu responsable de toute perte financière liée à l'utilisation
          des informations publiées sur la Plateforme. L'Utilisateur utilise ces informations
          sous sa seule responsabilité.
        </p>
        <p>
          Pronix ne garantit pas la disponibilité continue de la Plateforme et se réserve le
          droit de la modifier ou de l'interrompre à tout moment.
        </p>
      </Section>

      <Section title="8. Propriété intellectuelle">
        <p>
          L'ensemble des contenus de la Plateforme (textes, images, logos, algorithmes) est
          protégé par le droit de la propriété intellectuelle. Toute reproduction ou utilisation
          sans autorisation préalable est interdite.
        </p>
      </Section>

      <Section title="9. Données personnelles">
        <p>
          La collecte et le traitement des données personnelles sont régis par notre{' '}
          <a href="/politique-confidentialite" className="text-primary-400 underline">
            Politique de confidentialité
          </a>.
        </p>
      </Section>

      <Section title="10. Droit applicable">
        <p>
          Les présentes CGU sont régies par le droit sénégalais. Tout litige sera soumis
          aux juridictions compétentes de Dakar, Sénégal.
        </p>
      </Section>

      <Section title="11. Contact">
        <p>
          Pour toute question relative aux présentes CGU, vous pouvez nous contacter à l'adresse :
          <a href="mailto:contact@pronix.sn" className="text-primary-400 underline ml-1">contact@pronix.sn</a>
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-gray-100 text-base">{title}</h2>
      <div className="text-sm text-gray-400 space-y-2 leading-relaxed">
        {children}
      </div>
    </section>
  );
}
