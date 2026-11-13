# Boutique ti i — Plan d'intégration WhatsApp hybride

## Décisions validées
- OTP vendeur : e-mail ou WhatsApp au choix du vendeur.
- Notifications : numéro central Boutique ti i par défaut ; numéro WhatsApp Business du vendeur facultatif lorsqu'il est connecté et actif.
- Le client doit pouvoir suivre sa commande sur le site même si WhatsApp est indisponible.
- Le vendeur reçoit les nouvelles commandes ; le client reçoit les changements de statut ; le livreur reçoit les missions et mises à jour qui le concernent.
- Préserver l'authentification, la vérification d'identité, le tableau de bord admin, les paiements, le paiement à la livraison, les photos vendeurs et les langues existantes.

## État réel du schéma vérifié en production
- `shops.id` est de type text ; propriétaire stocké dans `shops.owner` (uuid) ; paramètres métier dans `shops.data` (jsonb).
- `vendors.id` est un uuid et correspond à `auth.users.id` pour les profils actuellement vérifiés ; `vendors.phone` et `vendors.email` existent.
- `orders.shop_id` est text ; `orders.id` uuid ; `orders.status` text ; `orders.payment_status` text ; commande et articles stockés dans les colonnes existantes.
- `shops.data` contient déjà notamment `wa`, `allowCod`, `products`, `country`, `currency`, `owner`, `name`.
- Les statuts actuellement observés incluent `processing` et `En attente de paiement`. Le workflow final doit normaliser les transitions sans casser les valeurs historiques.

## État technique vérifié
- Le dépôt contient deux lignées distinctes : `feature/cash-on-delivery` et `feature/whatsapp-vendeur-onboarding`. Elles ne doivent pas être fusionnées aveuglément.
- Une branche de travail isolée `feature/whatsapp-hybrid-integration` a été créée à partir de `feature/cash-on-delivery`.
- Le parcours actuel de commande ouvre un lien WhatsApp prérempli ; il ne constitue pas un envoi automatique serveur.
- Le dépôt documente déjà un futur onboarding fournisseur/Meta, mais les fonctions d'envoi automatique et de webhooks ne sont pas déployées.
- Fonctions Edge actuellement déployées : `boutique-ai`, `create-nkap-subscription-checkout`, `nkap-pay-webhook`, `create-capay-subscription-checkout`, `capay-global-webhook`.

## Architecture cible
1. Supabase Auth reste la source d'identité. Ne pas créer un deuxième système de comptes.
2. Le canal OTP est choisi au signup. L'e-mail utilise le flux Auth existant ; le canal WhatsApp utilise une fonction serveur avec OTP aléatoire, haché, expirant, limité en fréquence et en tentatives.
3. Les connexions WhatsApp sont isolées par boutique/propriétaire et stockent uniquement les identifiants non secrets et l'état de connexion. Les jetons Meta/fournisseur restent dans des secrets serveur chiffrés, jamais dans des colonnes lisibles par le client.
4. Une file transactionnelle d'outbox reçoit les événements métier. Une fonction Edge traite la file, sélectionne le sender (vendeur actif, sinon numéro central), vérifie consentement, modèle approuvé et fenêtre WhatsApp, puis envoie.
5. Les webhooks entrants vérifient la signature, dédupliquent les événements et enregistrent les accusés de réception/livraison/échec.
6. Les changements de statut passent par une transition métier contrôlée qui écrit le nouvel état et l'événement de notification dans la même transaction.
7. Le suivi livreur commence par une attribution à un numéro et un lien de suivi à jeton aléatoire, expirant et limité à la livraison concernée. Un compte livreur dédié pourra venir ensuite.

## Modèle de données proposé (à concevoir après revue complète des migrations)
- `whatsapp_connections` : boutique, fournisseur, numéro masqué/format E.164, identifiants Meta non secrets, statut, date de connexion.
- `notification_preferences` : canal, sender préféré, consentements et choix de repli.
- `notification_outbox` : événement, destinataire, modèle, variables, état, compteur d'essais, prochaine tentative, clé d'idempotence.
- `notification_logs` : identifiant fournisseur, état envoyé/livré/lu/échoué, code d'erreur expurgé, horodatages.
- `deliveries` : commande, nom/téléphone du livreur, état et horodatages, jeton de suivi haché.
- OTP WhatsApp : stockage séparé des challenges hachés avec expiration, compteur d'essais et limitation anti-abus ; aucun code en clair.

## Sécurité et fiabilité obligatoires
- RLS activé et politiques minimales par propriétaire/boutique ; tables d'outbox, secrets et logs non accessibles directement aux rôles anon/authenticated.
- Fonctions serveur avec validation d'entrée, autorisation explicite, vérification des signatures webhook et limites de débit.
- Idempotence pour empêcher les doubles notifications ; retry exponentiel avec plafond et file d'échec.
- Échec WhatsApp non bloquant pour une commande ou un paiement ; statut visible sur le site.
- Consentement client pour les notifications WhatsApp et modèles Meta approuvés lorsque requis.
- Ne pas exposer les données de commande ou de livraison à un autre vendeur, client ou livreur.

## Séquence de livraison
1. Consolider les modifications OTP/identité de la branche WhatsApp dans cette branche par sélection fichier/commit après comparaison des diffs.
2. Écrire des tests de non-régression et vérifier les parcours d'inscription/connexion, commandes, paiements et COD.
3. Ajouter les migrations compatibles avec le schéma réel, les politiques RLS et les tests SQL.
4. Développer les fonctions Edge OTP WhatsApp, connexion Meta, envoi, webhook et traitement outbox.
5. Ajouter les réglages vendeur et les transitions de commande/livraison dans l'interface.
6. Configurer les secrets côté Supabase et le numéro central via un fournisseur officiel.
7. Tester en Preview avec numéros consentants, puis déployer en production uniquement après validation explicite.

## Points bloquants avant envoi réel
- Choisir/valider le fournisseur WhatsApp Business Platform et son modèle commercial.
- Vérifier l'éligibilité du numéro central Meta et les autorisations/approbations Tech Provider nécessaires pour gérer les numéros de vendeurs.
- Créer les modèles de messages et obtenir leur approbation.
- Les credentials doivent être configurés dans les secrets Supabase par le propriétaire ; ne jamais les partager dans le chat.

## Interdictions de déploiement
- Ne pas modifier `main` ni fusionner en production sans validation.
- Ne pas exécuter de migration sur la base de production avant revue du SQL, tests et sauvegarde.
- Ne pas désactiver ni supprimer les flux existants d'identité, paiement, admin, OTP ou WhatsApp.
