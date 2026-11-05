# Sécurité — Boutique ti i

## Changements de cette branche

- Sessions vendeur : contrôle d'erreur sur getSession(), revalidation de l'utilisateur avant sauvegarde.
- Déconnexion : signOut() sans vider tout localStorage/sessionStorage.
- Documents d'identité : vérification de la session propriétaire, validation du type et de la taille, suppression du fichier uploadé si l'enregistrement du chemin échoue.
- Visites publiques : retrait de l'UPDATE direct de shops depuis le navigateur public. Le compteur doit être modifié par track_view côté serveur.
- Administration : validation/refus d'identité et suspension via fonctions SQL SECURITY DEFINER, au lieu d'UPDATE directs depuis le navigateur.
- SQL : politiques RLS de base pour shops, vendors, orders, admins et Storage.

## Déploiement obligatoire

1. Ouvrir Supabase > SQL Editor.
2. Exécuter d'abord `supabase/SECURITY_DIAGNOSTICS.sql` (lecture seule) et conserver les résultats.
3. Faire une sauvegarde/export de la base.
4. Comparer les résultats du diagnostic aux hypothèses de la migration. Ne pas exécuter la migration tant que les types, colonnes, triggers et policies Storage ne sont pas confirmés.
5. Vérifier que les colonnes correspondent : shops.owner, shops.id, shops.data, shops.suspended; vendors.id, vendors.id_status, vendors.id_reject_reason, vendors.id_doc_path, vendors.id_consent_at; orders.shop_id, orders.status; admins.user_id.
6. Vérifier que vendors.id et shops.owner utilisent des UUID et que le type de shops.id correspond aux fonctions RPC.
7. Exécuter `supabase/SECURITY_HARDENING.sql` sur un environnement de test d'abord, après adaptation au diagnostic.
8. Tester inscription, connexion, dépôt de pièce, affichage public, commande, mise à jour du statut, suspension et suppression de compte.

**Ne pas exécuter l'ancien FIX_ALL.SQL.** Il crée notamment des politiques shops_insert et shops_select avec `true`, ce qui autorise l'accès public, et son déclencheur de suppression est risqué.

## Points à vérifier avant production

- Les policies Storage préexistantes : Supabase combine les policies permissives avec OR. La migration remplace les policies des tables publiques concernées, mais il faut vérifier manuellement les policies déjà présentes sur storage.objects et retirer toute policy générale qui autorise la lecture des documents id-docs.
- Le bucket `id-docs` doit être privé. Ne jamais utiliser getPublicUrl pour ce bucket. Les liens signés admin doivent rester courts et l'admin doit être contrôlé par la table admins.
- `get_shop` doit uniquement renvoyer les boutiques approuvées et non suspendues et ne jamais renvoyer les données privées du vendeur.
- `place_order` doit recalculer le total à partir des produits en base, pas faire confiance aux prix/quantités fournis par le navigateur.
- `track_view` doit incrémenter le compteur en interne sans accorder d'UPDATE public sur shops.
- `delete_my_account` doit vérifier auth.uid() et supprimer uniquement le compte appelant.
- Le compte administrateur doit être ajouté manuellement dans public.admins par une personne de confiance. Ne jamais exposer de clé service_role dans le navigateur.
- Le flux WhatsApp reste désactivé dans config.js. Avant de l'activer, tester le couple channel=whatsapp / verifyOtp type avec le fournisseur Supabase/Twilio.

## Important

Le fichier SQL est une migration à appliquer dans Supabase; le pousser sur GitHub ne modifie pas automatiquement la base distante. Les changements JavaScript/HTML de cette branche ne deviennent actifs sur le site qu'après fusion/déploiement. La sécurité réelle dépend de RLS et des fonctions SQL appliquées sur Supabase.

## Risques fonctionnels repérés à traiter

- `place_order` reçoit actuellement `p_total` calculé dans le navigateur et aucun détail fiable des lignes de panier. La fonction doit recalculer le prix et le total à partir du catalogue serveur, contrôler le stock et enregistrer les lignes de commande.
- Le flux de carte bancaire actuel ne contacte pas de prestataire de paiement : il ne doit pas présenter une carte comme réellement débitée ou un paiement comme confirmé. Intégrer un PSP et ne jamais stocker les numéros/CVV dans l'application.
- Le flux de suppression appelait auparavant la suppression directe de la boutique avant `delete_my_account`. Cela a été retiré dans la branche pour éviter le déclencheur dangereux de `FIX_ALL.SQL`.
