Dev scripts

- Populate a developer-friendly sample `db.json`:

  cd backend
  npm run dev-seed

- The script overwrites `server/src/data/db.json` with a small sample dataset (menu, one reservation, one topup, users). Use only for development.

- To run the server after seeding:

  npm start

- To run the production seed (creates admin user if missing):

  npm run seed
