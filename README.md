# Expense Tracker — Monorepo (npm workspaces)

## Structure
```
expense-tracker/
├── package.json          ← racine, scripts globaux
├── packages/
│   ├── backend/          ← Node.js + Express + Prisma
│   └── frontend/         ← React + Vite
```

## Démarrage

```bash
# 1. Installer toutes les dépendances (une seule commande)
npm install

# 2. Configurer l'environnement
cp packages/backend/.env.example packages/backend/.env
# → éditer DATABASE_URL, JWT_SECRET

# 3. Créer la base et appliquer les migrations
createdb expense_db
npm run db:migrate
npm run db:seed

# 4. Lancer back + front ensemble
npm run dev
# 5. Lancer sur pm2
pm2 start npm --name "07008e10d084fa" -- run dev
# 6. Stoper sur pm2
pm2 stop 07008e10d084fa
pm2 delete 07008e10d084fa
```

## Commandes disponibles depuis la racine

| Commande            | Description                             |
|---------------------|-----------------------------------------|
| `npm run dev`       | Lance backend (3000) + frontend (5173)  |
| `npm run dev:back`  | Backend seul                            |
| `npm run dev:front` | Frontend seul                           |
| `npm run build`     | Build production du frontend            |
| `npm run db:migrate`| Applique les migrations Prisma          |
| `npm run db:generate`| Régénère le client Prisma              |
| `npm run db:seed`   | Insère les catégories par défaut        |
| `npm run db:studio` | Ouvre Prisma Studio (GUI base de données)|
| `npm run db:reset`  | Remet la base à zéro                    |

## Variables d'environnement — packages/backend/.env

```
PORT=9995
DATABASE_URL="postgresql://postgres:password@localhost:5432/expense_db?schema=public"
JWT_SECRET=un_secret_tres_long_minimum_32_caracteres
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```
