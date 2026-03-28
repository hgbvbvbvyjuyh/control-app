"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./db");
const frameworks_1 = __importDefault(require("./routes/frameworks"));
const goals_1 = __importDefault(require("./routes/goals"));
const sessions_1 = __importDefault(require("./routes/sessions"));
const journals_1 = __importDefault(require("./routes/journals"));
const failures_1 = __importDefault(require("./routes/failures"));
const users_1 = __importDefault(require("./routes/users"));
const progress_1 = __importDefault(require("./routes/progress"));
const questions_1 = __importDefault(require("./routes/questions"));
const export_1 = __importDefault(require("./routes/export"));
const trash_1 = __importDefault(require("./routes/trash"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
const PORT = process.env['PORT'] ?? 3001;
// ---- Middleware ----
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ---- Health Check ----
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});
// Routes
app.use('/api/frameworks', frameworks_1.default);
app.use('/api/goals', goals_1.default);
app.use('/api/sessions', sessions_1.default);
app.use('/api/journals', journals_1.default);
app.use('/api/failures', failures_1.default);
app.use('/api/users', users_1.default);
app.use('/api/progress', progress_1.default);
app.use('/api/questions', questions_1.default);
app.use('/api/export', export_1.default);
app.use('/api/trash', trash_1.default);
// Error handling
app.use(errorHandler_1.notFound);
app.use(errorHandler_1.errorHandler);
// Start server after DB is ready
(0, db_1.initDb)().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🚀 Productivity API running at http://localhost:${PORT}`);
        console.log('   Available routes:');
        console.log('   GET  /api/health');
        console.log('   CRUD /api/frameworks');
        console.log('   CRUD /api/goals');
        console.log('   CRUD /api/sessions');
        console.log('   CRUD /api/journals');
        console.log('   CRUD /api/failures');
        console.log('   CRUD /api/users');
        console.log('   GET  /api/progress/summary');
        console.log('   CRUD /api/questions');
        console.log('   GET  /api/export\n');
    });
}).catch((err) => {
    console.error('Failed to initialise database:', err);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map