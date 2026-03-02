import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export async function connectMySQL() {
  const config = {
    host: process.env.MYSQL_HOST || "localhost",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "SMIC_pro",
    port: Number(process.env.MYSQL_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  } as mysql.PoolOptions;

  pool = mysql.createPool(config);
  // SMICple test
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
  console.log("MySQL connected");
}

export function getMySQLPool() {
  if (!pool) throw new Error("MySQL pool not initialized");
  return pool;
}
