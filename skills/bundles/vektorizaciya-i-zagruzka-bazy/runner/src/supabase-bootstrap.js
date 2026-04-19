import fs from "fs/promises";
import path from "path";
import { createPool } from "./db.js";

async function tableExists(pool, tableName) {
  const result = await pool.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = $1
      ) AS exists
    `,
    [tableName],
  );

  return Boolean(result.rows[0]?.exists);
}

export async function ensureBootstrapSchema(schemaFilePath, processedDir) {
  const pool = createPool();

  try {
    const hasKnowledgeRag = await tableExists(pool, "knowledge_rag");
    const hasProductsLive = await tableExists(pool, "products_live");

    if (hasKnowledgeRag && hasProductsLive) {
      return {
        applied: false,
        reason: "schema_already_present",
      };
    }

    const sql = await fs.readFile(schemaFilePath, "utf8");
    await pool.query(sql);

    await fs.writeFile(
      path.join(processedDir, "bootstrap_schema_applied.txt"),
      `Applied at ${new Date().toISOString()}\nSource: ${schemaFilePath}\n`,
      "utf8",
    );

    return {
      applied: true,
      reason: "schema_applied",
      schemaPath: schemaFilePath,
    };
  } finally {
    await pool.end();
  }
}
