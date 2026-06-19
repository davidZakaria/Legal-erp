import { execSync } from "child_process";

console.log("Running Prisma migrations...");
execSync("npx prisma migrate dev --name init", {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
});

console.log("Seeding database...");
execSync("npx prisma db seed", {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
});

console.log("Database setup complete!");
