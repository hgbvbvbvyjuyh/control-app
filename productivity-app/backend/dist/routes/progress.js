"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const progress_1 = require("../services/progress");
const router = (0, express_1.Router)();
// GET /api/progress/summary
router.get('/summary', (_req, res, next) => {
    try {
        const summary = (0, progress_1.getProgressSummary)();
        res.json(summary);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=progress.js.map