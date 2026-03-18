# MatDash Free Tailwind Next.js Admin Template
#### Preview

 - [Demo](https://themewagon.github.io/matdash-nextjs/)

#### Download
 - [Download from ThemeWagon](https://themewagon.com/themes/matdash-nextjs/)

## Getting Started

1. Clone Repository
```
git clone https://github.com/themewagon/matdash-nextjs.git
```
2. Install Dependencies
```
npm i
```
3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Gestion courrier (Mairie)

L'application inclut un module de gestion de courrier pour l'administration (inspiré Maarch Courrier).

### Base de données (MySQL)

1. Créer une base MySQL et définir `DATABASE_URL` dans `.env` (voir `.env.example`).
2. Générer le client Prisma et appliquer les migrations :

```bash
npm run db:generate
npm run db:push
# ou pour des migrations versionnées :
npm run db:migrate
```

### Migrations (Prisma)

Les migrations sont dans `prisma/migrations/`. Pour **appliquer** les migrations en dev (crée la base si besoin) :

```bash
npm run db:migrate
# ou directement :
npx prisma migrate dev
```

Pour **appliquer** les migrations en production ou sans interaction (CI, déploiement) :

```bash
npx prisma migrate deploy
```

Puis régénérer le client Prisma :

```bash
npm run db:generate
```

**Liste des migrations :**

| Migration | Description |
|-----------|-------------|
| `20250129000000_init` | Schéma initial (User, Contact, OrganisationUnit, Courrier, etc.) |
| `20260129114228_add_recipiendaire_to_organisation_unit` | Champ recipiendaire sur OrganisationUnit |
| `20260129125649_add_assigned_transfer_visa_demande` | assignedTo (Courrier), CourrierTransfert, VisaDemande |
| `20260130135556_add_visa_demande_demandeur_id` | demandeurId sur VisaDemande (retour des avis) |
| `20260130140000_contact_type_societe` | Type contact : MORAL → SOCIETE |
| `20260130150000_contact_raison_sociale` | Champ raisonSociale sur Contact |

**Créer une nouvelle migration** (après modification de `prisma/schema.prisma`) :

```bash
npx prisma migrate dev --name nom_de_la_migration
```

### Fonctionnalités

- **Enregistrement courrier** : priorité, dates, objet, expéditeur (contact avec pop de création), entité traitante, upload document principal et pièces jointes avec prévisualisation.
- **Liste courrier** : filtres (priorité, statut), pagination, lien vers détail.
- **Banettes** : configuration des banettes (libellé, code, entité, ordre).
- **Organigramme** : arbre hiérarchique des unités organisationnelles.
- **Workflows** : création de workflows avec étapes (saisie, visa, signature, envoi), circuit de visa sur un courrier (Viser / Refuser).
- **Fiche courrier** : détail, circuit de visa, historique des visas, documents, historique / traçabilité (audit).
- **Accusés de réception** : API `POST /api/courrier/[id]/accuse-reception`.
- **Notifications** : API `GET /api/notifications`, `PATCH /api/notifications/[id]/read`.
- **OnlyOffice** : config d’édition `GET /api/onlyoffice/config`, callback de sauvegarde `POST /api/onlyoffice/callback` (variables `ONLYOFFICE_SERVER_URL`, `ONLYOFFICE_JWT_SECRET`).

### Variables d'environnement

- `DATABASE_URL` : URL MySQL (requis pour le module courrier).
- `NEXT_PUBLIC_APP_URL` : URL publique de l’app (pour OnlyOffice et callbacks).
- `ONLYOFFICE_SERVER_URL`, `ONLYOFFICE_JWT_SECRET` : optionnel, pour l’édition de documents.
- `UPLOAD_DIR` : optionnel, répertoire des uploads (défaut : `uploads` à la racine du projet).

### OnlyOffice : erreur « Impossible d'enregistrer le document »

Le serveur OnlyOffice doit pouvoir joindre l'URL de callback de votre app. En local (`localhost`), il ne peut pas. **Solution :** Exposer l'app avec ngrok (voir ci-dessous), puis définir `NEXT_PUBLIC_APP_URL` dans `.env` sur l'URL publique et redémarrer Next.js.

### Installation de ngrok (tunnel pour OnlyOffice en local)

[ngrok](https://ngrok.com/) expose votre `localhost` via une URL HTTPS publique, ce qui permet au serveur OnlyOffice d'appeler votre callback.

**1. Installer ngrok**

- **macOS (Homebrew)** :
  ```bash
  brew install ngrok/ngrok/ngrok
  ```
- **macOS / Linux (téléchargement)** : [https://ngrok.com/download](https://ngrok.com/download) — décompresser et placer `ngrok` dans votre `PATH`.
- **Windows** : télécharger depuis [ngrok.com/download](https://ngrok.com/download), ou avec Chocolatey : `choco install ngrok`.

**2. Créer un compte (gratuit)**  
Sur [ngrok.com](https://ngrok.com), créer un compte puis récupérer votre **authtoken** dans le dashboard : [https://dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken).

**3. Configurer l'authtoken**
  ```bash
  ngrok config add-authtoken VOTRE_AUTHTOKEN
  ```

**4. Lancer le tunnel**
  ```bash
  ngrok http 3000
  ```
  (adapter le port si votre app Next.js n’écoute pas sur 3000.)

**5. Récupérer l’URL HTTPS**  
Dans le terminal, ngrok affiche une ligne du type :
  ```
  Forwarding   https://xxxx-xx-xx-xx-xx.ngrok-free.app -> http://localhost:3000
  ```
  Copier l’URL `https://...ngrok-free.app`.

**6. Configurer l’app**  
Dans le fichier `.env` du projet :
  ```
  NEXT_PUBLIC_APP_URL="https://xxxx-xx-xx-xx-xx.ngrok-free.app"
  ```
  Redémarrer le serveur Next.js (`npm run dev`). L’enregistrement OnlyOffice pourra alors fonctionner.

## Author 
```
Design and code is completely written by adminmart and development team. 
```

## License

 - Design and Code is Copyright &copy; [Adminmart](https://adminmart.com)
 - Licensed cover under [MIT]
 - Distributed by [ThemeWagon](https://themewagon.com)

