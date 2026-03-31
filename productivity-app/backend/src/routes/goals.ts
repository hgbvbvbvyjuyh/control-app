import { Router } from 'express';
import { queryAll, queryOne, run } from '../db';
import type { Goal } from '../types';
import { recalcPortfolioProgress } from '../services/progress';
import { getRecalcTimeZone } from '../middleware/clientTimezone';

const router = Router();

function parseGoal(row: Record<string, unknown>): Goal {
  const hasDataCol = row['progressHasData'];
  const progressHasData =
    hasDataCol === undefined || hasDataCol === null
      ? true
      : Boolean(Number(hasDataCol));

      return {
    id: String(row['id']),
    frameworkId: String(row['frameworkId']),
    goalType: row['goalType'] as Goal['goalType'],
    parentId: row['parentId'] ? String(row['parentId']) : null,
    isIndependent: Boolean(row['isIndependent']),
    category: (row['category'] as Goal['category']) || 'health',
    data: JSON.parse(row['data'] as string),
    progress: Number(row['progress']),
    status: row['status'] as Goal['status'],
    completedAt: row['completedAt'] === null ? null : (row['completedAt'] as string),
    createdAt: Number(row['createdAt']),
    updatedAt: Number(row['updatedAt']),
    progressHasData,
  } as Goal;
}

// LIST — supports ?frameworkId=, ?goalType=, ?parentId=, ?status=
router.get('/', (req, res, next) => {
  try {
    let sql = 'SELECT * FROM goals WHERE deletedAt IS NULL';
    const params: unknown[] = [];
    if (req.query['frameworkId']) { sql += ' AND frameworkId = ?'; params.push(req.query['frameworkId']); }
    if (req.query['goalType']) { sql += ' AND goalType = ?'; params.push(req.query['goalType']); }
    if (req.query['parentId']) { sql += ' AND parentId = ?'; params.push(req.query['parentId']); }
    if (req.query['status']) { sql += ' AND status = ?'; params.push(req.query['status']); }
    sql += ' ORDER BY createdAt DESC';
    const rows = queryAll(sql, params);
    res.json(rows.map(parseGoal));
  } catch (err) { next(err); }
});

// GET one
router.get('/:id', (req, res, next) => {
  try {
    const row = queryOne('SELECT * FROM goals WHERE id = ?', [req.params['id']]);
    if (!row) { res.status(404).json({ error: 'Goal not found' }); return; }
    res.json(parseGoal(row));
  } catch (err) { next(err); }
});

// GET children of a goal
router.get('/:id/children', (req, res, next) => {
  try {
    const rows = queryAll('SELECT * FROM goals WHERE parentId = ? ORDER BY createdAt DESC', [req.params['id']]);
    res.json(rows.map(parseGoal));
  } catch (err) { next(err); }
});

// CREATE
router.post('/', (req, res, next) => {
  try {
    const body = req.body as Partial<Goal>;
    const { frameworkId, data, goalType, parentId, isIndependent, category } = body;
    if (!frameworkId || !data) {
      res.status(400).json({ error: 'frameworkId and data are required' }); return;
    }

    // If parentId is provided, validate it exists
    if (parentId) {
      const parent = queryOne('SELECT id FROM goals WHERE id = ?', [parentId]);
      if (!parent) { res.status(400).json({ error: 'Parent goal not found' }); return; }
    }

    const now = Date.now();
    const { lastInsertRowid } = run(
      `INSERT INTO goals (frameworkId, goalType, parentId, isIndependent, category, data, progress, status, completedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 0, 'active', NULL, ?, ?)`,
      [
        frameworkId,
        goalType || 'daily',
        parentId ?? null,
        isIndependent === false ? 0 : 1,
        category || 'health',
        JSON.stringify(data),
        now, now,
      ]
    );
    recalcPortfolioProgress(Date.now(), getRecalcTimeZone());
    const created = parseGoal(queryOne('SELECT * FROM goals WHERE id = ?', [lastInsertRowid])!);
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// UPDATE
router.put('/:id', (req, res, next) => {
  try {
    const body = req.body as Partial<Goal>;
    const existing = queryOne('SELECT * FROM goals WHERE id = ?', [req.params['id']]);
    if (!existing) { res.status(404).json({ error: 'Goal not found' }); return; }

    const updatedAt = Date.now();
    const data = body.data ? JSON.stringify(body.data) : (existing['data'] as string);
    const goalType = body.goalType ?? existing['goalType'];
    const category = body.category ?? existing['category'];
    const parentId = body.parentId !== undefined ? body.parentId : existing['parentId'];
    const isIndependent = body.isIndependent !== undefined ? (body.isIndependent ? 1 : 0) : existing['isIndependent'];
    const status = body.status ?? existing['status'];
    const progress = body.progress !== undefined ? body.progress : existing['progress'];

    let completedAt = existing['completedAt'] ? (existing['completedAt'] as string) : null;
    
    console.log(`Update Goal [${req.params['id']}]: current_status=${existing['status']}, new_status=${status}`);

    if (status === 'done' && existing['status'] !== 'done') {
      completedAt = new Date().toISOString();
      console.log(`Setting completedAt to ${completedAt}`);
    } else if (status !== 'done' && existing['status'] === 'done') {
      completedAt = null;
      console.log(`Clearing completedAt`);
    }

    run(
      `UPDATE goals SET data = ?, goalType = ?, parentId = ?, isIndependent = ?,
       category = ?, status = ?, progress = ?, completedAt = ?, updatedAt = ? WHERE id = ?`,
      [data, goalType, parentId ?? null, isIndependent, category || 'health', status, progress, completedAt, updatedAt, req.params['id']]
    );
    recalcPortfolioProgress(Date.now(), getRecalcTimeZone());
    const updated = parseGoal(queryOne('SELECT * FROM goals WHERE id = ?', [req.params['id']])!);
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE
router.delete('/:id', (req, res, next) => {
  try {
    const id = req.params['id'];
    const now = Date.now();
    
    // Perform cascading soft-deletions
    run('UPDATE sessions SET deletedAt = ? WHERE goalId = ?', [now, id]);
    run('UPDATE journals SET deletedAt = ? WHERE goalId = ?', [now, id]);
    run('UPDATE failures SET deletedAt = ? WHERE type = ? AND linkedId = ?', [now, 'goal', id]);
    
    // Also delete failures tied to sessions of this goal
    const sessionIds = queryAll('SELECT id FROM sessions WHERE goalId = ?', [id]).map(s => s['id']);
    if (sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => '?').join(',');
      run(`UPDATE failures SET deletedAt = ? WHERE type = 'session' AND linkedId IN (${placeholders})`, [now, ...sessionIds]);
    }
    
    const { changes } = run('UPDATE goals SET deletedAt = ? WHERE id = ?', [now, id]);
    if (changes === 0) { res.status(404).json({ error: 'Goal not found' }); return; }

    recalcPortfolioProgress(Date.now(), getRecalcTimeZone());
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
