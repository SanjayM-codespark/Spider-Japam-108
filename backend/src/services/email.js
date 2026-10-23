const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM;
const BASE_PATH = process.env.BASE_PATH || "/";
const APP_URL = process.env.APP_URL || `http://localhost:5173${BASE_PATH}`.replace(/\/+$/, "");

let transporter = null;

function getTransporter() {
    if (!transporter && SMTP_HOST && SMTP_USER && SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });
    }
    return transporter;
}

/**
 * Sends an email using the configured SMTP transport.
 * Returns { success: boolean, error?: string }.
 */
async function sendEmail({ to, subject, html, text }) {
    const t = getTransporter();
    if (!t) {
        return { success: false, error: "SMTP not configured" };
    }

    try {
        await t.sendMail({
            from: SMTP_FROM,
            to,
            subject,
            text,
            html,
        });
        return { success: true };
    } catch (err) {
        console.error("Email send error:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Sends a password reset email with a token link.
 * The link points to the web reset password page.
 */
async function sendPasswordResetEmail(email, token, name) {
    const resetLink = `${APP_URL}/reset-password?token=${token}`;

    const subject = "Reset your Japam108 password";
    const text = `Hi ${name || ""},\n\nYou requested a password reset for your Japam108 account.\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\n— The Japam108 Team`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">Reset your Japam108 password</h2>
            <p>Hi ${name || ""},</p>
            <p>You requested a password reset for your Japam108 account.</p>
            <p>
                <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #e67e22; color: white; text-decoration: none; border-radius: 4px;">
                    Reset Password
                </a>
            </p>
            <p>Or copy this link: <a href="${resetLink}">${resetLink}</a></p>
            <p>This link expires in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #7f8c8d; font-size: 12px;">— The Japam108 Team</p>
        </div>
    `;

    return sendEmail({ to: email, subject, text, html });
}

module.exports = { sendEmail, sendPasswordResetEmail };