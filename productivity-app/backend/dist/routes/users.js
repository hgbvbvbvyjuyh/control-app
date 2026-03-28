"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
router.get('/', (_req, res, next) => {
    try {
        res.json((0, db_1.queryAll)('SELECT * FROM users ORDER BY createdAt DESC'));
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', (req, res, next) => {
    try {
        const row = (0, db_1.queryOne)('SELECT * FROM users WHERE id = ?', [req.params['id']]);
        if (!row) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(row);
    }
    catch (err) {
        next(err);
    }
});
router.post('/', (req, res, next) => {
    try {
        const { username } = req.body;
        if (!username) {
            res.status(400).json({ error: 'username is required' });
            return;
        }
        const createdAt = Date.now();
        const { lastInsertRowid } = (0, db_1.run)('INSERT INTO users (username, createdAt) VALUES (?, ?)', [username, createdAt]);
        const created = (0, db_1.queryOne)('SELECT * FROM users WHERE id = ?', [lastInsertRowid]);
        res.status(201).json(created);
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', (req, res, next) => {
    try {
        const { username } = req.body;
        if (!username) {
            res.status(400).json({ error: 'username is required' });
            return;
        }
        const { changes } = (0, db_1.run)('UPDATE users SET username = ? WHERE id = ?', [username, req.params['id']]);
        if (changes === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const updated = (0, db_1.queryOne)('SELECT * FROM users WHERE id = ?', [req.params['id']]);
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', (req, res, next) => {
    try {
        const { changes } = (0, db_1.run)('DELETE FROM users WHERE id = ?', [req.params['id']]);
        if (changes === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map