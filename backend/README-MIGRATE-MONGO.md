Migration to MongoDB
====================

This repository ships with a file-based JSON DB at `src/data/db.json`.
The included migration script `migrate-json-to-mongo.js` copies collections into MongoDB.

Steps:

1. Install mongoose

```powershell
cd backend
npm install mongoose
```

2. Set your Mongo URI (local or Atlas)

```powershell
$env:MONGO_URI = 'mongodb://127.0.0.1:27017/foodreservation'
```

3. Run migration

```powershell
node migrate-json-to-mongo.js
```

4. Start server (it will use Mongo when MONGO_URI is set)

```powershell
node -r dotenv/config src/index.js
```

Notes:
- The migration script empties collections and inserts documents from `db.json`.
- Backup `db.json` before running the migration.
