# Index reconciliation and migrations

This project includes a small utility to reconcile MongoDB indexes when schema changes introduce incompatibilities (for example, creating compound indexes over array fields which MongoDB does not allow).

## reconcile-indexes.js

Location: `scripts/reconcile-indexes.js`

What it does:
- Connects to the database specified by `MONGODB_URI`.
- Lists all collections and their indexes.
- For each compound index (2+ key paths), it samples one document from the collection and checks if more than one indexed path resolves to an array value.
- If it detects more than one array in the index key, it logs a warning and attempts to drop the index.

Usage (dev or production):

```bash
# Make sure MONGODB_URI is set in the environment or .env
npm run reconcile-indexes
```

Notes and caveats:
- The script uses a single sample document per collection to infer whether a field is an array. If your data is heterogeneous, review the indexes it plans to drop before running in production.
- Always back up your database or ensure you have a migration/rollback plan before running index-altering scripts in production.
- Prefer explicit migrations for schema changes in production. This script is intended as a safe, conservative utility to fix common pitfalls during development and initial deployments.
