import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  const result = await sql`
    delete from survey_responses
    where created_at < now() - interval '30 days'
    returning id
  `;
  console.log(`Deleted ${result.length} expired response(s).`);
} finally {
  await sql.end();
}
