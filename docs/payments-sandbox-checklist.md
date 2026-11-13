# Boutique ti i — checklist de validation des paiements sandbox

## Garde-fous avant les tests

- Utiliser uniquement des identifiants sandbox : Nkap `ltcpay_test_...`, Capay `sk_test_...`.
- Conserver PayDunya tel quel ; ne pas remplacer ses clés ni son webhook.
- Configurer les secrets uniquement dans Supabase Edge Function Secrets, jamais dans le navigateur, Git ou les journaux.
- Ne pas appliquer la migration SQL ni déployer les fonctions avant revue du diff et vérification des secrets.
- Ne pas activer de tarif pays/devise tant que le couple n'est pas confirmé dans le tableau de bord du prestataire.

## Secrets serveur attendus

### Nkap Pay
- `NKAP_API_KEY`
- `NKAP_API_SECRET`
- `NKAP_WEBHOOK_SECRET`

### Capay Global
- `CAPAY_API_KEY` (clé sandbox commençant par `sk_test_`)
- `CAPAY_WEBHOOK_SECRET` (secret `whsec_` de l'endpoint sandbox)

Les secrets Supabase standards `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` restent gérés par Supabase.

## État actuel de l'intégration Boutique ti i

- Les 18 tarifs XAF sont enregistrés dans Supabase : Starter 3 000, Pro 6 000 et Premium 10 000, pour CM, CF, CG, GA, TD et GQ.
- Le front vendeur conserve PayDunya pour SN/XOF. Pour XAF, Nkap Pay est sélectionné par défaut ; Capay Global est proposé uniquement pour le Cameroun en sandbox.
- Le checkout Nkap interroge `GET /payments/countries` avant de créer un paiement. Un pays XAF tarifé dans Boutique ti i n'est pas automatiquement considéré comme desservi par Nkap : l'API du compte marchand doit le confirmer.
- Pour les pays où Nkap signale `hosted_payment_page=true`, le checkout utilise `BANK_CARD` et redirige vers la page hébergée afin que le client choisisse son opérateur et saisisse son numéro.
- La migration `20261112000100_allow_subscription_payment_providers.sql` n'est pas encore appliquée.
- À la dernière vérification, seule la fonction `boutique-ai` était déployée dans ce projet Supabase. Les checkouts et webhooks de paiement doivent être déployés après configuration des secrets et revue finale.

## Scénarios de test

| Scénario | Procédure | Résultat attendu |
|---|---|---|
| Paiement réussi | Créer un checkout sandbox et terminer le paiement | Paiement `paid`, abonnement actif une seule fois |
| Paiement refusé | Utiliser un scénario/numéro sandbox refusé | Paiement `failed`, aucun abonnement activé |
| Webhook doublé | Renvoyer exactement le même événement | Réponse 2xx après traitement initial, aucun second abonnement |
| Montant incorrect | Envoyer un événement de test signé avec un montant différent de la base | Réponse 409, aucune activation |
| Devise incorrecte | Envoyer un événement signé avec une devise différente | Réponse 409, aucune activation |
| Signature incorrecte | Modifier la signature ou le corps | Réponse 401, aucune écriture de paiement |
| Événement hors ordre | Envoyer un ancien événement non terminal après un terminal | Aucun retour en arrière du statut |

## Capay Global sandbox

Le simulateur documente des numéros de test se terminant par :
- `0001` : succès
- `0002` : échec pour solde insuffisant
- `0005` : expiration
- `0008` : webhook doublé
- `0009` : succès tardif

Les numéros complets doivent respecter le format du pays testé. Capay indique que les clés sandbox ne déplacent pas d'argent réel.

## Nkap Pay sandbox

La clé doit commencer par `ltcpay_test_`. Le webhook vérifie la signature HMAC-SHA256 du corps brut, puis relit le paiement avec `GET /payments/{reference}`. La liste réelle des pays, devises et opérateurs doit être lue depuis `GET /payments/countries` avant d'activer un tarif. La documentation publique consultée ne fournit pas de jeu de numéros de simulation déterministes : utiliser les instructions sandbox du compte marchand.

## Vérifications après chaque essai

1. Une seule ligne de paiement par tentative logique.
2. Le fournisseur, la référence, le montant et la devise correspondent.
3. L'événement webhook est unique par couple fournisseur/identifiant.
4. Un paiement refusé ou incohérent ne crée jamais d'abonnement actif.
5. Un paiement réussi ne prolonge l'abonnement qu'une seule fois.
6. La vérification d'identité, les permissions et le tableau de bord administrateur restent inchangés.
