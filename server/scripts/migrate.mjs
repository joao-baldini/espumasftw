import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED is required for migrations");
const sql = await readFile(fileURLToPath(new URL("../migrations/001_initial.sql", import.meta.url)), "utf8");
const client = new pg.Client({ connectionString });
try {
  await client.connect();
  await client.query(sql);
  console.log("Espumas schema ready");
} finally {
  await client.end();
}
