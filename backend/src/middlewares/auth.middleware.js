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

module.exports = { requireAuth };