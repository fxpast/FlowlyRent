# FlowlyRent — Contribuer / Déployer

## Variables d'environnement

⚠️ **Repo public** : aucune valeur sensible ne doit apparaître dans le code ou les fichiers versionnés.

Copier `.env.example` en `.env` (gitignored) et remplir :

```bash
# Base de données
DB_USERNAME=flowlyrent
DB_PASSWORD=flowlyrent

# JWT
JWT_SECRET=<base64 32+ bytes>
JWT_EXPIRATION=604800000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Stripe Connect OAuth (mode multi-compte hôtes)
STRIPE_CLIENT_ID=ca_...   # Dashboard Stripe → Connect → Paramètres → ID client

# Cloudinary (stockage photos ménage)
CLOUDINARY_SECRET=<api_secret Cloudinary>
# CLOUDINARY_CLOUD_NAME et CLOUDINARY_API_KEY ont des défauts non-sensibles dans application.yml

# Compte superadmin auto-créé au démarrage (AdminBootstrap)
ADMIN_USERNAME=admin@flowlyrent.com
ADMIN_PASSWORD=<mot de passe sécurisé>

# Frontend (environments/environment.ts — ne pas committer les clés live)
stripePublishableKey: 'pk_test_...'
```

---

## Développement local (XAMPP)

```bash
# Démarrer XAMPP (MySQL sur localhost:3306)
# Créer la base :
mysql -u root -e "CREATE DATABASE IF NOT EXISTS flowlyrent CHARACTER SET utf8mb4;"

# Backend (depuis /backend) — pas de fichier mvnw, utiliser mvn directement
mvn spring-boot:run

# Frontend (depuis /frontend)
npm install
npm start  # → http://localhost:4200 avec proxy vers :8080
```

---

## Tokens de développement Beds24

Les tokens de dev sont stockés dans **`.beds24.env.local`** (gitignored — jamais commité).
Lire ce fichier pour tester l'API Beds24 sans passer par le flux d'authentification complet.

---

## Import données locales → Railway

À refaire après chaque évolution de schéma :

```powershell
# 1. Exporter XAMPP
& "C:\xampp\mysql\bin\mysqldump.exe" -u root flowlyrent > flowlyrent_export.sql

# 2. Importer via Node (nécessaire car XAMPP = MariaDB client, Railway = MySQL 8)
#    Créer C:\FlowlyRent\_tmp_import\ avec package.json + import.mjs
#    puis : node import.mjs
```

> Le client MariaDB de XAMPP ne supporte pas le plugin `caching_sha2_password` de MySQL 8.
> Utiliser le script Node.js `mysql2` qui gère aussi le décodage UTF-16 LE du dump.

---

## Production — Netlify (frontend)

- Connecter le repo GitHub sur [app.netlify.com](https://app.netlify.com)
- Netlify lit automatiquement `frontend/netlify.toml`
- Build : `npm ci && npm run build -- --configuration production`
- Publish : `dist/flowlyrent/browser`
- Mettre à jour `environment.prod.ts` avec l'URL Railway du backend

---

## Production — Railway (backend)

- Connecter le repo GitHub sur [railway.app](https://railway.app)
- Root directory : `backend/` — Railway détecte le Dockerfile
- Ajouter un plugin MySQL dans le projet Railway

Variables d'environnement Railway à configurer :

```
SPRING_PROFILES_ACTIVE=prod
JWT_SECRET=<clé base64 32+ octets>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CLIENT_ID=ca_...           # Stripe Connect OAuth
APP_FRONTEND_URL=https://flowlyrent.com  # URL de redirection OAuth Stripe Connect
CLOUDINARY_SECRET=<api_secret Cloudinary — régénérer si compromis>
CORS_ALLOWED_ORIGINS=https://flowlyrent.com,https://www.flowlyrent.com,https://flowlyrent.netlify.app
ADMIN_USERNAME=admin@flowlyrent.com
ADMIN_PASSWORD=<mot de passe sécurisé>
ANALYTICS_INTERNAL_EMAILS=<emails internes séparés par virgule>

# Chatbot IA
GEMINI_API_KEY=<clé Google AI Studio>
GROQ_API_KEY=<clé Groq>
CEREBRAS_API_KEY=<clé Cerebras — https://cloud.cerebras.ai>
```

Les variables `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD` sont injectées automatiquement par Railway depuis le plugin MySQL.

**Profil Spring Boot prod** : `application-prod.yml` (se charge via `SPRING_PROFILES_ACTIVE=prod`)

**CORS** : `WebConfig.java` lit `app.cors.allowed-origins` — défaut localhost:4200 en dev, variable `CORS_ALLOWED_ORIGINS` en prod.

**Stripe Connect** : enregistrer `https://flowlyrent.com/admin/stripe-callback` comme URI de redirection dans Dashboard Stripe → Connect → Paramètres → URI de redirection OAuth.

**WebSocket Railway** : `application-prod.yml` contient `server.forward-headers-strategy: native` pour que Tomcat fasse confiance aux headers `X-Forwarded-*` du proxy Railway. Sans ça, les WebSockets échouent avec 400.

**Bug Railway `property_id`** : la table `housekeeping_tasks` en prod peut avoir une ancienne colonne `property_id NOT NULL` sans valeur par défaut. Fix :

```sql
ALTER TABLE housekeeping_tasks MODIFY property_id BIGINT NULL;
```
