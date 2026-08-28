// OFFLINE-MODE FEATURE
// Local MySQL/MariaDB connection used as an offline fallback for local dev.
// Delete this file (and src/utils/dataSource.ts) to remove the feature entirely.

import mysql from 'mysql2/promise';

const globalForMysql = globalThis as unknown as {
  mysqlPool: mysql.Pool | undefined;
};

function createPool() {
  return mysql.createPool({
    host: import.meta.env.DB_HOST || process.env.DB_HOST || 'localhost',
    port: Number(import.meta.env.DB_PORT || process.env.DB_PORT || 3306),
    user: import.meta.env.DB_USER || process.env.DB_USER || 'root',
    password: import.meta.env.DB_PASSWORD || process.env.DB_PASSWORD || '',
    database: import.meta.env.DB_NAME || process.env.DB_NAME || 'uco_admin_sys_astro',
    timezone: 'Z',
    waitForConnections: true,
    connectionLimit: 10,
  });
}

if (!globalForMysql.mysqlPool) {
  globalForMysql.mysqlPool = createPool();
}

const pool = globalForMysql.mysqlPool;

/** Run a parameterized MySQL query. Params use `?` placeholders. */
export async function mysqlQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.execute(query, params);
  return rows as T[];
}

/** Run a parameterized MySQL statement that isn't a SELECT (INSERT/UPDATE/DELETE). */
export async function mysqlExec(query: string, params: any[] = []) {
  const [result] = await pool.execute(query, params);
  return result as mysql.ResultSetHeader;
}

export default pool;
