import postgres from "postgres";

const databaseUrl = process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

declare global {
  var __aiMapSql: postgres.Sql | undefined;
}

export const sql =
  globalThis.__aiMapSql ??
  postgres(databaseUrl, {
    max: Number(process.env["DATABASE_POOL_SIZE"] ?? "5"),
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env["NODE_ENV"] !== "production") {
  globalThis.__aiMapSql = sql;
}

export async function deleteExpiredResponses() {
  await sql`delete from survey_responses where created_at < now() - interval '30 days'`;
}
