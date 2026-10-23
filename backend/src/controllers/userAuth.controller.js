const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { query } = require("../config/db");
const { signToken } = require("../utils/jwt");
const { sendPasswordResetEmail } = require("../services/email");

// Never select password_hash with these columns; login adds it separately and
// strips it before the row is returned.
const USER_COLUMNS =
    "id, name, email, phone, country_code, premium, premium_start, premium_end, created_at";

// Base query excludes soft-deleted users
const ACTIVE_USER_WHERE = "WHERE deleted_at IS NULL";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Digits, optionally with spaces, dashes, parentheses or a leading +. Length is
// checked on the digits themselves so formatting does not change the rule.
const PHONE_FORMAT = /^\+?[0-9()\-\s]+$/;

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
    return String(value || "").trim();
}

function digitCount(value) {
    return value.replace(/\D/g, "").length;
}

// Registers an app account. Validates first so the client can point at the
// exact field, then relies on the unique email/phone constraints for the race
// where two requests use the same details at once.
async function register(req, res) {
    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);
    const phone = normalizePhone(req.body?.phone);
    const country_code = String(req.body?.country_code || "").trim();
    const password = String(req.body?.password || "");

    const errors = {};
    if (name.length < 2) {
        errors.name = "Please enter your name.";
    }
    if (!EMAIL_PATTERN.test(email)) {
        errors.email = "Please enter a valid email address.";
    }
    if (!PHONE_FORMAT.test(phone) || digitCount(phone) < 7 || digitCount(phone) > 15) {
        errors.phone = "Please enter a valid phone number.";
    }
    if (password.length < 6) {
        errors.password = "Password must be at least 6 characters.";
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            success: false,
            message: "Please correct the highlighted fields.",
            errors,
        });
    }

    try {
        const existing = await query(
            "SELECT email, phone FROM users WHERE (email = $1 OR phone = $2) AND deleted_at IS NULL LIMIT 1",
            [email, phone]
        );

        if (existing.rowCount > 0) {
            const row = existing.rows[0];
            const duplicateEmail =
                String(row.email || "").toLowerCase() === email;
            return res.status(409).json({
                success: false,
                message: duplicateEmail
                    ? "An account with this email already exists."
                    : "An account with this phone number already exists.",
                errors: duplicateEmail
                    ? { email: "This email is already registered." }
                    : { phone: "This phone number is already registered." },
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await query(
            `INSERT INTO users (name, email, phone, country_code, password_hash)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING ${USER_COLUMNS}`,
            [name, email, phone, country_code || null, passwordHash]
        );

        const user = result.rows[0];
        const token = signToken({ id: user.id, role: "user" });

        return res.status(201).json({
            success: true,
            message: "Registration successful.",
            token,
            user,
        });
    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "An account with these details already exists.",
            });
        }
        console.error("User register error:", err);
        return res.status(500).json({
            success: false,
            message: "Registration failed. Please try again later.",
        });
    }
}

