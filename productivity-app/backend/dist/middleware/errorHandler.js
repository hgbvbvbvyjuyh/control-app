"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFound = notFound;
function errorHandler(err, _req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) {
    const status = err.status ?? 500;
    const message = err.message ?? 'Internal Server Error';
    console.error(`[Error ${status}] ${message}`);
    res.status(status).json({ error: message });
}
function notFound(_req, _res, next) {
    const err = new Error('Route not found');
    err.status = 404;
    next(err);
}
//# sourceMappingURL=errorHandler.js.map