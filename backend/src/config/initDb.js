const bcrypt = require("bcryptjs");
const { query } = require("./db");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@japam108.com";
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || "Admin";

async function initDb() {
    await query(`
        CREATE TABLE IF NOT EXISTS admins (
            id SERIAL PRIMARY KEY,
            username VARCHAR(80) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email VARCHAR(255),
            full_name VARCHAR(255),
            role VARCHAR(50) DEFAULT 'admin',
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            premium BOOLEAN DEFAULT false,
            premium_start TIMESTAMPTZ,
            premium_end TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_start TIMESTAMPTZ`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_end TIMESTAMPTZ`);
    // App accounts log in with email + password, so a hash and a phone number
    // are stored alongside the profile. Both are added separately and nullable
    // so this also applies to a database whose sample users predate accounts.
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
    // One account per phone number, while leaving the sample users (which have
    // no phone) repeatable.
    await query(
        `CREATE UNIQUE INDEX IF NOT EXISTS users_phone_key ON users (phone) WHERE phone IS NOT NULL`
    );

    // Soft delete: keep data for admin review, exclude from login/queries
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);

    // Country code for phone numbers (e.g., +91, +1, +44). Stored separately so
    // the phone column can hold just the national number.
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR(5)`);

    // Password reset token and expiry
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ`);

    // User-specific naams (custom mantras created by users)
    await query(`
        CREATE TABLE IF NOT EXISTS user_naams (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(160) NOT NULL,
            mantra TEXT DEFAULT '',
            bead_count INTEGER NOT NULL DEFAULT 108,
            daily_goal INTEGER DEFAULT 0,
            weekly_goal INTEGER DEFAULT 0,
            monthly_goal INTEGER DEFAULT 0,
            yearly_goal INTEGER DEFAULT 0,
            is_default BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    // Only one default per user
    await query(`
        CREATE UNIQUE INDEX IF NOT EXISTS user_naams_one_default_per_user
        ON user_naams (user_id) WHERE is_default = true
    `);

    // Bead counts per user, per mantra, per day. `source` says whether naam_id
    // points at an admin mantra (sacred_library) or one the user created
    // (user_naams), so the two id spaces never collide.
    await query(`
        CREATE TABLE IF NOT EXISTS user_naam_counts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            source VARCHAR(10) NOT NULL DEFAULT 'admin',
            naam_id INTEGER NOT NULL,
            date DATE NOT NULL,
            bead_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (user_id, source, naam_id, date)
        )
    `);

    await query(
        `CREATE INDEX IF NOT EXISTS user_naam_counts_user_date_idx ON user_naam_counts (user_id, date)`
    );

    // Meditation timer sessions, per user, per mantra, per day. The mantra is
    // recorded so the timer report can be filtered by mantra; rows that predate
    // this keep a NULL mantra and only ever count towards the all-mantras view.
    await query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            source VARCHAR(10),
            naam_id INTEGER,
            date DATE NOT NULL,
            duration_seconds INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await query(`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS source VARCHAR(10)`);
    await query(`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS naam_id INTEGER`);

    await query(
        `CREATE INDEX IF NOT EXISTS user_sessions_user_date_idx ON user_sessions (user_id, date)`
    );

    await query(
        `CREATE INDEX IF NOT EXISTS user_sessions_user_naam_date_idx ON user_sessions (user_id, source, naam_id, date)`
    );

    await query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
            id SERIAL PRIMARY KEY,
            package_name VARCHAR(120) NOT NULL,
            description TEXT DEFAULT '',
            duration VARCHAR(50) NOT NULL,
            platform VARCHAR(20) NOT NULL DEFAULT 'Both',
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS platform VARCHAR(20) NOT NULL DEFAULT 'Both'`);

    await query(`
        CREATE TABLE IF NOT EXISTS subscription_prices (
            id SERIAL PRIMARY KEY,
            subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
            country VARCHAR(100) NOT NULL,
            currency VARCHAR(10) NOT NULL,
            price NUMERIC(12, 2) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS helps (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    // A page can carry a slug so the web routes /privacy and /terms can find it
    // by name instead of by the title, which the admin is free to change.
    await query(`ALTER TABLE helps ADD COLUMN IF NOT EXISTS slug VARCHAR(80)`);
    // Unique so two pages cannot claim the same address, and so a lookup by
    // slug has exactly one match. NULLs stay allowed and stay repeatable: most
    // help pages are not addressable pages.
    await query(
        `CREATE UNIQUE INDEX IF NOT EXISTS helps_slug_key ON helps (slug) WHERE slug IS NOT NULL`
    );

    // Created before sacred_library because that table references it.
    await query(`
        CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(120) NOT NULL UNIQUE,
            description TEXT DEFAULT '',
            icon VARCHAR(60) DEFAULT '',
            image_url TEXT DEFAULT '',
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'`);
    await query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''`);
    await query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon VARCHAR(60) DEFAULT ''`);
    await query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT ''`);

    // Subcategories group Sacred Library content within one category, so the app
    // can offer a second level (Category -> Subcategory -> Content). They mirror
    // a category's shape, including its own image, icon and active/inactive
    // status.
    await query(`
        CREATE TABLE IF NOT EXISTS subcategories (
            id SERIAL PRIMARY KEY,
            category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
            name VARCHAR(120) NOT NULL,
            description TEXT DEFAULT '',
            icon VARCHAR(60) DEFAULT '',
            image_url TEXT DEFAULT '',
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (category_id, name)
        )
    `);

    await query(
        `CREATE INDEX IF NOT EXISTS subcategories_category_idx ON subcategories (category_id)`
    );

    await query(`
        CREATE TABLE IF NOT EXISTS sacred_library (
            id SERIAL PRIMARY KEY,
            title VARCHAR(160) NOT NULL UNIQUE,
            category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
            deity TEXT DEFAULT '',
            short_description TEXT DEFAULT '',
            content TEXT DEFAULT '',
            meaning TEXT DEFAULT '',
            source TEXT DEFAULT '',
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            bead_count INTEGER NOT NULL DEFAULT 108,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await query(`ALTER TABLE sacred_library ADD COLUMN IF NOT EXISTS meaning TEXT DEFAULT ''`);
    await query(`ALTER TABLE sacred_library ADD COLUMN IF NOT EXISTS deity TEXT DEFAULT ''`);
    await query(`ALTER TABLE sacred_library ADD COLUMN IF NOT EXISTS short_description TEXT DEFAULT ''`);
    await query(`ALTER TABLE sacred_library ADD COLUMN IF NOT EXISTS content TEXT DEFAULT ''`);
    await query(`ALTER TABLE sacred_library ADD COLUMN IF NOT EXISTS source TEXT DEFAULT ''`);
    await query(`ALTER TABLE sacred_library ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft'`);

    // Beads in one round of japa for this content. The mobile app reads it to
    // size the counter, so the default matches the mala it already assumes.
    await query(`ALTER TABLE sacred_library ADD COLUMN IF NOT EXISTS bead_count INTEGER NOT NULL DEFAULT 108`);

    // Only one content can be the default for mobile app home screen
    await query(`ALTER TABLE sacred_library ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false`);

    // Added separately, and nullable, so this also applies to a database that
    // already holds content written before categories existed. Those rows have
    // no category to backfill, so the controllers require the field on create
    // and update rather than the column doing it.
    await query(
        `ALTER TABLE sacred_library
         ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT`
    );

    // Optional second level of grouping within a category. Nullable so content
    // that predates subcategories, and content the admin chooses not to file
    // under one, still works. Deleting a subcategory that content still points
    // at is refused (RESTRICT), matching how a category is protected.
    await query(
        `ALTER TABLE sacred_library
         ADD COLUMN IF NOT EXISTS subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE RESTRICT`
    );

    await query(`
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
            app_name VARCHAR(120) NOT NULL DEFAULT 'Japam108',
            playstore_link TEXT DEFAULT '',
            app_store_link TEXT DEFAULT '',
            razorpay_live_key TEXT DEFAULT '',
            razorpay_live_secret TEXT DEFAULT '',
            razorpay_test_key TEXT DEFAULT '',
            razorpay_test_secret TEXT DEFAULT '',
            razorpay_mode TEXT DEFAULT 'test',
            admob_android_key TEXT DEFAULT '',
            admob_ios_key TEXT DEFAULT '',
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS razorpay_live_key TEXT DEFAULT ''`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS razorpay_live_secret TEXT DEFAULT ''`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS razorpay_test_key TEXT DEFAULT ''`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS razorpay_test_secret TEXT DEFAULT ''`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS razorpay_mode TEXT DEFAULT 'test'`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS admob_android_key TEXT DEFAULT ''`);
    await query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS admob_ios_key TEXT DEFAULT ''`);

    const existingSettings = await query("SELECT id FROM settings WHERE id = 1");
    if (existingSettings.rowCount === 0) {
        await query(
            `INSERT INTO settings (id, app_name, playstore_link, app_store_link)
             VALUES (1, $1, $2, $3)`,
            [
                "Japam108",
                "https://play.google.com/store/apps/details?id=your.package.name",
                "https://apps.apple.com/app/id0000000000",
            ]
        );
    }

    const existing = await query("SELECT id FROM admins LIMIT 1");
    if (existing.rowCount > 0) {
        await seedUsers();
        await backfillPremiumDates();
        console.log("Database ready: admins table found (not seeding).");
        return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await query(
        `INSERT INTO admins (username, password_hash, email, full_name, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [ADMIN_USERNAME, passwordHash, ADMIN_EMAIL, ADMIN_FULL_NAME, "admin"]
    );
    await seedUsers();
    await backfillPremiumDates();

    console.log(`Database ready: seeded admin user "${ADMIN_USERNAME}".`);
}

async function seedUsers() {
    const existing = await query("SELECT id FROM users LIMIT 1");
    if (existing.rowCount > 0) {
        console.log("Users table found (not seeding).");
        return;
    }

    const sampleUsers = [
        ["Dhileepan", "dhileepan@example.com", true],
        ["Priya", "priya@example.com", true],
        ["Arun", "arun@example.com", false],
        ["Kavya", "kavya@example.com", false],
        ["Ravi", "ravi@example.com", true],
        ["Meena", "meena@example.com", false],
    ];

    for (const [name, email, premium] of sampleUsers) {
        await query(
            `INSERT INTO users (name, email, premium) VALUES ($1, $2, $3)`,
            [name, email, premium]
        );
    }

    console.log(`Seeded ${sampleUsers.length} sample users.`);
}

async function backfillPremiumDates() {
    const result = await query(
        `UPDATE users
         SET premium_start = COALESCE(premium_start, created_at),
             premium_end = COALESCE(premium_end, created_at + INTERVAL '1 year')
         WHERE premium = true AND (premium_start IS NULL OR premium_end IS NULL)`
    );

    if (result.rowCount > 0) {
        console.log(`Backfilled premium dates for ${result.rowCount} user(s).`);
    }
}

module.exports = initDb;