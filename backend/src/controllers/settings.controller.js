const { query } = require("../config/db");

async function getSettings(req, res) {
    try {
        const result = await query(
            `SELECT app_name, playstore_link, app_store_link,
                    razorpay_live_key, razorpay_live_secret,
                    razorpay_test_key, razorpay_test_secret,
                    razorpay_mode,
                    admob_android_key, admob_ios_key,
                    updated_at
             FROM settings WHERE id = 1`
        );
        const row = result.rows[0] || {};

        return res.json({
            success: true,
            settings: {
                app_name: row.app_name || "Japam108",
                playstore_link: row.playstore_link || "",
                app_store_link: row.app_store_link || "",
                updated_at: row.updated_at || null,
                razorpay: {
                    mode: ["live", "test"].includes(row.razorpay_mode) ? row.razorpay_mode : "test",
                    live: {
                        key: row.razorpay_live_key || "",
                        secret: row.razorpay_live_secret || "",
                    },
                    test: {
                        key: row.razorpay_test_key || "",
                        secret: row.razorpay_test_secret || "",
                    },
                },
                admob: {
                    android: row.admob_android_key || "",
                    ios: row.admob_ios_key || "",
                },
            },
        });
    } catch (err) {
        console.error("Get settings error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch settings.",
        });
    }
}

async function updateSettings(req, res) {
    const body = req.body || {};

    try {
        const current = await query("SELECT * FROM settings WHERE id = 1");
        const row = current.rows[0] || {};

        const app_name = body.app_name ?? row.app_name ?? "Japam108";
        if (!app_name || !app_name.trim()) {
            return res.status(400).json({
                success: false,
                message: "App name is required.",
            });
        }

        const playstore_link = body.playstore_link ?? row.playstore_link ?? "";
        const app_store_link = body.app_store_link ?? row.app_store_link ?? "";
        const razorpay_live_key = body.razorpay_live_key ?? row.razorpay_live_key ?? "";
        const razorpay_live_secret = body.razorpay_live_secret ?? row.razorpay_live_secret ?? "";
        const razorpay_test_key = body.razorpay_test_key ?? row.razorpay_test_key ?? "";
        const razorpay_test_secret = body.razorpay_test_secret ?? row.razorpay_test_secret ?? "";
        const razorpay_mode =
            body.razorpay_mode && ["live", "test"].includes(body.razorpay_mode)
                ? body.razorpay_mode
                : ["live", "test"].includes(row.razorpay_mode)
                    ? row.razorpay_mode
                    : "test";
        const admob_android_key = body.admob_android_key ?? row.admob_android_key ?? "";
        const admob_ios_key = body.admob_ios_key ?? row.admob_ios_key ?? "";

        await query(
            `UPDATE settings
             SET app_name = $1, playstore_link = $2, app_store_link = $3,
                 razorpay_live_key = $4, razorpay_live_secret = $5,
                 razorpay_test_key = $6, razorpay_test_secret = $7,
                 razorpay_mode = $8,
                 admob_android_key = $9, admob_ios_key = $10,
                 updated_at = NOW()
             WHERE id = 1`,
            [
                app_name.trim(),
                (playstore_link || "").trim(),
                (app_store_link || "").trim(),
                (razorpay_live_key || "").trim(),
                (razorpay_live_secret || "").trim(),
                (razorpay_test_key || "").trim(),
                (razorpay_test_secret || "").trim(),
                razorpay_mode,
                (admob_android_key || "").trim(),
                (admob_ios_key || "").trim(),
            ]
        );

        return res.json({
            success: true,
            message: "Settings updated.",
        });
    } catch (err) {
        console.error("Update settings error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to update settings.",
        });
    }
}

module.exports = { getSettings, updateSettings };