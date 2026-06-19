import EmbeddedPostgres from "embedded-postgres";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "pg");
const DB_NAME = "legal_erp";
const DB_USER = "njd_legal";
const DB_PASSWORD = "njd_legal_dev";
const DB_PORT = 5432;

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });

  const pgVersionFile = path.join(DATA_DIR, "PG_VERSION");
  if (!fs.existsSync(pgVersionFile)) {
    console.log("Initializing embedded PostgreSQL...");
    await pg.initialise();
  } else {
    console.log("Using existing PostgreSQL data directory...");
  }

  console.log("Starting PostgreSQL on port", DB_PORT);
  await pg.start();

  try {
    await pg.createDatabase(DB_NAME);
    console.log(`Created database: ${DB_NAME}`);
  } catch {
    console.log(`Database ${DB_NAME} already exists`);
  }

  console.log("\nPostgreSQL is ready!");
  console.log(
    `DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}`
  );
  console.log("\nPress Ctrl+C to stop the database.\n");

  process.on("SIGINT", async () => {
    console.log("\nStopping PostgreSQL...");
    await pg.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await pg.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start database:", err);
  process.exit(1);
});
