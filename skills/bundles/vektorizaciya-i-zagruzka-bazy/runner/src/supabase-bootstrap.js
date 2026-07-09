import fs from "fs/promises";
import path from "path";
import { createPool } from "./db.js";

function getTargetSchema() {
  const schema = process.env.SUPABASE_DB_SCHEMA || "public";

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
    throw new Error(`Invalid SUPABASE_DB_SCHEMA: ${schema}`);
  }

  return schema;
}

async function tableExists(pool, schemaName, tableName) {
  const result = await pool.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_name = $2
      ) AS exists
    `,
    [schemaName, tableName],
  );

  return Boolean(result.rows[0]?.exists);
}

export async function ensureBootstrapSchema(schemaFilePath, processedDir) {
  const pool = createPool();
  const schema = getTargetSchema();

  try {
    const hasKnowledgeRag = await tableExists(pool, schema, "knowledge_rag");
    const hasProductsLive = await tableExists(pool, schema, "products_live");

    if (hasKnowledgeRag && hasProductsLive) {
      return {
        applied: false,
        reason: `schema_already_present:${schema}`,
      };
    }

    if (schema !== "public") {
      throw new Error(
        `Target schema "${schema}" is missing knowledge_rag/products_live. Apply the target project SQL before ingestion.`,
      );
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
