# Sécurité et données privées — Boutique ti i

Ce dépôt contient uniquement le code source et des migrations sans données personnelles réelles.
Ne jamais y ajouter de clés API, mots de passe, jetons, données de paiement réelles, pièces d'identité,
passeports, justificatifs, exports de base de données ou sauvegardes contenant des données clients.

## Où placer les éléments sensibles

- Clés PayDunya et autres secrets serveur : Supabase > Fonctions Edge > Secrets.
- Clé Supabase service_role : uniquement dans l'environnement serveur / Edge Functions, jamais dans le navigateur.
- Pièces d'identité : bucket Supabase Storage privé, accès contrôlé par des policies RLS strictes et liens signés de courte durée.
- Données de commande et coordonnées clients : base Supabase avec RLS limitant chaque vendeur à ses propres commandes.
- Données de carte bancaire : ne pas collecter ni stocker les numéros, dates d'expiration ou CVV. Utiliser uniquement la page de paiement hébergée du prestataire et ses confirmations serveur.

## Fichiers locaux

Les chemins `secrets/`, `private/`, `private-data/`, `uploads/`, `identity-documents/` et `id-docs/`
sont ignorés par Git via `.gitignore`. Cette exclusion évite les ajouts accidentels depuis un poste local.

Important : un dossier ignoré localement n'est pas un coffre-fort et ne protège pas les fichiers déjà suivis par Git.
Ne jamais y placer des données réelles si le poste ou le compte n'est pas protégé.

## Avant toute mise en production

1. Vérifier l'historique Git et toutes les branches à la recherche de secrets déjà publiés.
2. Si une clé a déjà été publiée, la révoquer / la renouveler chez le fournisseur. La supprimer du dernier commit ne suffit pas.
3. Confirmer que le bucket des pièces d'identité existe, est privé et que ses policies autorisent uniquement le propriétaire et les administrateurs autorisés.
4. Tester les policies RLS depuis un compte vendeur distinct et un compte non connecté.
5. Ne pas déployer les scripts SQL historiques de durcissement sans les adapter au schéma réel de la base.
