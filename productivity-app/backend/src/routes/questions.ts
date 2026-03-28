import { Router } from 'express';
import { queryAll, queryOne, run } from '../db';
import type { JournalQuestion } from '../types';

const router = Router();

// LIST — supports ?category=
router.get('/', (req, res, next) => {
  try {
    let sql = 'SELECT * FROM journal_questions WHERE 1=1';
    const params: unknown[] = [];
    if (req.query['category']) { sql += ' AND category = ?'; params.push(req.query['category']); }
    sql += ' ORDER BY createdAt ASC';
    const rows = queryAll(sql, params);
    // Convert isDefault from integer to boolean
    res.json(rows.map(r => ({ ...r, isDefault: Boolean(r['isDefault']) })));
  } catch (err) { next(err); }
});

// CREATE custom question
router.post('/', (req, res, next) => {
  try {
    const { category, question } = req.body as Partial<JournalQuestion>;
    if (!category || !question) {
      res.status(400).json({ error: 'category and question are required' }); return;
    }
    const createdAt = Date.now();
    const { lastInsertRowid } = run(
      'INSERT INTO journal_questions (category, question, isDefault, createdAt) VALUES (?, ?, 0, ?)',
      [category, question, createdAt]
    );
    const created = queryOne('SELECT * FROM journal_questions WHERE id = ?', [lastInsertRowid]);
    res.status(201).json({ ...created, isDefault: false });
  } catch (err) { next(err); }
});

// DELETE — prevent deletion of defaults
router.delete('/:id', (req, res, next) => {
  try {
    const existing = queryOne<Record<string, unknown>>('SELECT * FROM journal_questions WHERE id = ?', [req.params['id']]);
    if (!existing) { res.status(404).json({ error: 'Question not found' }); return; }
    if (existing['isDefault']) {
      res.status(403).json({ error: 'Cannot delete a default question' }); return;
    }
    run('DELETE FROM journal_questions WHERE id = ?', [req.params['id']]);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
