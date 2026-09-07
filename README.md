# TaskFlow — Application Mobile Cross-Platform

> Application de gestion de tâches développée avec **React Native & Expo**, démontrant une architecture mobile production-ready : authentification JWT, base de données SQLite locale, synchronisation REST API et notifications push.

---

## Table des matières

1. [Aperçu](#aperçu)
2. [Stack technique](#stack-technique)
3. [Architecture](#architecture)
4. [Fonctionnalités](#fonctionnalités)
5. [Structure du projet](#structure-du-projet)
6. [Installation](#installation)
7. [Lancement](#lancement)
8. [Mock API](#mock-api)
9. [Variables d'environnement](#variables-denvironnement)
10. [Base de données SQLite](#base-de-données-sqlite)
11. [Authentification JWT](#authentification-jwt)
12. [Synchronisation offline-first](#synchronisation-offline-first)
13. [Notifications push](#notifications-push)
14. [Compatibilité plateforme](#compatibilité-plateforme)
15. [Build production](#build-production)

---

## Aperçu

TaskFlow est une application mobile cross-platform (iOS, Android, Web) de gestion de tâches. Elle illustre les patterns avancés du développement mobile moderne :

- **Offline-first** : les données sont toujours disponibles, avec ou sans réseau
- **Sync bidirectionnelle** : les changements locaux sont poussés vers le serveur, et les données du serveur sont mergées localement
- **JWT sécurisé** : refresh automatique des tokens avec protection contre les doubles requêtes
- **Notifications intelligentes** : rappels programmés basés sur les échéances

---

## Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Framework | React Native | 0.74.x |
| Plateforme | Expo SDK | 51.x |
| Navigation | Expo Router (file-based) | 3.5.x |
| State management | Zustand | 5.x |
| Base de données native | expo-sqlite (SQLite) | 14.x |
| Stockage web | localStorage (adapter) | — |
| HTTP client | Axios | 1.7.x |
| Notifications | expo-notifications | 0.28.x |
| Animations | react-native-reanimated | 3.10.x |
| TypeScript | Strict mode | 5.3.x |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Expo Router                     │
│         (navigation file-based, SDK 51)          │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              Zustand Stores                      │
│         authStore │ taskStore                    │
└──────┬───────────────────────────┬──────────────┘
       │                           │
┌──────▼──────┐           ┌────────▼──────────────┐
│  SQLite DB  │           │      REST API          │
│ (natif)     │           │   Axios + JWT          │
│ localStorage│           │   auto-refresh         │
│ (web)       │           └────────┬──────────────┘
└──────┬──────┘                    │
       │                  ┌────────▼──────────────┐
       └──────────────────►    SyncEngine          │
                          │  offline-first         │
                          │  debounce 3s           │
                          └───────────────────────┘
```

### Flux de données

```
Action utilisateur
      │
      ▼
SQLite / localStorage  ←── sync_status = pending_create/update/delete
      │
      ▼
Store Zustand  ◄──── UI mise à jour immédiatement (optimistic)
      │
      ▼
SyncEngine (debounce 3s)
      │
      ▼
REST API  ──── markTaskSynced() ──► sync_status = synced
```

---

## Fonctionnalités

### Authentification JWT
- Formulaires login / register avec validation inline
- Indicateur de force du mot de passe à l'inscription
- Tokens stockés en base locale (SQLite / localStorage)
- **Refresh automatique** : l'intercepteur Axios détecte les 401 et relance la requête après refresh
- **Mutex anti-doublons** : une seule requête de refresh même si plusieurs appels échouent simultanément
- Déconnexion avec révocation du refresh token côté serveur

### Base de données SQLite locale
- Schéma versionné avec système de **migrations** (version courante : 3)
- Mode **WAL** (Write-Ahead Logging) pour les performances en concurrence
- Clés étrangères avec `ON DELETE CASCADE`
- Index optimisés sur `user_id`, `status`, `sync_status`, `due_date`
- Repositories typés avec TypeScript strict

### Synchronisation offline-first
- Champ `sync_status` par tâche : `synced | pending_create | pending_update | pending_delete`
- Sync déclenchée automatiquement :
  - 3 secondes après chaque mutation (debounce)
  - Au retour réseau (détection via `expo-network`)
  - Au passage en foreground (détection via `AppState`)
  - Manuellement via le bouton de sync
- **Résolution de conflits** : le serveur est autoritaire sur les tâches `synced`
- Les tâches `pending_*` ne sont jamais écrasées par le serveur

### Notifications push
- Enregistrement du token Expo Push (production)
- **Rappel automatique** 1h avant l'échéance de chaque tâche
- **Résumé quotidien** configurable (8h par défaut)
- Deep link depuis la notification directement vers la tâche concernée
- Dégradation gracieuse sur Expo Go (notifications locales uniquement)

### Interface utilisateur
- Thème sombre complet avec palette cohérente
- Animations fluides (spring, fade, layout) via react-native-reanimated v3
- Barre de tabs avec effet blur sur iOS (BlurView)
- Filtres de tâches par statut avec chips animés
- Recherche temps réel avec highlight
- Gestion des priorités avec code couleur (urgent → rouge, high → orange, medium → jaune, low → vert)
- Progress bar de complétion globale sur le dashboard

---

## Structure du projet

```
TaskFlow-Application-Mobile-Cross-Platform/
│
├── app/                          # Expo Router — écrans
│   ├── _layout.tsx               # Root layout (splash, auth init)
│   ├── index.tsx                 # Redirect auth / tabs
│   ├── (auth)/
│   │   ├── _layout.tsx           # Guard : redirige si déjà connecté
│   │   ├── login.tsx             # Écran de connexion
│   │   └── register.tsx          # Écran d'inscription
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab bar (active sync)
│   │   ├── index.tsx             # Dashboard (stats, tâches urgentes)
│   │   ├── tasks.tsx             # Liste filtrée + création
│   │   └── profile.tsx           # Profil, sync, notifications
│   └── task/
│       └── [id].tsx              # Détail + édition d'une tâche
│
├── src/
│   ├── api/
│   │   ├── client.ts             # Instance Axios + intercepteurs JWT
│   │   ├── auth.ts               # Endpoints d'authentification
│   │   └── tasks.ts              # Endpoints des tâches
│   │
│   ├── db/
│   │   ├── database.ts           # Ouverture SQLite + migrations
│   │   ├── schema.ts             # DDL + migrations versionnées
│   │   ├── webStorage.ts         # Adaptateur localStorage (web)
│   │   └── repositories/
│   │       ├── userRepository.ts # CRUD utilisateur (SQLite + web)
│   │       └── taskRepository.ts # CRUD tâches (SQLite + web)
│   │
│   ├── store/
│   │   ├── authStore.ts          # Zustand : session utilisateur
│   │   └── taskStore.ts          # Zustand : tâches + filtres
│   │
│   ├── sync/
│   │   └── syncEngine.ts         # Moteur de sync offline-first
│   │
│   ├── notifications/
│   │   └── notificationService.ts # Push + notifications locales
│   │
│   ├── hooks/
│   │   ├── useSync.ts            # Hook : sync auto (réseau + foreground)
│   │   └── useNotifications.ts   # Hook : init push + deep links
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx        # Bouton animé (spring press)
│   │   │   ├── Input.tsx         # Input avec icône + validation
│   │   │   └── Badge.tsx         # Badge coloré avec dot
│   │   └── common/
│   │       ├── TaskCard.tsx      # Carte tâche avec swipe + check
│   │       ├── StatsCard.tsx     # Carte statistique (dashboard)
│   │       └── SyncIndicator.tsx # Spinner de synchronisation
│   │
│   ├── types/
│   │   └── index.ts              # Types TypeScript centraux
│   │
│   └── utils/
│       └── index.ts              # Helpers (dates, couleurs, ID)
│
├── scripts/
│   └── mock-server.js            # Serveur REST mock (Node.js pur)
│
├── app.json                      # Configuration Expo
├── babel.config.js
├── metro.config.js
├── tsconfig.json
├── .env.example                  # Template des variables d'env
└── package.json
```

---

## Installation

### Prérequis

- Node.js 18.x ou 20.x
- npm 9+
- [Expo Go](https://expo.dev/go) sur votre téléphone (SDK 51)

### Cloner et installer

```bash
git clone https://github.com/ablayecodeur/TaskFlow-Application-Mobile-Cross-Platform.git
cd TaskFlow-Application-Mobile-Cross-Platform

cp .env.example .env
npm install --legacy-peer-deps
```

---

## Lancement

### Développement sur téléphone (Expo Go)

**Terminal 1 — Mock API server :**
```bash
npm run server
```

**Terminal 2 — Application Expo :**
```bash
npx expo start --offline
```

Scannez le QR code avec Expo Go. Le téléphone et le PC doivent être sur le même réseau Wi-Fi.

> Si vous êtes sur un téléphone physique, remplacez `localhost` dans `.env` par l'IP locale de votre machine (ex: `192.168.1.100`).

### Développement navigateur web

```bash
npm run server     # terminal 1
npx expo start --web  # terminal 2
```

### Émulateur Android (Android Studio requis)

```bash
npm run server
npx expo start --android
```

---

## Mock API

Le fichier `scripts/mock-server.js` est un serveur REST complet en **Node.js pur** (zéro dépendance npm). Il démarre sur le port `3001`.

```bash
npm run server
```

### Compte de démonstration

| Champ | Valeur |
|-------|--------|
| Email | `demo@taskflow.dev` |
| Mot de passe | `Demo1234!` |

3 tâches sont pré-créées pour ce compte.

### Endpoints disponibles

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/v1/auth/login` | Non | Connexion |
| POST | `/v1/auth/register` | Non | Inscription |
| POST | `/v1/auth/refresh` | Non | Refresh token |
| POST | `/v1/auth/logout` | Non | Déconnexion |
| GET | `/v1/auth/me` | Oui | Profil utilisateur |
| GET | `/v1/tasks` | Oui | Liste des tâches |
| POST | `/v1/tasks` | Oui | Créer une tâche |
| PATCH | `/v1/tasks/:id` | Oui | Modifier une tâche |
| DELETE | `/v1/tasks/:id` | Oui | Supprimer une tâche |

### Format des réponses

```json
{
  "data": { ... },
  "message": "ok"
}
```

```json
{
  "message": "Email ou mot de passe incorrect",
  "code": "INVALID_CREDENTIALS",
  "status": 401
}
```

---

## Variables d'environnement

Copiez `.env.example` en `.env` et adaptez :

```env
# URL de base de l'API REST
# Développement local (même machine) :
EXPO_PUBLIC_API_URL=http://localhost:3001/v1

# Développement sur téléphone physique (remplacez par votre IP) :
EXPO_PUBLIC_API_URL=http://192.168.1.100:3001/v1

# Production :
EXPO_PUBLIC_API_URL=https://api.votredomaine.com/v1
```

> Les variables préfixées `EXPO_PUBLIC_` sont exposées au bundle client. Ne jamais y mettre de secrets.

---

## Base de données SQLite

### Schéma (version 3)

```sql
-- Utilisateurs
CREATE TABLE users (
  id               TEXT PRIMARY KEY,
  email            TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  avatar           TEXT,
  access_token     TEXT NOT NULL,
  refresh_token    TEXT NOT NULL,
  token_expires_at INTEGER NOT NULL,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

-- Tâches
CREATE TABLE tasks (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  server_id    TEXT,                    -- ID côté serveur (null si non sync)
  title        TEXT NOT NULL,
  description  TEXT,
  priority     TEXT NOT NULL DEFAULT 'medium',  -- low|medium|high|urgent
  status       TEXT NOT NULL DEFAULT 'pending', -- pending|in_progress|completed|cancelled
  due_date     TEXT,
  completed_at TEXT,
  tags         TEXT NOT NULL DEFAULT '[]',      -- JSON array
  sync_status  TEXT NOT NULL DEFAULT 'pending_create', -- voir ci-dessous
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

-- Notifications
CREATE TABLE notifications (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  data         TEXT NOT NULL DEFAULT '{}',
  scheduled_at TEXT,
  read_at      TEXT,
  created_at   TEXT NOT NULL
);
```

### Cycle de vie sync_status

```
Création locale  →  pending_create
                         │
                    Sync réussie
                         │
                         ▼
                       synced  ──► Modification locale  ──► pending_update
                         │                                        │
                    Suppression                             Sync réussie
                         │                                        │
                         ▼                                        ▼
                   pending_delete                              synced
                         │
                    Sync réussie
                         │
                         ▼
                   (supprimé de la DB)
```

### Migrations

Les migrations sont exécutées automatiquement au démarrage dans `src/db/database.ts`. Pour ajouter une migration :

```typescript
// src/db/schema.ts
export const SCHEMA_VERSION = 4; // incrémenter

export const MIGRATIONS: Record<number, string> = {
  // ... migrations existantes
  4: `ALTER TABLE tasks ADD COLUMN priority_notes TEXT;`,
};
```

---

## Authentification JWT

### Flux complet

```
Login / Register
      │
      ▼
API retourne { accessToken, refreshToken, expiresIn }
      │
      ▼
Stockage en SQLite (natif) / localStorage (web)
      │
      ▼
Chaque requête Axios → intercepteur ajoute Authorization: Bearer <accessToken>
      │
      ▼
API retourne 401 (token expiré)
      │
      ▼
Intercepteur response : POST /auth/refresh avec refreshToken
      │
      ├── Succès → nouveau accessToken stocké → requête originale rejouée
      │
      └── Échec → déconnexion forcée
```

### Protection anti-double refresh

```typescript
// src/api/client.ts
let _refreshPromise: Promise<AuthTokens> | null = null;

// Si un refresh est déjà en cours, toutes les requêtes en attente
// partagent la même Promise au lieu de lancer plusieurs refreshs
if (_refreshPromise) return _refreshPromise;
```

---

## Synchronisation offline-first

### Déclencheurs de sync

| Événement | Délai |
|-----------|-------|
| Mutation locale (create/update/delete) | 3 secondes (debounce) |
| Retour réseau | 1 seconde |
| App en foreground (si > 5min depuis dernière sync) | 1 seconde |
| Bouton manuel | Immédiat |

### Algorithme de sync

```
1. PUSH — Pour chaque tâche pending_create/update/delete :
   - pending_create → POST /tasks → markTaskSynced(localId, serverId)
   - pending_update → PATCH /tasks/:serverId → markTaskSynced()
   - pending_delete → DELETE /tasks/:serverId → deleteLocalTask()

2. PULL — GET /tasks (toutes les tâches du serveur)
   - Pour chaque tâche serveur :
     - Si absente localement → INSERT (sync_status = synced)
     - Si présente et sync_status = synced → UPDATE (serveur gagne)
     - Si présente et sync_status = pending_* → ne pas écraser

3. CLEANUP — Supprimer les tâches locales supprimées côté serveur
   (seulement si sync_status = synced)
```

---

## Notifications push

### Configuration

Les notifications push nécessitent un `projectId` EAS pour fonctionner en production. En Expo Go, seules les **notifications locales** (rappels d'échéance, résumé quotidien) fonctionnent.

### Types de notifications

| Type | Déclencheur | Action au tap |
|------|-------------|---------------|
| `task_due` | 1h avant l'échéance | Ouvre la tâche |
| `daily_digest` | Quotidien à 8h | Ouvre la liste des tâches |
| `sync_complete` | Fin de sync avec changements | — |

### Canaux Android

| Canal | Importance | Usage |
|-------|-----------|-------|
| `taskflow` | HIGH | Rappels d'échéance |
| `reminders` | DEFAULT | Résumé quotidien |

---

## Compatibilité plateforme

| Fonctionnalité | iOS | Android | Web |
|----------------|-----|---------|-----|
| Navigation | ✅ | ✅ | ✅ |
| Authentification JWT | ✅ | ✅ | ✅ |
| Base de données | SQLite | SQLite | localStorage |
| Synchronisation REST | ✅ | ✅ | ✅ |
| Notifications locales | ✅ | ✅ | ⚠️ limité |
| Push tokens distants | ✅ (EAS) | ✅ (EAS) | ❌ |
| Animations | ✅ | ✅ | ✅ |
| BlurView tab bar | ✅ | ❌ (fallback) | ✅ |

L'adaptateur web (`src/db/webStorage.ts`) implémente exactement la même interface que les repositories SQLite, permettant un basculement transparent via `Platform.OS === 'web'`.

---

## Build production

### EAS Build (iOS + Android)

```bash
npm install -g eas-cli
eas login
eas build:configure

# Build Android APK
eas build --platform android --profile preview

# Build iOS
eas build --platform ios --profile production
```

### Export web statique

```bash
npx expo export --platform web
# Output dans le dossier dist/
```

---

## Auteur

Développé par **[Ablaye Codeur](https://github.com/ablayecodeur)**

- GitHub : [@ablayecodeur](https://github.com/ablayecodeur)
- Email : ablayecodeur@gmail.com
