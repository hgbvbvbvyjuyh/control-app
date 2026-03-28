import { Router } from 'express';
import { queryAll, queryOne, run } from '../db';
import type { Failure } from '../types';

const router = Router();

router.get('/', (req, res, next) => {
  try {
    let sql = 'SELECT * FROM failures WHERE deletedAt IS NULL';
    const params: unknown[] = [];
    if (req.query['type']) {
      sql += ' AND type = ?';
      params.push(req.query['type']);
    }
    if (req.query['linkedId']) {
      sql += ' AND linkedId = ?';
      params.push(req.query['linkedId']);
    }
    sql += ' ORDER BY createdAt DESC';
    const rows = queryAll(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', (req, res, next) => {
  try {
    const row = queryOne('SELECT * FROM failures WHERE id = ? AND deletedAt IS NULL', [req.params['id']]);
    if (!row) { res.status(404).json({ error: 'Failure not found' }); return; }
    res.json(row);
  } catch (err) { next(err); }
});

router.post('/', (req, res, next) => {
  try {
    const { type, linkedId, note } = req.body as Partial<Failure>;
    if (!type || linkedId === undefined || !note) {
      res.status(400).json({ error: 'type, linkedId, and note are required' }); return;
    }
    const createdAt = Date.now();
    const { lastInsertRowid } = run(
      'INSERT INTO failures (type, linkedId, note, createdAt) VALUES (?, ?, ?, ?)',
      [type, linkedId, note, createdAt]
    );
    const created = queryOne('SELECT * FROM failures WHERE id = ?', [lastInsertRowid]);
    res.status(201).json(created);
  } catch (err) { next(err); }
});

router.put('/:id', (req, res, next) => {
  try {
    const { note } = req.body as Partial<Failure>;
    if (!note) { res.status(400).json({ error: 'note is required' }); return; }
    const { changes } = run('UPDATE failures SET note = ? WHERE id = ?', [note, req.params['id']]);
    if (changes === 0) { res.status(404).json({ error: 'Failure record not found' }); return; }
    const updated = queryOne('SELECT * FROM failures WHERE id = ?', [req.params['id']]);
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', (req, res, next) => {
  try {
    const id = req.params['id'];
    const now = Date.now();
    const { changes } = run('UPDATE failures SET deletedAt = ? WHERE id = ?', [now, id]);
    if (changes === 0) { res.status(404).json({ error: 'Failure record not found' }); return; }
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
