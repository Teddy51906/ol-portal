/* One-time migration: loads the sample data from frontend/assets/data.js
   (browser globals, so it runs in a vm sandbox) and batch-writes every
   record into the ol-portal DynamoDB table.
   Usage: node scripts/seed.mjs [--dry-run] */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

const TABLE = "ol-portal";
const DRY_RUN = process.argv.includes("--dry-run");

const here = dirname(fileURLToPath(import.meta.url));
const dataSrc = readFileSync(join(here, "../../frontend/assets/data.js"), "utf8");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(
  dataSrc + "\n;__data = { LABS, PEOPLE, DEALS, PROPOSALS, INVOICES, BENCH };",
  sandbox
);

const { LABS, PEOPLE, DEALS, PROPOSALS, INVOICES, BENCH } = sandbox.__data;
const benchByKey = Object.fromEntries(BENCH.map(b => [b.key, b]));

const items = [
  ...Object.entries(LABS).map(([key, lab]) => ({ pk: "LAB", sk: key, ...lab })),
  ...Object.entries(PEOPLE).map(([key, p]) => ({
    pk: "PERSON", sk: key, ...p, ...(benchByKey[key] ? { bench: benchByKey[key] } : {})
  })),
  ...DEALS.map(d => ({ pk: "DEAL", sk: d.id, ...d })),
  ...PROPOSALS.map(p => ({ pk: "PROPOSAL", sk: p.id, ...p })),
  ...INVOICES.map(i => ({ pk: "INVOICE", sk: i.id, ...i }))
];

console.log(`Prepared ${items.length} items:`,
  Object.entries(items.reduce((m, i) => (m[i.pk] = (m[i.pk] || 0) + 1, m), {})));

if (DRY_RUN) process.exit(0);

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true }
});

for (let i = 0; i < items.length; i += 25) {
  const batch = items.slice(i, i + 25);
  const res = await doc.send(new BatchWriteCommand({
    RequestItems: { [TABLE]: batch.map(Item => ({ PutRequest: { Item } })) }
  }));
  const unprocessed = res.UnprocessedItems?.[TABLE]?.length || 0;
  if (unprocessed > 0) throw new Error(`${unprocessed} items unprocessed in batch at ${i}`);
  console.log(`Wrote items ${i + 1}–${i + batch.length}`);
}
console.log("Seed complete.");
