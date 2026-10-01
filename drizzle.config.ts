// Plain config object (no `drizzle-kit` import) so `drizzle-kit generate` can load this
// file even before project dependencies are installed.
export default {
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: 'netlify/database/migrations',
};
