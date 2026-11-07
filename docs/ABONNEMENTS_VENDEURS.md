# Abonnements vendeurs — Boutique ti i

## Règles métier retenues

- Essai gratuit : 30 jours sur la formule Pro.
- Tarifs initiaux Sénégal : Starter 3 000 XOF/mois, Pro 6 000 XOF/mois, Premium 10 000 XOF/mois.
- Le renouvellement est manuel au lancement (auto_renew = false).
- Les paiements des commandes clients restent séparés des paiements d'abonnement vendeur.
- Le prix et la devise sont lus dans subscription_plans, jamais acceptés comme vérité depuis le navigateur.
- Un retour navigateur vers une URL de succès ne confirme jamais un paiement.

## Migration

Fichier : supabase/migrations/20261105000100_vendor_subscriptions.sql

La migration ajoute :
- subscription_plans : catalogue tarifaire par pays et devise.
- vendor_subscriptions : état d'abonnement du vendeur.
- subscription_payments : transactions d'abonnement.
- payment_webhook_events : registre d'événements webhook idempotents.
- Deux triggers pour donner 30 jours Pro aux nouvelles boutiques, y compris dans un pays dont le tarif local n'est pas encore configuré (plan technique ZZ/XXX non achetable).
- Une reprise limitée aux essais historiques dont shops.trial_end est encore dans le futur.
- Une fonction serveur confirm_vendor_subscription_payment, exécutable uniquement par service_role.

Attention : cette migration est une ébauche et NE DOIT PAS être exécutée sur la base actuelle. Le schéma réel utilise public.shops.id (text), public.shops.owner (uuid) et public.shops.data (jsonb), et non shops.owner_id/country/currency/plan/trial_end. Les informations pays/devise/formule/fin d'essai sont conservées dans les données de boutique et/ou le profil vendeur. La migration doit être réécrite avant tout déploiement afin d'utiliser les vrais types et champs. Elle ne crée pas de table vendors ou admins.

## Déploiement prudent

1. Ne pas déployer l'ancien fichier supabase/SECURITY_HARDENING.sql : il référence des tables et colonnes absentes de la base réelle.
2. Faire une sauvegarde Supabase.
3. Ne PAS exécuter la migration actuelle : elle est incompatible avec le schéma réel (shops.id est text et les colonnes owner_id/country/currency/plan/trial_end n'existent pas). Attendre une migration corrigée et vérifiée.
4. Vérifier les trois tarifs Sénégal dans subscription_plans, le plan technique Pro ZZ/XXX non achetable, et les abonnements générés dans vendor_subscriptions.
5. Ne pas activer les paiements en production tant que la fonction Edge de création de checkout et le webhook signé du prestataire ne sont pas configurés et testés.

## Étapes obligatoires avant paiement réel

Le serveur devra :
1. authentifier l'utilisateur Supabase ;
2. vérifier que auth.uid() possède le shop_id demandé via shops.owner ;
3. charger le plan actif correspondant au pays et à la devise de la boutique ;
4. créer un paiement pending avec montant/devise calculés côté serveur et une clé d'idempotence ;
5. appeler l'API officielle du prestataire avec les secrets conservés dans Supabase Edge Function Secrets ;
6. retourner seulement l'URL de checkout au navigateur ;
7. vérifier la signature du webhook, la référence, le montant, la devise et l'état auprès du prestataire ;
8. enregistrer l'événement webhook de façon idempotente, puis appeler confirm_vendor_subscription_payment avec le rôle serveur.

PayDunya est le prestataire retenu pour une première intégration en mode TEST. L'intégration n'est pas prête pour la production : le modèle SQL et la fonction checkout doivent d'abord être adaptés au schéma réel, puis le protocole webhook doit être validé avec des paiements de test.

## Contrôles à effectuer après migration

- Un nouveau magasin reçoit plan = pro, trial_end = now() + 30 jours et une ligne trialing.
- Un vendeur ne peut ni créer, ni modifier, ni supprimer lui-même ses abonnements ou paiements.
- Un vendeur ne lit que les abonnements et paiements des boutiques dont il est propriétaire.
- Un client ne peut pas confirmer un paiement par une simple requête navigateur.
- Un même événement webhook ou paiement ne peut pas prolonger deux fois un abonnement.
- Les commandes clients ne sont jamais écrites dans subscription_payments.

## Intégration PayDunya (première version)

Le premier prestataire choisi est PayDunya avec le paiement par redirection. La page de paiement est créée exclusivement depuis la fonction serveur `create-subscription-checkout`. Le montant et la devise sont lus depuis `subscription_plans` : le navigateur ne peut pas imposer son propre prix.

Deux fonctions Supabase Edge sont ajoutées :

- `create-subscription-checkout` : exige une session Supabase valide, vérifie que l'utilisateur possède la boutique, lit le tarif actif du pays et crée une facture PayDunya.
- `paydunya-webhook` : reçoit l'IPN PayDunya, vérifie le SHA-512 de la Master Key, relit la facture auprès de PayDunya, contrôle le token, le statut et le montant, puis appelle la fonction SQL réservée au rôle serveur.

La redirection du client vers le site ne valide jamais un abonnement. Seule la notification vérifiée côté serveur peut activer le plan.

### Secrets Supabase à configurer

Dans les secrets des Edge Functions, ajouter les valeurs obtenues dans le tableau de bord PayDunya (ne jamais les mettre dans le code, dans GitHub ou dans une conversation) :

- `PAYDUNYA_MASTER_KEY`
- `PAYDUNYA_PRIVATE_KEY`
- `PAYDUNYA_TOKEN`
- `PAYDUNYA_CALLBACK_URL` = URL publique de la fonction `paydunya-webhook`

Les variables Supabase `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont fournies à l'environnement des Edge Functions par Supabase. Ne jamais exposer la Service Role Key dans le navigateur.

### Déploiement et tests

1. Ne pas exécuter la migration `20261105000100_vendor_subscriptions.sql` dans son état actuel ; attendre sa réécriture et sa validation sur le schéma réel.
2. Déployer les deux Edge Functions.
3. Configurer les secrets PayDunya en mode TEST et l'URL IPN.
4. Effectuer un paiement test pour Starter (3 000 XOF), Pro (6 000 XOF) et Premium (10 000 XOF).
5. Vérifier qu'un paiement en attente, annulé, échoué, avec montant incorrect ou hash invalide n'active jamais un abonnement.
6. Vérifier qu'une notification répétée ne crée pas plusieurs abonnements.

**Limite actuelle :** seuls les tarifs du Sénégal (SN/XOF) sont semés dans la migration. Les fonctions refusent donc un achat dans un autre pays tant que son tarif et sa devise n'ont pas été configurés et validés. Le choix de PayDunya ne signifie pas que tous les pays sont déjà ouverts. Aucun paiement réel n'est activé tant que les secrets, le compte marchand et les fonctions ne sont pas configurés et testés.
