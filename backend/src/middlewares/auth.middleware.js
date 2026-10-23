const { verifyToken } = require("../utils/jwt");

function requireAuth(req, res, next) {
    const auth = req.headers.authorization || "";

    if (!auth.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication required.",
        });
    }

    const token = auth.slice(7);

    try {
        req.admin = verifyToken(token);
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token.",
        });
    }
}

// Guard for app accounts. Admin and app tokens are signed the same way, so the
// role claim is checked here; without it an admin token would also open the
// app-only routes.
function requireUserAuth(req, res, next) {
    const auth = req.headers.authorization || "";

    if (!auth.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication required.",
        });
    }

    const token = auth.slice(7);

    try {
        const payload = verifyToken(token);
        if (payload.role !== "user") {
            throw new Error("Not a user token.");
        }
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token.",
        });
    }
}

module.exports = { requireAuth, requireUserAuth };