import postgres from 'postgres';

const databaseUrl = import.meta.env.DATABASE_URL;

let sql: ReturnType<typeof postgres>;

if (databaseUrl) {
  sql = postgres(databaseUrl, {
    ssl: 'require',
    prepare: false 
  });
} else {
  // Provide a dummy sql function that throws when called, rather than crashing the module load
  sql = Object.assign(
    (() => { throw new Error('DATABASE_URL environment variable is missing in Vercel.'); }) as any,
    { unsafe: (() => '') as any }
  ) as ReturnType<typeof postgres>;
}

export default sql;
