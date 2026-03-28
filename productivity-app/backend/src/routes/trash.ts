import { Router } from 'express';
import { queryAll, run } from '../db';
import { recalcPortfolioProgress } from '../services/progress';
import { getRecalcTimeZone } from '../middleware/clientTimezone';

const router = Router();

// GET /api/trash - Retrieve all soft-deleted items
router.get('/', (_req, res, next) => {
  try {
    const trash = {
      frameworks: queryAll('SELECT * FROM frameworks WHERE deletedAt IS NOT NULL'),
      goals: queryAll('SELECT * FROM goals WHERE deletedAt IS NOT NULL'),
      sessions: queryAll('SELECT * FROM sessions WHERE deletedAt IS NOT NULL'),
      journals: queryAll('SELECT * FROM journals WHERE deletedAt IS NOT NULL'),
      failures: queryAll('SELECT * FROM failures WHERE deletedAt IS NOT NULL'),
    };

    // Standardize data parsing for JSON fields
    trash.frameworks = trash.frameworks.map(r => ({ ...r, keys: JSON.parse(r['keys'] as string) }));
    trash.goals = trash.goals.map(r => ({ ...r, data: JSON.parse(r['data'] as string) }));
    trash.journals = trash.journals.map(r => ({ ...r, content: JSON.parse(r['content'] as string) }));

    res.json(trash);
  } catch (err) { next(err); }
});

// POST /api/trash/restore - Restore a soft-deleted item
router.post('/restore', (req, res, next) => {
  try {
    const { type, id } = req.body;
    if (!type || !id) {
      res.status(400).json({ error: 'type and id are required' });
      return;
    }

    const tableMap: Record<string, string> = {
      framework: 'frameworks',
      goal: 'goals',
      session: 'sessions',
      journal: 'journals',
      failure: 'failures',
    };

    const table = tableMap[type];
    if (!table) {
      res.status(400).json({ error: 'Invalid item type' });
      return;
    }

    const { changes } = run(`UPDATE ${table} SET deletedAt = NULL WHERE id = ?`, [id]);
    if (changes === 0) {
      res.status(404).json({ error: 'Item not found in trash' });
      return;
    }

    if (type === 'goal' || type === 'session') {
      recalcPortfolioProgress(Date.now(), getRecalcTimeZone());
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /api/trash/:type/:id - Permanently delete an item
router.delete('/:type/:id', (req, res, next) => {
  try {
    const { type, id } = req.params;
    if (!type || !id) {
      res.status(400).json({ error: 'type and id are required' });
      return;
    }

    const tableMap: Record<string, string> = {
      framework: 'frameworks',
      goal: 'goals',
      session: 'sessions',
      journal: 'journals',
      failure: 'failures',
    };

    const table = tableMap[type];
    if (!table) {
      res.status(400).json({ error: 'Invalid item type' });
      return;
    }

    const { changes } = run(`DELETE FROM ${table} WHERE id = ?`, [id]);
    if (changes === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
