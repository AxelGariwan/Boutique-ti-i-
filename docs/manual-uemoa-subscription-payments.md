# Architecture — abonnements manuels UEMOA et CEMAC (phase de lancement)

## Décision produit

Pendant les six premiers mois d'exploitation, les abonnements des vendeurs des huit pays de l'UEMOA sont réglés par transfert manuel. Le vendeur effectue le transfert, saisit la référence (et éventuellement son numéro payeur), puis l'administrateur vérifie le crédit réellement reçu dans son compte et approuve la demande. Aucune capture d'écran ni déclaration du vendeur ne déclenche seule une activation.

Moyens proposés selon disponibilité locale :
- UEMOA : Wave, Orange Money, PI-SPI via une banque ou un établissement participant/homologué.
- CEMAC : Orange Money, MTN Mobile Money, Moov Money, Airtel Money ou autre réseau local configuré et vérifié. PI-SPI n'est pas un moyen CEMAC.

Le vendeur ne voit que les moyens configurés comme actifs pour son pays et sa devise. Les coordonnées de réception ne sont jamais codées en dur dans le JavaScript.

## Pays et devises

Les huit pays UEMOA sont :
- Bénin (BJ) — XOF
- Burkina Faso (BF) — XOF
- Côte d'Ivoire (CI) — XOF
- Guinée-Bissau (GW) — XOF
- Mali (ML) — XOF
- Niger (NE) — XOF
- Sénégal (SN) — XOF
- Togo (TG) — XOF

Les six pays CEMAC couverts par le catalogue actuel sont : Cameroun (CM), République centrafricaine (CF), Congo (CG), Gabon (GA), Tchad (TD) et Guinée équatoriale (GQ), en XAF.

Audit de la base : `subscription_plans` contient déjà Starter/Pro/Premium à 3 000 / 6 000 / 10 000 FCFA pour le Sénégal et les six pays CEMAC. Les 21 combinaisons XOF des sept autres pays UEMOA ont été ajoutées par la migration. Les forfaits XAF existants sont conservés.

Les coordonnées de réception CEMAC doivent être des comptes réellement capables de recevoir localement. PI-SPI est réservé à l'UEMOA et ne doit pas être proposé en CEMAC.

## Afrique centrale : opérateurs à étudier sans présumer des exigences KYC

- CamPay : candidat pour le Cameroun, accepte MTN et Orange Cameroun, propose API et liens de paiement. Le site annonce création de compte rapide, mais ne publie pas clairement une liste complète des documents KYC/RCCM dans les pages consultées. Contacter le support pour confirmer l'éligibilité d'un indépendant sans RCCM avant intégration.
- Monetbil : candidat à étudier pour le Cameroun, le Congo et le Gabon notamment ; sa liste officielle de réseaux inclut MTN/Orange au Cameroun, MTN/Airtel au Congo Brazzaville et Airtel/Moov au Gabon. Les pages publiques ne suffisent pas à confirmer les documents marchands exigés.
- Smobilpay/Maviance : couverture régionale CEMAC et API, mais processus partenaire avec validation, contrat et KYC/due diligence avant production. À considérer pour une phase plus avancée.

Aucun de ces opérateurs ne doit être présenté comme exempt de RCCM tant que le support ne l'a pas confirmé par écrit. En attendant, les paiements CEMAC sont configurables manuellement seulement si Boutique ti i possède un compte local de réception vérifié et contrôlé. Ne jamais utiliser un compte d'un tiers sans mandat et accord clair.

Sources consultées le 13 novembre 2026 :
- https://www.campay.net/fr/
- https://fr.monetbil.cm/operators
- https://fr.monetbil.cm/merchants
- https://s3papidoc.smobilpay.maviance.info/

## 221 Pay — périmètre distinct

221 Pay est étudié comme futur opérateur API, pas activé dans cette première phase. Sa documentation actuelle annonce Wave/Orange Money au Sénégal et des rails au Sénégal, en Côte d'Ivoire, au Burkina Faso, au Togo et au Bénin. Le catalogue actuel ne couvre pas le Mali, le Niger ni la Guinée-Bissau. Les moyens hors Sénégal doivent être activés sur le projet et leur disponibilité doit être relue depuis l'API au moment de l'intégration. Le service indique qu'une pièce d'identité vérifiée est nécessaire avant les encaissements réels/retraits, même si RCCM et NINEA ne sont pas requis pour commencer. Vérifier les conditions et l'éligibilité du compte du marchand avant tout passage en production.

Documentation consultée le 13 novembre 2026 :
- https://221.orvlabs.com/pay
- https://221.orvlabs.com/pay/moyens-et-pays
- https://apps.orvlabs.com/conditions-utilisation

## Parcours vendeur

1. Le vendeur choisit Starter, Pro ou Premium.
2. Le serveur vérifie la session Supabase, la propriété de la boutique, le pays UEMOA et le forfait actif correspondant (code pays + XOF + montant lu côté serveur).
3. Boutique ti i crée une ligne `subscription_payments` en statut `pending`, avec le fournisseur interne `manual_transfer`, une clé d'idempotence et un identifiant de demande.
4. Le serveur renvoie les méthodes de paiement actives configurées pour le pays (libellé, bénéficiaire, numéro/identifiant, instructions). Les détails sont issus de la configuration administrateur, pas du navigateur.
5. Le vendeur effectue le transfert, puis soumet la référence de transaction et éventuellement son numéro payeur. La demande reste `pending`.
6. L'interface affiche « Paiement à vérifier » et ne modifie pas le plan actif.

## Parcours administrateur

Ajouter une rubrique « Abonnements » à `admin.html`, sans remplacer les onglets Vendeurs, Commandes et Statistiques.