// Logs an app account in. The response is intentionally identical for an
// unknown email and a wrong password so it does not reveal which emails exist.
async function login(req, res) {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    const errors = {};
    if (!EMAIL_PATTERN.test(email)) {
        errors.email = "Please enter a valid email address.";
    }
    if (!password) {
        errors.password = "Please enter your password.";
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            success: false,
            message: "Please enter your email and password.",
            errors,
        });
    }

    try {
        // First check if user exists (including deleted) to give specific error
        const deletedCheck = await query(
            `SELECT id, deleted_at, password_hash FROM users WHERE LOWER(email) = $1`,
            [email]
        );

        if (deletedCheck.rowCount === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const userRecord = deletedCheck.rows[0];

        if (userRecord.deleted_at) {
            return res.status(401).json({
                success: false,
                message: "Your account has been deleted. Please contact admin.",
            });
        }

        // Now get full user data for login
        const result = await query(
            `SELECT ${USER_COLUMNS}, password_hash
             FROM users
             WHERE LOWER(email) = $1 AND deleted_at IS NULL`,
            [email]
        );

        if (result.rowCount === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const user = result.rows[0];

        if (!user.password_hash) {
            return res.status(401).json({
                success: false,
                message:
                    "This account does not have a password yet. Please register.",
            });
        }

        const matches = await bcrypt.compare(password, user.password_hash);
        if (!matches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        delete user.password_hash;
        const token = signToken({ id: user.id, role: "user" });

        return res.json({
            success: true,
            message: "Login successful.",
            token,
            user,
        });
    } catch (err) {
        console.error("User login error:", err);
        return res.status(500).json({
            success: false,
            message: "Login failed. Please try again later.",
        });
    }
}

// Returns the signed-in account. The app calls this on launch to confirm a
// stored token is still valid before showing Home.
async function me(req, res) {
    try {
        const result = await query(
            `SELECT ${USER_COLUMNS} FROM users WHERE id = $1 AND deleted_at IS NULL`,
            [req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        return res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error("User me error:", err);
        return res.status(500).json({
            success: false,
            message: "Could not load your account.",
        });
    }
}

// Soft deletes the current user's account. Sets deleted_at timestamp.
// The account can no longer log in, but data is preserved for admin review.
async function deleteAccount(req, res) {
    try {
        const result = await query(
            `UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
            [req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Account not found or already deleted.",
            });
        }

        return res.json({
            success: true,
            message: "Account deleted successfully.",
        });
    } catch (err) {
        console.error("User delete account error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to delete account. Please try again later.",
        });
    }
}

// Updates the current user's profile (name, email, phone, country_code).
async function updateProfile(req, res) {
    const { name, email, phone, country_code } = req.body || {};

    const errors = {};
    if (!name || name.trim().length < 2) {
        errors.name = "Please enter your name.";
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = "Please enter a valid email address.";
    }
    if (phone && (!/^\+?[0-9()\-\s]+$/.test(phone.trim()) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15)) {
        errors.phone = "Please enter a valid phone number.";
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            success: false,
            message: "Please correct the highlighted fields.",
            errors,
        });
    }

    try {
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPhone = phone ? phone.trim() : null;
        const normalizedCountryCode = country_code ? country_code.trim() : null;

        // Check if email is already taken by another user
        const existing = await query(
            "SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2 AND deleted_at IS NULL LIMIT 1",
            [normalizedEmail, req.user.id]
        );

        if (existing.rowCount > 0) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists.",
                errors: { email: "This email is already registered." },
            });
        }

        const result = await query(
            `UPDATE users
             SET name = $1, email = $2, phone = $3, country_code = $4
             WHERE id = $5 AND deleted_at IS NULL
             RETURNING ${USER_COLUMNS}`,
            [name.trim(), normalizedEmail, normalizedPhone, normalizedCountryCode, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        return res.json({
            success: true,
            message: "Profile updated successfully.",
            user: result.rows[0],
        });
    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "An account with these details already exists.",
            });
        }
        console.error("User update profile error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to update profile. Please try again later.",
});
    }
}

// Requests a password reset email. Replies with an error when the address is
// not on an active account so the app can tell the user directly.
async function forgotPassword(req, res) {
    const email = normalizeEmail(req.body?.email);

    if (!EMAIL_PATTERN.test(email)) {
        return res.status(400).json({
            success: false,
            message: "Please enter a valid email address.",
        });
    }

    try {
        const result = await query(
            `SELECT id, name FROM users WHERE LOWER(email) = $1 AND deleted_at IS NULL`,
            [email]
        );

        // The mobile app asked to be told when the address is not registered,
        // so this endpoint no longer hides that fact behind a success reply.
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "No account is registered with this email address.",
            });
        }

        const user = result.rows[0];

        // Generate a secure random token
        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Store token hash in database (more secure)
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        await query(
            `UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3`,
            [tokenHash, expires, user.id]
        );

        // Send email
        const emailResult = await sendPasswordResetEmail(email, token, user.name);

        if (!emailResult.success) {
            console.error("Failed to send password reset email:", emailResult.error);
            // Still return success to user, but log the error
        }

        return res.json({
            success: true,
            message: "A password reset link has been sent to your email.",
        });
    } catch (err) {
        console.error("Forgot password error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to process request. Please try again later.",
        });
    }
}

// Resets the password using a valid token
async function resetPassword(req, res) {
    const { token, password } = req.body || {};

    if (!token || !password) {
        return res.status(400).json({
            success: false,
            message: "Token and new password are required.",
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: "Password must be at least 6 characters.",
        });
    }

    try {
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        const result = await query(
            `SELECT id, password_hash FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW() AND deleted_at IS NULL`,
            [tokenHash]
        );

        if (result.rowCount === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token.",
            });
        }

        const user = result.rows[0];

        // Check if new password is same as old password
        const matches = await bcrypt.compare(password, user.password_hash);
        if (matches) {
            return res.status(400).json({
                success: false,
                message: "New password must be different from your current password.",
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await query(
            `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2`,
            [passwordHash, user.id]
        );

        return res.json({
            success: true,
            message: "Password has been reset. You can now log in.",
        });
    } catch (err) {
        console.error("Reset password error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to reset password. Please try again later.",
        });
    }
}

// Changes the password for the authenticated user. Requires current password.
async function changePassword(req, res) {
    const { currentPassword, newPassword } = req.body || {};

    const errors = {};
    if (!currentPassword) {
        errors.currentPassword = 'Current password is required.';
    }
    if (!newPassword) {
        errors.newPassword = 'New password is required.';
    } else if (newPassword.length < 6) {
        errors.newPassword = 'Password must be at least 6 characters.';
    }
    if (currentPassword === newPassword) {
        errors.newPassword = 'New password must be different from your current password.';
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Please correct the highlighted fields.',
            errors,
        });
    }

    try {
        // Get user's current password hash
        const result = await query(
            `SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL`,
            [req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found.',
            });
        }

        const user = result.rows[0];

        if (!user.password_hash) {
            return res.status(400).json({
                success: false,
                message: 'This account does not have a password set.',
            });
        }

        // Verify current password
        const matches = await bcrypt.compare(currentPassword, user.password_hash);
        if (!matches) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect.',
                errors: { currentPassword: 'Current password is incorrect.' },
            });
        }

        // Check if new password is same as old (extra check)
        const sameAsOld = await bcrypt.compare(newPassword, user.password_hash);
        if (sameAsOld) {
            return res.status(400).json({
                success: false,
                message: 'New password must be different from your current password.',
                errors: { newPassword: 'New password must be different from your current password.' },
            });
        }

        // Update password
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await query(
            `UPDATE users SET password_hash = $1 WHERE id = $2`,
            [passwordHash, req.user.id]
        );

        return res.json({
            success: true,
            message: 'Password changed successfully.',
        });
    } catch (err) {
        console.error('Change password error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to change password. Please try again later.',
        });
    }
}

module.exports = { register, login, me, deleteAccount, updateProfile, forgotPassword, resetPassword, changePassword };
