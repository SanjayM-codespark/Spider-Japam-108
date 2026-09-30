const { query } = require("../config/db");

const VALID_DURATIONS = ["Monthly", "3 Months", "6 Months", "One Year"];
const VALID_PLATFORMS = ["Android", "iOS", "Both"];

async function createSubscription(req, res) {
    const { package_name, description, duration, platform, prices } = req.body || {};

    if (!package_name || !duration) {
        return res.status(400).json({
            success: false,
            message: "Package name and duration are required.",
        });
    }

    if (!VALID_DURATIONS.includes(duration)) {
        return res.status(400).json({
            success: false,
            message: "Invalid duration.",
        });
    }

    const selectedPlatform = platform || "Both";
    if (!VALID_PLATFORMS.includes(selectedPlatform)) {
        return res.status(400).json({
            success: false,
            message: "Invalid platform.",
        });
    }

    const validPrices = Array.isArray(prices) ? prices : [];
    if (validPrices.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Add at least one country price.",
        });
    }

    const client = await require("../config/db").pool.connect();

    try {
        await client.query("BEGIN");

        const subResult = await client.query(
            `INSERT INTO subscriptions (package_name, description, duration, platform)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [package_name, description || "", duration, selectedPlatform]
        );
        const subscriptionId = subResult.rows[0].id;

        for (const item of validPrices) {
            await client.query(
                `INSERT INTO subscription_prices (subscription_id, country, currency, price)
                 VALUES ($1, $2, $3, $4)`,
                [subscriptionId, item.country, item.currency, item.price]
            );
        }

        await client.query("COMMIT");

        return res.status(201).json({
            success: true,
            message: "Subscription added.",
            id: subscriptionId,
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Create subscription error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to add subscription.",
        });
    } finally {
        client.release();
    }
}

async function listSubscriptions(req, res) {
    try {
        const subsResult = await query(
            "SELECT id, package_name, description, duration, platform, created_at FROM subscriptions ORDER BY id DESC"
        );
        const pricesResult = await query(
            "SELECT id, subscription_id, country, currency, price FROM subscription_prices ORDER BY id"
        );

        const pricesBySub = {};
        for (const row of pricesResult.rows) {
            if (!pricesBySub[row.subscription_id]) {
                pricesBySub[row.subscription_id] = [];
            }
            pricesBySub[row.subscription_id].push({
                id: row.id,
                country: row.country,
                currency: row.currency,
                price: row.price,
            });
        }

        const subscriptions = subsResult.rows.map((row) => ({
            ...row,
            prices: pricesBySub[row.id] || [],
        }));

        return res.json({
            success: true,
            count: subscriptions.length,
            subscriptions,
        });
    } catch (err) {
        console.error("List subscriptions error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch subscriptions.",
        });
    }
}

async function getSubscription(req, res) {
    const { id } = req.params;

    try {
        const subResult = await query(
            "SELECT id, package_name, description, duration, platform, created_at FROM subscriptions WHERE id = $1",
            [id]
        );

        if (subResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Subscription not found.",
            });
        }

        const pricesResult = await query(
            "SELECT id, country, currency, price FROM subscription_prices WHERE subscription_id = $1 ORDER BY id",
            [id]
        );

        return res.json({
            success: true,
            subscription: {
                ...subResult.rows[0],
                prices: pricesResult.rows,
            },
        });
    } catch (err) {
        console.error("Get subscription error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch subscription.",
        });
    }
}

async function updateSubscription(req, res) {
    const { id } = req.params;
    const { package_name, description, duration, platform, prices } = req.body || {};

    if (!package_name || !duration) {
        return res.status(400).json({
            success: false,
            message: "Package name and duration are required.",
        });
    }

    if (!VALID_DURATIONS.includes(duration)) {
        return res.status(400).json({
            success: false,
            message: "Invalid duration.",
        });
    }

    const selectedPlatform = platform || "Both";
    if (!VALID_PLATFORMS.includes(selectedPlatform)) {
        return res.status(400).json({
            success: false,
            message: "Invalid platform.",
        });
    }

    const validPrices = Array.isArray(prices) ? prices : [];
    if (validPrices.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Add at least one country price.",
        });
    }

    const client = await require("../config/db").pool.connect();

    try {
        await client.query("BEGIN");

        const exists = await client.query(
            "SELECT id FROM subscriptions WHERE id = $1",
            [id]
        );
        if (exists.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "Subscription not found.",
            });
        }

        await client.query(
            `UPDATE subscriptions SET package_name = $1, description = $2, duration = $3, platform = $4 WHERE id = $5`,
            [package_name, description || "", duration, selectedPlatform, id]
        );

        await client.query(
            "DELETE FROM subscription_prices WHERE subscription_id = $1",
            [id]
        );

        for (const item of validPrices) {
            await client.query(
                `INSERT INTO subscription_prices (subscription_id, country, currency, price)
                 VALUES ($1, $2, $3, $4)`,
                [id, item.country, item.currency, item.price]
            );
        }

        await client.query("COMMIT");

        return res.json({
            success: true,
            message: "Subscription updated.",
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Update subscription error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to update subscription.",
        });
    } finally {
        client.release();
    }
}

async function deleteSubscription(req, res) {
    const { id } = req.params;

    try {
        const result = await query(
            "DELETE FROM subscriptions WHERE id = $1 RETURNING id",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Subscription not found.",
            });
        }

        return res.json({
            success: true,
            message: "Subscription deleted.",
        });
    } catch (err) {
        console.error("Delete subscription error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to delete subscription.",
        });
    }
}

module.exports = {
    createSubscription,
    listSubscriptions,
    getSubscription,
    updateSubscription,
    deleteSubscription,
};