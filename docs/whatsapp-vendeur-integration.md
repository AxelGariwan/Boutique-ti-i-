# WhatsApp individuel par vendeur — plan d’intégration

## Décision produit
Boutique ti i doit permettre à chaque vendeur de connecter son propre numéro WhatsApp Business. Les messages d'une boutique doivent provenir du numéro professionnel de ce vendeur, jamais d'un numéro partagé par défaut.

Cette branche prépare l'intégration sans modifier les parcours existants. Aucun secret fournisseur, jeton Meta, numéro réel ou identifiant WABA ne doit être ajouté au dépôt.

## État observé dans le dépôt
- Application web : HTML + Alpine.js + JavaScript classique (index.html, script.js).
- Supabase JS est chargé côté navigateur.
- supabase/config.toml déclare actuellement paydunya-webhook (JWT désactivé) et boutique-ai (JWT activé).
- Le modèle métier connu comprend shops, products et orders. La relation boutique/propriétaire existante reste la source d'autorisation.
- WhatsApp ne doit pas modifier les commandes, paiements, vérification d'identité, abonnements ou tableau de bord administrateur.

## Comparaison des fournisseurs

### Infobip
- Documentation dédiée au programme Tech Provider et à Meta Embedded Signup.
- Onboarding des actifs WhatsApp du vendeur depuis l'application, événements de statut et webhooks.
- Le modèle partenaire documenté utilise une ligne de crédit Infobip pour le trafic des comptes clients ; Boutique ti i peut refacturer son propre service.
- À négocier/valider : prix par message et frais Meta pour le Sénégal et les pays cibles, minimums éventuels, support, délais et modalités de facturation.
- Infobip exige une solution partenaire acceptée, la vérification d'entreprise Meta et la revue de l'application pour la mise en production.

### Twilio
- Programme ISV / Tech Provider documenté, Embedded Signup et API Senders.
- Possibilité d'associer les actifs WhatsApp du client à un sous-compte Twilio.
- Frais publics annoncés : 0,005 USD par message entrant ou sortant, auxquels s'ajoutent les frais Meta des modèles selon pays et catégorie. Vérifier le calculateur et les tarifs applicables au Sénégal avant décision.
- Twilio indique environ 3 à 4 semaines pour les étapes d'approbation Meta et de liaison Partner Solution, selon le dossier.
- À confirmer : coût total local, taxes, devise, coûts de numéro/sous-compte et support régional.

### Recommandation provisoire
Ne pas figer le fournisseur avant un test de bout en bout et une offre écrite pour le Sénégal. Infobip mérite le premier entretien commercial ; Twilio est le comparateur de référence grâce à sa documentation ISV et à ses frais publics. Le code doit rester indépendant du fournisseur pour éviter de réécrire l'application lors d'un changement.

## Architecture cible
1. Le vendeur connecté ouvre Paramètres > WhatsApp.
2. Il démarre Meta Embedded Signup depuis Boutique ti i.
3. Meta renvoie un événement d'inscription avec les identifiants WABA et phone_number_id. Le navigateur transmet le résultat à une Edge Function authentifiée.
4. L'Edge Function vérifie l'identité et la propriété de la boutique, finalise l'enregistrement chez le fournisseur et stocke les identifiants non secrets.
5. Les secrets du fournisseur et jetons restent dans Supabase Secrets / environnement Edge Function, jamais dans script.js, HTML, stockage local ou table lisible du navigateur.
6. Les événements et accusés de réception arrivent sur un webhook dédié qui vérifie la signature, déduplique et associe l'événement au bon vendeur.
7. L'envoi vérifie le consentement du destinataire, le sender actif, les modèles approuvés et les limites.

## Modèle de données proposé — à valider sur le schéma réel avant migration

### shop_whatsapp_accounts
- id uuid primary key
- shop_id uuid not null, référence public.shops(id)
- provider text not null : infobip ou twilio
- waba_id text
- phone_number_id text
- display_phone_number text
- status text : pending, active, paused, disconnected, failed
- provider_account_ref text : identifiant non secret / sous-compte si requis
- created_at et updated_at
- contrainte unique sur shop_id si un seul numéro par boutique
- unicité de (provider, phone_number_id) quand l'identifiant existe

