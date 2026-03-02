import { Client } from "pg";

let client: Client | null = null;

export async function connectPostgres() {
  const config = {
    host: process.env.PGHOST || "localhost",
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    database: process.env.PGDATABASE || "SMIC_pro",
    port: Number(process.env.PGPORT || 5432),
  };

  client = new Client(config);
  await client.connect();
  console.log("Postgres connected");
}

export function getPgClient() {
  if (!client) throw new Error("Postgres client not initialized");
  return client;
}
