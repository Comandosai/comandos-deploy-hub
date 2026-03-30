import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { ensureBootstrapSchema } from "./supabase-bootstrap.js";
import { writeRuntimeResultToSupabase } from "./supabase-writer.js";

dotenv.config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function listPreparedDocs(preparedDir) {
  const entries = await fs.readdir(preparedDir, { withFileTypes: true });
  const docs = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.endsWith(".md") && !entry.name.endsWith(".txt")) {
      continue;
    }

    const fullPath = path.join(preparedDir, entry.name);
    const content = await fs.readFile(fullPath, "utf8");

    if (!content || content.trim() === "") {
      continue;
    }

    const preparedDocId = entry.name.replace(/\.[^.]+$/, "");
    const declaredType = inferDocType(entry.name);

    docs.push({
      source_file_id: preparedDocId,
      prepared_doc_id: preparedDocId,
      filename: entry.name,
      declared_type: declaredType,
      content,
      metadata: {
        source_path: fullPath,
      },
    });
  }

  return docs;
}

function chunkArray(items, size) {
  const batches = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

function inferDocType(fileName) {
  const lower = fileName.toLowerCase();

  if (lower.includes("faq")) return "faq";
  if (lower.includes("policy")) return "policy";
  if (lower.includes("script")) return "script";
  if (lower.includes("product_memory")) return "product_memory";
  if (lower.includes("product")) return "product";

  return "doc";
}

async function saveJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function run() {
  const apiUrl = requireEnv("SKILL_RUNTIME_API_URL");
  const licenseKey = requireEnv("SKILL_RUNTIME_LICENSE_KEY");
  const maxDocsPerRequest = Number(process.env.SKILL_RUNTIME_MAX_DOCS_PER_REQUEST || 10);
  const workspaceDir = path.resolve(process.env.WORKSPACE_DIR || "./workspace");
  const preparedDir = path.join(workspaceDir, process.env.PREPARED_DIR_NAME || "prepared");
  const processedDir = path.join(workspaceDir, process.env.PROCESSED_DIR_NAME || "processed");
  const stateDir = path.join(workspaceDir, process.env.STATE_DIR_NAME || "state");
  const batchesDir = path.join(processedDir, "batches");
  const schemaFilePath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "..",
    "..",
    "..",
    "CYBEROP_BOOTSTRAP_SCHEMA.sql",
  );

  await ensureDir(processedDir);
  await ensureDir(stateDir);
  await ensureDir(batchesDir);

  const bootstrapSummary = await ensureBootstrapSchema(schemaFilePath, processedDir);
  await saveJson(path.join(stateDir, "bootstrap_summary.json"), bootstrapSummary);

  const documents = await listPreparedDocs(preparedDir);

  if (documents.length === 0) {
    console.log("No prepared documents found.");
    return;
  }

  const batches = chunkArray(documents, Math.max(1, maxDocsPerRequest));
  const aggregatedResult = {
    ok: true,
    job_id: null,
    docs_result: {
      chunks: [],
    },
    products_result: {
      rows: [],
    },
  };

  for (const [batchIndex, batchDocuments] of batches.entries()) {
    const payload = {
      license_key: licenseKey,
      pipeline_version: "v1",
      mode: "docs",
      tenant_id: "global",
      documents: batchDocuments,
      live_rows: [],
    };

    await saveJson(
      path.join(batchesDir, `batch_${String(batchIndex + 1).padStart(3, "0")}_request.json`),
      payload,
    );

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-License-Key": licenseKey,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    await saveJson(
      path.join(batchesDir, `batch_${String(batchIndex + 1).padStart(3, "0")}_response.json`),
      result,
    );

    if (!response.ok || !result.ok) {
      console.error("Skill runtime request failed.");
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    aggregatedResult.job_id ||= result?.job_id || null;
    aggregatedResult.docs_result.chunks.push(...(result?.docs_result?.chunks || []));
    aggregatedResult.products_result.rows.push(...(result?.products_result?.rows || []));
  }

  await saveJson(path.join(processedDir, "last_request_payload.json"), {
    documents_sent: documents.length,
    batch_count: batches.length,
    max_docs_per_request: maxDocsPerRequest,
  });
  await saveJson(path.join(processedDir, "last_response.json"), aggregatedResult);

  const writeSummary = await writeRuntimeResultToSupabase(aggregatedResult);
  await saveJson(path.join(stateDir, "supabase_write_summary.json"), writeSummary);

  const summary = {
    processed_at: new Date().toISOString(),
    documents_sent: documents.length,
    batch_count: batches.length,
    max_docs_per_request: maxDocsPerRequest,
    chunks_received: aggregatedResult?.docs_result?.chunks?.length || 0,
    job_id: aggregatedResult?.job_id || null,
    knowledge_chunks_written: writeSummary.knowledge_chunks_written,
    products_rows_written: writeSummary.products_rows_written,
  };

  await saveJson(path.join(stateDir, "last_run_summary.json"), summary);

  console.log(
    `Processed ${summary.documents_sent} docs, received ${summary.chunks_received} chunks, wrote ${summary.knowledge_chunks_written} knowledge chunks.`,
  );
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