La rubrique doit permettre :
- de filtrer les demandes en attente / validées / refusées ;
- de voir vendeur, boutique, pays, formule, montant, devise, méthode, référence de transaction, numéro payeur, date et historique ;
- de configurer les moyens de réception actifs par pays (méthode, bénéficiaire, numéro/IBAN/identifiant PI-SPI, instructions) ;
- de vérifier le crédit dans l'application ou le compte du bénéficiaire ;
- d'approuver ou refuser une demande, avec note administrative facultative.

La page admin utilise déjà la table `admins(user_id)`. Toutes les actions privilégiées doivent vérifier ce droit côté serveur/SQL, pas seulement masquer les boutons dans l'interface.

## Modèle de données proposé

### 1. Étendre `subscription_payments`

Ajouter des colonnes nullables afin de préserver les anciennes lignes PayDunya/Nkap/CapaPay :
- `payment_method` : `wave`, `orange_money`, `pi_spi` ou autre méthode manuelle explicitement autorisée ;
- `payer_phone` ;
- `payer_reference` ;
- `admin_note` ;
- `reviewed_by` (UUID de l'administrateur) ;
- `reviewed_at` (timestamptz).

Ne pas réutiliser `provider_reference` pour la référence saisie par le vendeur : cette colonne reste destinée à la référence du prestataire automatique. La référence de transfert manuelle doit rester distincte.

### 2. Nouvelle table `subscription_manual_payment_methods`

Champs proposés :
- `id` UUID ;
- `country_code` (BJ, BF, CI, GW, ML, NE, SN, TG) ;
- `currency` (XOF) ;
- `method_code` (wave, orange_money, pi_spi) ;
- `display_name`, `account_name`, `account_reference`, `instructions` ;
- `is_active`, `created_at`, `updated_at`.

Une méthode est proposée uniquement si elle est active et configurée pour le pays. Les identifiants de compte sont des coordonnées de paiement affichées au vendeur ; aucun secret API n'y est stocké.

### 3. Validation atomique

Créer une fonction SQL dédiée à l'approbation manuelle. Elle doit :
- exiger une session authentifiée et vérifier `auth.uid()` dans `public.admins` ;
- verrouiller la ligne du paiement ;
- accepter uniquement une demande `pending` du fournisseur `manual_transfer` ;
- revalider boutique, forfait, montant et devise ;
- marquer le paiement `paid`, renseigner `reviewed_by` / `reviewed_at` ;
- expirer l'abonnement précédent actif/essai, puis créer le nouvel abonnement mensuel (renouvellement à partir de l'expiration courante si elle est encore future) ;
- mettre à jour `shops.data.plan` et effacer la période d'essai du vendeur ;
- être idempotente : un second clic ne crée jamais un deuxième abonnement.

Une demande refusée passe à `failed` et conserve sa trace. Ne jamais activer sur la seule base d'une référence ou d'une capture fournie par le vendeur.

## Edge Functions proposées

- `create-manual-subscription-payment` : authentifie le vendeur, vérifie qu'il possède la boutique, valide pays/forfait et crée la demande pending ; renvoie les coordonnées de réception actives.
- `admin-review-manual-subscription-payment` : authentifie l'utilisateur, vérifie son appartenance à `admins`, puis appelle la fonction SQL atomique pour approuver/refuser.
- `admin-save-manual-payment-method` : réservé aux admins pour ajouter/modifier/activer/désactiver les coordonnées de réception.

Les fonctions automatiques PayDunya et Nkap ne sont pas appelées pour les huit pays UEMOA dans cette phase. Leur code et les anciennes données ne sont pas supprimés. Capay Global hors UEMOA n'est pas modifié par ce périmètre.

## Sécurité et règles

- Aucune clé service_role, clé 221 Pay ou secret webhook dans `script.js`, `admin.html` ou un dépôt public.
- RLS activé sur la nouvelle table et sur les nouvelles données exposées.
- Lecture publique/authentifiée limitée aux méthodes actives nécessaires à l'affichage ; écriture des coordonnées réservée aux administrateurs.
- Un vendeur ne peut créer une demande que pour sa propre boutique et un forfait disponible dans son pays.
- Un vendeur ne peut ni changer le montant, ni choisir un autre pays/devise, ni marquer un paiement payé.
- L'administrateur doit confirmer l'argent réellement reçu dans son compte avant approbation.
- Historique et audit des décisions conservés ; pas de suppression des paiements historiques.
- Les remboursements restent un processus séparé et manuel durant cette phase.

## Séquence de livraison sûre

1. Créer une migration avec `supabase migration new manual_uemoa_subscription_payments` dans le dépôt local, puis y intégrer le SQL revu.
2. Réconcilier l'historique des migrations avec Supabase distant avant toute application ; ne jamais rejouer une migration déjà appliquée (notamment les écarts de versions déjà observés sur les migrations précédentes).
3. Ajouter les forfaits XOF des sept pays manquants et la configuration de moyens de réception.
4. Développer les Edge Functions et la rubrique admin, puis brancher le parcours vendeur.
5. Tests : propriétaire/non-propriétaire, pays hors UEMOA, méthode inactive, montant falsifié, référence vide/dupliquée, double approbation, refus, renouvellement avant/après expiration, permissions admin et RLS.
6. Déployer uniquement sur Preview / environnement de test et vérifier avec de faux paiements.
7. Production uniquement après revue et autorisation explicite.

## Hors périmètre immédiat

- Intégration API 221 Pay (étude seulement).
- Paiement automatique PI-SPI : les moyens manuels utilisent les coordonnées d'un établissement participant ; une API PI-SPI Business sera un projet séparé, soumis à l'éligibilité et à l'homologation.
- Déploiement production.
- Modification des commandes clients, du paiement à la livraison, des profils, de la vérification d'identité ou des permissions générales du tableau de bord.
