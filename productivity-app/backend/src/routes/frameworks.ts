import { Router } from 'express';
import { queryAll, queryOne, run } from '../db';
import type { Framework } from '../types';

const router = Router();

function parseFramework(row: Record<string, unknown>): Framework {
  return { ...row, keys: JSON.parse(row['keys'] as string), isDefault: Boolean(row['isDefault']) } as Framework;
}

router.get('/', (_req, res, next) => {
  try {
    const rows = queryAll('SELECT * FROM frameworks WHERE deletedAt IS NULL ORDER BY createdAt DESC');
    res.json(rows.map(parseFramework));
  } catch (err) { next(err); }
});

router.get('/:id', (req, res, next) => {
  try {
    const row = queryOne('SELECT * FROM frameworks WHERE id = ?', [req.params['id']]);
    if (!row) { res.status(404).json({ error: 'Framework not found' }); return; }
    res.json(parseFramework(row));
  } catch (err) { next(err); }
});

router.post('/', (req, res, next) => {
  try {
    const { name, keys } = req.body as Partial<Framework>;
    if (!name || !Array.isArray(keys)) {
      res.status(400).json({ error: 'name and keys are required' }); return;
    }
    const createdAt = Date.now();
    const { lastInsertRowid } = run(
      'INSERT INTO frameworks (name, keys, isDefault, createdAt) VALUES (?, ?, 0, ?)',
      [name, JSON.stringify(keys), createdAt]
    );
    const created = parseFramework(queryOne('SELECT * FROM frameworks WHERE id = ?', [lastInsertRowid])!);
    res.status(201).json(created);
  } catch (err) { next(err); }
});

router.put('/:id', (req, res, next) => {
  try {
    const { name, keys } = req.body as Partial<Framework>;
    if (!name || !Array.isArray(keys)) {
      res.status(400).json({ error: 'name and keys are required' }); return;
    }
    const { changes } = run(
      'UPDATE frameworks SET name = ?, keys = ? WHERE id = ?',
      [name, JSON.stringify(keys), req.params['id']]
    );
    if (changes === 0) { res.status(404).json({ error: 'Framework not found' }); return; }
    const updated = parseFramework(queryOne('SELECT * FROM frameworks WHERE id = ?', [req.params['id']])!);
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', (req, res, next) => {
  try {
    const existing = queryOne<Record<string, unknown>>('SELECT * FROM frameworks WHERE id = ?', [req.params['id']]);
    if (!existing) { res.status(404).json({ error: 'Framework not found' }); return; }
    if (existing['isDefault']) {
      res.status(403).json({ error: 'Cannot delete a default framework' }); return;
    }
    const now = Date.now();
    run('UPDATE frameworks SET deletedAt = ? WHERE id = ?', [now, req.params['id']]);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