### shop_whatsapp_consents
- id uuid primary key
- shop_id uuid not null
- customer_phone text not null
- purpose text : transactionnel ou marketing
- consented_at timestamptz not null
- revoked_at timestamptz
- source text et policy_version text
- consentement marketing séparé du consentement transactionnel

### whatsapp_message_events
- id uuid primary key
- shop_id uuid
- provider text not null
- provider_message_id text
- direction text not null
- message_type text
- status text
- recipient_phone text
- order_id uuid null
- error_code text
- created_at timestamptz
- déduplication par fournisseur et identifiant d'événement/message

Ne pas conserver les corps complets des conversations par défaut. Toute conservation future devra avoir une finalité, une durée, un accès restreint et une politique de suppression.

## Sécurité multi-tenant
- RLS activée sur toutes les nouvelles tables.
- Un vendeur ne lit et ne modifie que les lignes liées à une boutique dont il est propriétaire via shops.owner_id = auth.uid().
- Le vendeur ne peut pas modifier provider, waba_id, phone_number_id, statut vérifié ou références fournisseur depuis le navigateur.
- Connexion, déconnexion, envoi et traitement webhook passent par des Edge Functions.
- Toute opération privilégiée vérifie explicitement l'identité et la propriété de la boutique.
- Ne jamais exposer service_role, clé API fournisseur, jeton Meta ou secret de signature dans le navigateur.
- Webhooks : signature vérifiée, taille limitée, événements dédupliqués, journaux sans secrets.
- Un numéro seul ne prouve pas l'appartenance à une boutique.

## Fonctions Edge envisagées
- whatsapp-connect-start : initialise l'onboarding du vendeur connecté.
- whatsapp-connect-callback : reçoit et valide le résultat Embedded Signup.
- whatsapp-send : envoi transactionnel contrôlé par boutique et consentement.
- whatsapp-webhook : reçoit messages entrants et statuts ; JWT désactivé uniquement pour permettre l'appel fournisseur, avec vérification de signature obligatoire.
- whatsapp-disconnect : déconnecte un sender sans supprimer commandes ni données métier.

## Couche fournisseur indépendante
Interface commune :
- registerSender(...)
- sendTemplateMessage(...)
- sendSessionMessage(...)
- verifyWebhook(...)
- normalizeWebhookEvent(...)
- disconnectSender(...)

Les adaptateurs InfobipAdapter et TwilioAdapter restent isolés. Le code métier ne doit pas appeler directement les endpoints spécifiques du fournisseur.

## Première version des notifications
- Confirmation de commande enregistrée.
- Changement de statut vers confirmé, expédié ou livré.
- Annulation ou remboursement seulement si le statut métier correspondant existe et est validé.

Une erreur WhatsApp ne doit jamais annuler ou bloquer une commande ou un paiement. Ne pas envoyer si le numéro est absent, si le sender n'est pas actif, si le consentement requis manque, si le modèle n'est pas approuvé ou si l'état de commande n'est pas autorisé.

## Conditions de lancement
1. Créer et vérifier le portefeuille Meta de Boutique ti i.
2. Obtenir l'approbation Tech Provider / ISV et les permissions Meta requises.
3. Faire accepter la Partner Solution par le fournisseur choisi.
4. Configurer Embedded Signup et faire approuver l'application Meta.
5. Obtenir les tarifs écrits pour le Sénégal et tester un numéro d'un autre pays cible.
6. Tester avec deux boutiques : chaque vendeur ne voit que son numéro, ses événements et ses journaux.
7. Tester signatures webhook, événements dupliqués, erreurs, désabonnements et politiques RLS.
8. Déployer d'abord en test, puis activer progressivement.

## Portée de cette préparation
Ce document est une spécification, pas une activation WhatsApp. Aucun changement de base de données ou de production n'est effectué. La prochaine étape doit inspecter toutes les migrations et fonctions Edge existantes, puis créer une migration compatible avec le schéma réellement déployé.
