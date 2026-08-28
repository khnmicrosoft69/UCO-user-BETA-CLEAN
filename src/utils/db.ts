import postgres from 'postgres';

const databaseUrl = import.meta.env.DATABASE_URL || process.env.DATABASE_URL;

const globalForPostgres = globalThis as unknown as {
  sql: ReturnType<typeof postgres> | undefined;
};

let sql: ReturnType<typeof postgres>;

if (databaseUrl) {
  if (!globalForPostgres.sql) {
    globalForPostgres.sql = postgres(databaseUrl, {
      ssl: 'require',
      prepare: false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      connection: {
        statement_timeout: 30000,
      },
    });
  }
  sql = globalForPostgres.sql;
} else {
  // Provide a dummy sql function that throws when called, rather than crashing the module load
  sql = Object.assign(
    (() => { throw new Error('DATABASE_URL environment variable is missing in Vercel.'); }) as any,
    { unsafe: (() => '') as any }
  ) as ReturnType<typeof postgres>;
}

export default sql;
