import { Pool } from "pg";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function createPool() {
  const pool = new Pool({
    host: requireEnv("SUPABASE_DB_HOST"),
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    user: requireEnv("SUPABASE_DB_USER"),
    password: requireEnv("SUPABASE_DB_PASSWORD"),
    database: requireEnv("SUPABASE_DB_NAME"),
    ssl: process.env.SUPABASE_DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  pool.on("error", (error) => {
    console.error(`Postgres pool error: ${error.message}`);
  });

  return pool;
}
