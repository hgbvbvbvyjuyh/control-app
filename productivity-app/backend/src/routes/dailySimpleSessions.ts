import { Router } from 'express';
import { queryAll, queryOne, run } from '../db';

const router = Router();

const DURATION = 90;

function parseRow(row: Record<string, unknown>) {
  return {
    id: String(row['id']),
    goalId: String(row['goalId']),
    duration: Number(row['duration']),
    status: row['status'] as 'pending' | 'done' | 'missed',
    createdAt: Number(row['createdAt']),
  };
}

router.get('/', (req, res, next) => {
  try {
    const goalId = req.query['goalId'];
    if (goalId === undefined || goalId === '') {
      res.status(400).json({ error: 'goalId is required' });
      return;
    }
    const rows = queryAll(
      'SELECT * FROM daily_simple_sessions WHERE goalId = ? AND deletedAt IS NULL ORDER BY createdAt DESC',
      [goalId]
    );
    res.json(rows.map(r => parseRow(r as Record<string, unknown>)));
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const goalId = (req.body as { goalId?: string | number }).goalId;
    if (goalId === undefined || goalId === '') {
      res.status(400).json({ error: 'goalId is required' });
      return;
    }
    const goal = queryOne(
      "SELECT goalType FROM goals WHERE id = ? AND deletedAt IS NULL",
      [goalId]
    );
    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    if (goal['goalType'] !== 'daily') {
      res.status(400).json({ error: 'Only daily goals can use simple sessions' });
      return;
    }
    const now = Date.now();
    const { lastInsertRowid } = run(
      'INSERT INTO daily_simple_sessions (goalId, duration, status, createdAt) VALUES (?, ?, ?, ?)',
      [goalId, DURATION, 'pending', now]
    );
    const created = queryOne('SELECT * FROM daily_simple_sessions WHERE id = ?', [lastInsertRowid]);
    res.status(201).json(parseRow(created as Record<string, unknown>));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const status = (req.body as { status?: string }).status;
    if (status !== 'done' && status !== 'missed') {
      res.status(400).json({ error: 'status must be done or missed' });
      return;
    }
    const existing = queryOne(
      'SELECT * FROM daily_simple_sessions WHERE id = ? AND deletedAt IS NULL',
      [req.params['id']]
    );
    if (!existing) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (existing['status'] !== 'pending') {
      res.status(400).json({ error: 'Session is already completed' });
      return;
    }
    run('UPDATE daily_simple_sessions SET status = ? WHERE id = ?', [status, req.params['id']]);
    const updated = queryOne('SELECT * FROM daily_simple_sessions WHERE id = ?', [req.params['id']]);
    res.json(parseRow(updated as Record<string, unknown>));
  } catch (err) {
    next(err);
  }
});

export default router;
