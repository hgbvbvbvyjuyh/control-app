import { Router } from 'express';
import { queryAll, queryOne, run } from '../db';
import type { UserProfile } from '../types';

const router = Router();

router.get('/', (_req, res, next) => {
  try {
    res.json(queryAll('SELECT * FROM users ORDER BY createdAt DESC'));
  } catch (err) { next(err); }
});

router.get('/:id', (req, res, next) => {
  try {
    const row = queryOne('SELECT * FROM users WHERE id = ?', [req.params['id']]);
    if (!row) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(row);
  } catch (err) { next(err); }
});

router.post('/', (req, res, next) => {
  try {
    const { username } = req.body as Partial<UserProfile>;
    if (!username) { res.status(400).json({ error: 'username is required' }); return; }
    const createdAt = Date.now();
    const { lastInsertRowid } = run(
      'INSERT INTO users (username, createdAt) VALUES (?, ?)',
      [username, createdAt]
    );
    const created = queryOne('SELECT * FROM users WHERE id = ?', [lastInsertRowid]);
    res.status(201).json(created);
  } catch (err) { next(err); }
});

router.put('/:id', (req, res, next) => {
  try {
    const { username } = req.body as Partial<UserProfile>;
    if (!username) { res.status(400).json({ error: 'username is required' }); return; }
    const { changes } = run('UPDATE users SET username = ? WHERE id = ?', [username, req.params['id']]);
    if (changes === 0) { res.status(404).json({ error: 'User not found' }); return; }
    const updated = queryOne('SELECT * FROM users WHERE id = ?', [req.params['id']]);
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', (req, res, next) => {
  try {
    const { changes } = run('DELETE FROM users WHERE id = ?', [req.params['id']]);
    if (changes === 0) { res.status(404).json({ error: 'User not found' }); return; }
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
