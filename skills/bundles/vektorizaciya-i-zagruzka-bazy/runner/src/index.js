import crypto from "crypto";
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

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function loadJson(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return fallbackValue;
    }
    throw error;
  }
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
      content_hash: sha256(content),
      content,
      metadata: {
        source_path: fullPath,
      },
    });
  }

  return docs;
}

async function resolvePreparedDocsDir(workspaceDir, preparedRoot, preparedDocsSubdir) {
  const candidates = [
    path.join(preparedRoot, preparedDocsSubdir),
    preparedRoot,
    path.join(workspaceDir, "docs"),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  await ensureDir(path.join(preparedRoot, preparedDocsSubdir));
  return path.join(preparedRoot, preparedDocsSubdir);
}

function parseTsvLine(line) {
  return line.split("\t");
}

function tryParseJson(value) {
  if (!value || typeof value !== "string") {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function escapeMarkdown(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll("\n", "<br>");
}

function buildCounts(rows, field) {
  const counts = new Map();

  for (const row of rows) {
    const key = String(row?.[field] || "unknown");
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function renderCountsMarkdown(items) {
  if (items.length === 0) {
    return "- Нет данных";
  }

  return items.map(([label, count]) => `- \`${escapeMarkdown(label)}\`: ${count}`).join("\n");
}

function renderProductsPreviewMarkdown(rows, headers, previewRows) {
  const entityTypeCounts = buildCounts(rows, "entity_type");
  const statusCounts = buildCounts(rows, "status");
  const generatedAt = new Date().toISOString();

  const safeHeaders = (headers && headers.length > 0 ? headers : Object.keys(previewRows?.[0] || {})).map((h) =>
    String(h ?? ""),
  );
  const headerLine = `| ${safeHeaders.map(escapeMarkdown).join(" | ")} |`;
  const separatorLine = `| ${safeHeaders.map(() => "---").join(" | ")} |`;
  const bodyLines = (previewRows || []).map((row) => {
    const values = safeHeaders.map((header) => {
      const value = row?.[header];
      if (typeof value === "object" && value !== null) {
        return escapeMarkdown(JSON.stringify(value));
      }
      return escapeMarkdown(value ?? "");
    });
    return `| ${values.join(" | ")} |`;
  });

  return [
    "# products_live readable preview",
    "",
    `Сгенерировано автоматически перед ingestion. Время: ${generatedAt}`,
    "",
    `Всего строк: **${rows.length}**`,
    "",
    "## Типы сущностей",
    renderCountsMarkdown(entityTypeCounts),
    "",
    "## Статусы",
    renderCountsMarkdown(statusCounts),
    "",
    "## Таблица",
    "",
    headerLine,
    separatorLine,
    ...bodyLines,
    "",
  ].join("\n");
}

async function writeProductsPreview(rows, headers, previewRows, targetPath) {
  if (!rows || rows.length === 0) {
    return null;
  }

  await ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, renderProductsPreviewMarkdown(rows, headers, previewRows), "utf8");
  return targetPath;
}

function buildProductRowKey(row) {
  return [(row.tenant_id || "global"), row.entity_id || "", row.sku || ""].join("::");
}

function buildProductRowHash(row) {
  return sha256(
    JSON.stringify({
      tenant_id: row.tenant_id || "global",
      entity_id: row.entity_id || null,
      entity_type: row.entity_type || null,
      entity_name: row.entity_name || null,
      sku: row.sku || null,
      status: row.status || null,
      category: row.category || null,
      attributes_json: row.attributes_json || {},
      search_text: row.search_text || null,
      price: row.price || null,
      old_price: row.old_price || null,
      currency: row.currency || null,
      stock_qty: row.stock_qty || null,
      delivery_note: row.delivery_note || null,
    }),
  );
}

async function loadPreparedLiveRows(workspaceDir, preparedRoot) {
  const candidates = [
    path.join(preparedRoot, "products_live.tsv"),
    path.join(preparedRoot, "products_live.csv"),
    path.join(workspaceDir, "products_live.tsv"),
    path.join(workspaceDir, "products_live.csv"),
  ];

  for (const candidate of candidates) {
    try {
      const content = await fs.readFile(candidate, "utf8");
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter((line) => line.trim() !== "");

      if (lines.length < 2) {
        return { rows: [], sourcePath: candidate };
      }

      const headers = parseTsvLine(lines[0]);
      const rows = [];
      const previewRows = [];

      for (const line of lines.slice(1)) {
        const values = parseTsvLine(line);
        const row = {};

        for (const [index, header] of headers.entries()) {
          row[header] = values[index] ?? "";
        }

        previewRows.push({ ...row });

        rows.push({
          tenant_id: row.tenant_id || "global",
          entity_id: row.entity_id,
          entity_type: row.entity_type,
          entity_name: row.entity_name,
          sku: row.sku,
          status: row.status,
          category: row.category,
          attributes_json: tryParseJson(row.attributes_json),
          search_text: row.search_text,
          price: row.price,
          old_price: row.old_price,
          currency: row.currency,
          stock_qty: row.stock_qty,
          delivery_note: row.delivery_note,
          updated_at: row.updated_at,
          row_hash: buildProductRowHash({
            tenant_id: row.tenant_id || "global",
            entity_id: row.entity_id,
            entity_type: row.entity_type,
            entity_name: row.entity_name,
            sku: row.sku,
            status: row.status,
            category: row.category,
            attributes_json: tryParseJson(row.attributes_json),
            search_text: row.search_text,
            price: row.price,
            old_price: row.old_price,
            currency: row.currency,
            stock_qty: row.stock_qty,
            delivery_note: row.delivery_note,
          }),
        });
      }

      return {
        rows: rows.filter((row) => row.entity_id && row.entity_name),
        headers,
        previewRows,
        sourcePath: candidate,
      };
    } catch (error) {
      if (error && error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }

  return { rows: [], headers: [], previewRows: [], sourcePath: null };
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

function buildDocumentsManifest(documents) {
  return Object.fromEntries(
    documents.map((doc) => [
      doc.prepared_doc_id,
      {
        content_hash: doc.content_hash,
        filename: doc.filename,
      },
    ]),
  );
}

function buildProductsManifest(rows) {
  return Object.fromEntries(
    rows.map((row) => [
      buildProductRowKey(row),
      {
        row_hash: row.row_hash,
        entity_id: row.entity_id,
        sku: row.sku || null,
      },
    ]),
  );
}

function selectChangedDocuments(documents, previousManifest) {
  const changed = [];
  let unchangedCount = 0;

  for (const doc of documents) {
    const previous = previousManifest?.[doc.prepared_doc_id];
    if (previous && previous.content_hash === doc.content_hash) {
      unchangedCount += 1;
      continue;
    }
    changed.push(doc);
  }

  return { changed, unchangedCount };
}

function selectChangedRows(rows, previousManifest) {
  const changed = [];
  let unchangedCount = 0;

  for (const row of rows) {
    const key = buildProductRowKey(row);
    const previous = previousManifest?.[key];
    if (previous && previous.row_hash === row.row_hash) {
      unchangedCount += 1;
      continue;
    }
    changed.push(row);
  }

  return { changed, unchangedCount };
}

async function saveJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function replaceFile(sourcePath, destinationPath) {
  await ensureDir(path.dirname(destinationPath));

  try {
    await fs.rm(destinationPath, { force: true });
  } catch {}

  await fs.rename(sourcePath, destinationPath);
}

async function cleanupPreparedQueue(preparedDir, preparedRoot) {
  const removed = [];
  const removableExtensions = new Set([".md", ".txt", ".tsv", ".csv", ".html"]);

  const candidateDirs = [...new Set([preparedDir, preparedRoot])];

  for (const dirPath of candidateDirs) {
    if (!(await pathExists(dirPath))) {
      continue;
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (!removableExtensions.has(ext)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      await fs.rm(fullPath, { force: true });
      removed.push(fullPath);
    }
  }

  return removed;
}

async function archiveProcessedInputs(
  documents,
  liveRowsSourcePath,
  liveRowsPreviewPath,
  vectorizedDocsDir,
  vectorizedRoot,
) {
  const moved = {
    documents: [],
    live_rows_file: null,
  };

  const sourcePaths = [...new Set(documents.map((doc) => doc?.metadata?.source_path).filter(Boolean))];

  for (const sourcePath of sourcePaths) {
    const destinationPath = path.join(vectorizedDocsDir, path.basename(sourcePath));
    await replaceFile(sourcePath, destinationPath);
    moved.documents.push(destinationPath);
  }

  if (liveRowsSourcePath) {
    const destinationPath = path.join(vectorizedRoot, path.basename(liveRowsSourcePath));
    await replaceFile(liveRowsSourcePath, destinationPath);
    moved.live_rows_file = destinationPath;
  }

  if (liveRowsPreviewPath) {
    const destinationPath = path.join(vectorizedRoot, path.basename(liveRowsPreviewPath));
    await replaceFile(liveRowsPreviewPath, destinationPath);
    moved.live_rows_preview_file = destinationPath;
  }

  return moved;
}

async function run() {
  const apiUrl = requireEnv("SKILL_RUNTIME_API_URL");
  const licenseKey = requireEnv("SKILL_RUNTIME_LICENSE_KEY");
  const maxDocsPerRequest = Number(process.env.SKILL_RUNTIME_MAX_DOCS_PER_REQUEST || 10);
  const workspaceDir = path.resolve(process.env.WORKSPACE_DIR || "./Base");
  const newFilesDir = path.join(workspaceDir, process.env.NEW_FILES_DIR_NAME || "new_files");
  const preparedRoot = path.join(workspaceDir, process.env.PREPARED_DIR_NAME || "prepared_docs");
  const preparedDocsSubdir = process.env.PREPARED_DOCS_DIR_NAME ?? "";
  const preparedDir = await resolvePreparedDocsDir(workspaceDir, preparedRoot, preparedDocsSubdir);
  const vectorizedRoot = path.join(workspaceDir, process.env.VECTORIZED_DIR_NAME || "vectorized_docs");
  const vectorizedDocsSubdir = process.env.VECTORIZED_DOCS_DIR_NAME ?? "";
  const vectorizedDocsDir = path.join(vectorizedRoot, vectorizedDocsSubdir);
  const processedDir = path.join(workspaceDir, process.env.PROCESSED_DIR_NAME || "processed");
  const stateDir = path.join(workspaceDir, process.env.STATE_DIR_NAME || "state");
  const batchesDir = path.join(processedDir, "batches");
  const documentsManifestPath = path.join(stateDir, "documents_manifest.json");
  const productsManifestPath = path.join(stateDir, "products_manifest.json");
  const schemaFilePath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "..",
    "..",
    "..",
    "CYBEROP_BOOTSTRAP_SCHEMA.sql",
  );

  await ensureDir(newFilesDir);
  await ensureDir(preparedRoot);
  await ensureDir(preparedDir);
  await ensureDir(vectorizedRoot);
  await ensureDir(vectorizedDocsDir);
  await ensureDir(processedDir);
  await ensureDir(stateDir);
  await ensureDir(batchesDir);

  const bootstrapSummary = await ensureBootstrapSchema(schemaFilePath, processedDir);
  await saveJson(path.join(stateDir, "bootstrap_summary.json"), bootstrapSummary);

  const documents = await listPreparedDocs(preparedDir);
  const {
    rows: liveRows,
    headers: liveRowsHeaders,
    previewRows: liveRowsPreviewRows,
    sourcePath: liveRowsSourcePath,
  } = await loadPreparedLiveRows(workspaceDir, preparedRoot);
  const liveRowsPreviewPath = liveRowsSourcePath
    ? path.join(path.dirname(liveRowsSourcePath), "products_live_readable.md")
    : path.join(preparedRoot, "products_live_readable.md");
  const previousDocumentsManifest = await loadJson(documentsManifestPath, {});
  const previousProductsManifest = await loadJson(productsManifestPath, {});
  const { changed: changedDocuments, unchangedCount: unchangedDocumentsCount } = selectChangedDocuments(
    documents,
    previousDocumentsManifest,
  );
  const { changed: changedLiveRows, unchangedCount: unchangedLiveRowsCount } = selectChangedRows(
    liveRows,
    previousProductsManifest,
  );

  if (documents.length === 0 && liveRows.length === 0) {
    console.log("No prepared documents or products_live rows found.");
    return;
  }

  const generatedPreviewPath = await writeProductsPreview(
    liveRows,
    liveRowsHeaders,
    liveRowsPreviewRows,
    liveRowsPreviewPath,
  );

  const batches = chunkArray(changedDocuments, Math.max(1, maxDocsPerRequest));
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

  if (changedLiveRows.length > 0) {
    const payload = {
      license_key: licenseKey,
      pipeline_version: "v1",
      mode: "products",
      tenant_id: "global",
      documents: [],
      live_rows: changedLiveRows,
    };

    await saveJson(path.join(batchesDir, "products_request.json"), payload);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-License-Key": licenseKey,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    await saveJson(path.join(batchesDir, "products_response.json"), result);

    if (!response.ok || !result.ok) {
      console.error("Skill runtime products request failed.");
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    aggregatedResult.job_id ||= result?.job_id || null;
    aggregatedResult.products_result.rows.push(...(result?.products_result?.rows || []));
  }

  await saveJson(path.join(processedDir, "last_request_payload.json"), {
    documents_total: documents.length,
    documents_sent: changedDocuments.length,
    documents_unchanged: unchangedDocumentsCount,
    batch_count: batches.length,
    max_docs_per_request: maxDocsPerRequest,
    live_rows_total: liveRows.length,
    live_rows_sent: changedLiveRows.length,
    live_rows_unchanged: unchangedLiveRowsCount,
  });
  await saveJson(path.join(processedDir, "last_response.json"), aggregatedResult);

  const writeSummary =
    aggregatedResult.docs_result.chunks.length || aggregatedResult.products_result.rows.length
      ? await writeRuntimeResultToSupabase(aggregatedResult)
      : {
          knowledge_chunks_written: 0,
          products_rows_written: 0,
        };
  await saveJson(path.join(stateDir, "supabase_write_summary.json"), writeSummary);

  const archiveSummary = await archiveProcessedInputs(
    documents,
    liveRowsSourcePath,
    generatedPreviewPath,
    vectorizedDocsDir,
    vectorizedRoot,
  );
  await saveJson(path.join(stateDir, "archive_summary.json"), archiveSummary);
  const cleanedPreparedFiles = await cleanupPreparedQueue(preparedDir, preparedRoot);
  await saveJson(path.join(stateDir, "prepared_cleanup_summary.json"), {
    removed_files: cleanedPreparedFiles,
  });
  await saveJson(documentsManifestPath, buildDocumentsManifest(documents));
  await saveJson(productsManifestPath, buildProductsManifest(liveRows));

  const summary = {
    processed_at: new Date().toISOString(),
    workspace_dir: workspaceDir,
    documents_total: documents.length,
    documents_sent: changedDocuments.length,
    documents_unchanged: unchangedDocumentsCount,
    live_rows_total: liveRows.length,
    live_rows_sent: changedLiveRows.length,
    live_rows_unchanged: unchangedLiveRowsCount,
    batch_count: batches.length,
    max_docs_per_request: maxDocsPerRequest,
    chunks_received: aggregatedResult?.docs_result?.chunks?.length || 0,
    job_id: aggregatedResult?.job_id || null,
    knowledge_chunks_written: writeSummary.knowledge_chunks_written,
    products_rows_written: writeSummary.products_rows_written,
    archived_documents: archiveSummary.documents.length,
    archived_live_rows_file: archiveSummary.live_rows_file,
    archived_live_rows_preview_file: archiveSummary.live_rows_preview_file || null,
    cleaned_prepared_files: cleanedPreparedFiles.length,
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
