# TaskFlow — Application Mobile Cross-Platform

Application mobile de gestion de tâches développée avec **React Native & Expo**, démontrant une architecture production-ready.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework mobile | React Native 0.76 + Expo SDK 52 |
| Navigation | Expo Router v4 (file-based) |
| State management | Zustand |
| Base de données locale | expo-sqlite (SQLite avec migrations) |
| HTTP client | Axios + intercepteurs JWT |
| Notifications push | expo-notifications |
| Animations | react-native-reanimated v3 |
| TypeScript | Strict mode |

## Fonctionnalités

### Authentification JWT
- Login / Register avec validation
- Stockage sécurisé des tokens en SQLite
- Refresh automatique du token (intercepteur Axios)
- Déconnexion avec révocation du refresh token
- Indicateur de force du mot de passe

### Base de données SQLite locale
- Schéma versionné avec système de migrations
- Repositories typés (UserRepository, TaskRepository)
- Mode WAL pour les performances
- Clés étrangères avec CASCADE delete

### Synchronisation REST API
- Architecture offline-first : les mutations sont d'abord écrites localement
- Champ `sync_status` par tâche : `synced | pending_create | pending_update | pending_delete`
- Moteur de sync avec debounce (3s après chaque mutation)
- Re-sync automatique au retour réseau et au passage en foreground
- Résolution de conflits : server gagne sur les tâches synced

### Notifications push
- Enregistrement du token Expo Push
- Rappel automatique 1h avant l'échéance d'une tâche
- Résumé quotidien programmable (8h par défaut)
- Deep link depuis la notification vers la tâche

## Structure du projet

```
app/                   # Expo Router — écrans
├── (auth)/            # Login, Register
├── (tabs)/            # Dashboard, Tâches, Profil
│   └── task/[id].tsx  # Détail tâche
src/
├── api/               # Couche HTTP (client Axios + endpoints)
├── auth/              # Contexte et gestion JWT
├── db/                # SQLite : schema, migrations, repositories
├── notifications/     # Service push notifications
├── sync/              # Moteur de synchronisation offline-first
├── store/             # Zustand stores (auth, tasks)
├── components/        # UI components + common components
├── hooks/             # useSync, useNotifications
├── types/             # Types TypeScript centraux
└── utils/             # Helpers (dates, couleurs, ID)
scripts/
└── mock-server.js     # Serveur REST mock (Node.js, sans dépendances)
```

## Démarrage rapide

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer l'environnement
```bash
cp .env.example .env
# EXPO_PUBLIC_API_URL=http://localhost:3001/v1
```

### 3. Lancer le mock server (terminal 1)
```bash
npm run server
# → API disponible sur http://localhost:3001/v1
# → Compte demo : demo@taskflow.dev / Demo1234!
```

### 4. Lancer l'application (terminal 2)
```bash
npm start          # Expo Go (scan QR)
npm run android    # Émulateur Android
npm run ios        # Simulateur iOS
npm run web        # Navigateur
```

## Architecture offline-first

```
Action utilisateur
       ↓
  SQLite local  ←── sync_status = pending_create/update/delete
       ↓
  Store Zustand  ←── UI mise à jour immédiatement
       ↓
  SyncEngine (debounce 3s)
       ↓
  REST API  ──── markTaskSynced() ──→ sync_status = synced
```

Le moteur de sync est déclenché :
- Automatiquement 3s après chaque mutation
- Au retour réseau (NetInfo)
- Au passage en foreground (AppState), si dernière sync > 5min

## Mock API

Le serveur mock (`scripts/mock-server.js`) ne nécessite aucune dépendance npm.

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/v1/auth/login` | Connexion |
| POST | `/v1/auth/register` | Inscription |
| POST | `/v1/auth/refresh` | Refresh token |
| POST | `/v1/auth/logout` | Déconnexion |
| GET | `/v1/auth/me` | Profil utilisateur |
| GET | `/v1/tasks` | Liste des tâches |
| POST | `/v1/tasks` | Créer une tâche |
| PATCH | `/v1/tasks/:id` | Modifier une tâche |
| DELETE | `/v1/tasks/:id` | Supprimer une tâche |

## Build production

```bash
# EAS Build (iOS + Android)
npx eas build --platform all

# Preview local
npx expo export
```

---

Développé par **[ablayecodeur](https://github.com/ablayecodeur)**
