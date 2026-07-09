import { createPool } from "./db.js";

function getTargetSchema() {
  const schema = process.env.SUPABASE_DB_SCHEMA || "public";

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
    throw new Error(`Invalid SUPABASE_DB_SCHEMA: ${schema}`);
  }

  return schema;
}

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function tableName(schema, table) {
  return `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;
}

function buildChunkMetadata(chunk) {
  return {
    prepared_doc_id: chunk.prepared_doc_id,
    source_file_id: chunk.source_file_id,
    doc_type: chunk.doc_type,
    chunk_id: chunk.chunk_id,
    chunk_index: chunk.chunk_index,
    content_hash: chunk.content_hash,
    ...chunk.metadata,
  };
}

function normalizeNullable(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return value;
}

async function replaceKnowledgeChunks(pool, chunks) {
  const client = await pool.connect();
  const schema = getTargetSchema();
  const knowledgeRag = tableName(schema, "knowledge_rag");

  try {
    await client.query("BEGIN");

    const preparedDocIds = [...new Set(chunks.map((chunk) => chunk.prepared_doc_id).filter(Boolean))];

    for (const preparedDocId of preparedDocIds) {
      await client.query(
        `
          DELETE FROM ${knowledgeRag}
          WHERE metadata->>'prepared_doc_id' = $1
        `,
        [preparedDocId],
      );
    }

    for (const chunk of chunks) {
      await client.query(
        `
          INSERT INTO ${knowledgeRag} (
            tenant_id,
            content,
            embedding,
            metadata
          )
          VALUES ($1, $2, $3::vector, $4::jsonb)
        `,
        [
          chunk.tenant_id || "global",
          chunk.content,
          `[${chunk.embedding.join(",")}]`,
          JSON.stringify(buildChunkMetadata(chunk)),
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function upsertProductsLive(pool, rows) {
  if (!rows.length) {
    return;
  }

  const client = await pool.connect();
  const schema = getTargetSchema();
  const productsLive = tableName(schema, "products_live");

  try {
    await client.query("BEGIN");

    for (const row of rows) {
      await client.query(
        `
          INSERT INTO ${productsLive} (
            tenant_id,
            entity_id,
            entity_type,
            entity_name,
            sku,
            status,
            category,
            attributes_json,
            search_text,
            embedding,
            price,
            old_price,
            currency,
            stock_qty,
            delivery_note,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8::jsonb, $9, $10::vector, $11, $12, $13, $14, $15, NOW()
          )
          ON CONFLICT (tenant_id, entity_id, sku)
          DO UPDATE SET
            entity_type = EXCLUDED.entity_type,
            entity_name = EXCLUDED.entity_name,
            status = EXCLUDED.status,
            category = EXCLUDED.category,
            attributes_json = EXCLUDED.attributes_json,
            search_text = EXCLUDED.search_text,
            embedding = EXCLUDED.embedding,
            price = EXCLUDED.price,
            old_price = EXCLUDED.old_price,
            currency = EXCLUDED.currency,
            stock_qty = EXCLUDED.stock_qty,
            delivery_note = EXCLUDED.delivery_note,
            updated_at = NOW()
        `,
        [
          row.tenant_id || "global",
          row.entity_id,
          row.entity_type,
          row.entity_name,
          normalizeNullable(row.sku),
          normalizeNullable(row.status),
          normalizeNullable(row.category),
          JSON.stringify(row.attributes_json || {}),
          normalizeNullable(row.search_text),
          row.embedding ? `[${row.embedding.join(",")}]` : null,
          normalizeNullable(row.price),
          normalizeNullable(row.old_price),
          normalizeNullable(row.currency),
          normalizeNullable(row.stock_qty),
          normalizeNullable(row.delivery_note),
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function writeRuntimeResultToSupabase(result) {
  const pool = createPool();

  try {
    const chunks = Array.isArray(result?.docs_result?.chunks) ? result.docs_result.chunks : [];
    const rows = Array.isArray(result?.products_result?.rows) ? result.products_result.rows : [];

    if (chunks.length) {
      await replaceKnowledgeChunks(pool, chunks);
    }

    if (rows.length) {
      await upsertProductsLive(pool, rows);
    }

    return {
      knowledge_chunks_written: chunks.length,
      products_rows_written: rows.length,
    };
  } finally {
    await pool.end();
  }
}
