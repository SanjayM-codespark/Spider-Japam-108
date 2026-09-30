const { Pool } = require("pg");

require("dotenv").config();

const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "naam_jap",
});

async function query(text, params) {
    const result = await pool.query(text, params);
    return result;
}

module.exports = { pool, query };