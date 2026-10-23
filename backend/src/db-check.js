// Standalone check: does the .env load, and can we reach Postgres?
// Place in httpdocs/backend/src/db-check.js and run:  node src/db-check.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { Client } = require("pg");

console.log("---- ENV CHECK ----");
console.log("cwd        :", process.cwd());
console.log("node       :", process.version);
console.log("PORT       :", process.env.PORT);
console.log("DB_HOST    :", process.env.DB_HOST);
console.log("DB_PORT    :", process.env.DB_PORT);
console.log("DB_NAME    :", process.env.DB_NAME);
console.log("DB_USER    :", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD ? "(set, " + process.env.DB_PASSWORD.length + " chars)" : "(MISSING)");
console.log("JWT_SECRET :", process.env.JWT_SECRET ? "(set)" : "(MISSING)");

const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 8000,
});

console.log("---- DB CHECK ----");
console.log("Connecting to Postgres...");

client
    .connect()
    .then(() => {
        console.log("CONNECTED to Postgres OK");
        return client.query("select current_database() as db, current_user as usr, now() as time");
    })
    .then((r) => {
        console.log("Query OK:", r.rows[0]);
        return client.query("select table_name from information_schema.tables where table_schema='public' order by table_name");
    })
    .then((r) => {
        console.log("Tables in public schema (" + r.rows.length + "):", r.rows.map((x) => x.table_name).join(", ") || "(none)");
    })
    .catch((err) => {
        console.log("DB CONNECTION FAILED");
        console.log("  code   :", err.code);
        console.log("  message:", err.message);
    })
    .finally(() => client.end().catch(() => {}));