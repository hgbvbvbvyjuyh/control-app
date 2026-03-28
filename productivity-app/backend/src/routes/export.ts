import { Router } from 'express';
import { queryAll } from '../db';
import { resolveClientTimeZone } from '../utils/tzCalendar';
import { buildCalendarContextPayload } from '../constants/progressCalendarMeta';

const router = Router();

// GET /api/export — export ALL data as JSON
router.get('/', (req, res, next) => {
  try {
    const tz = resolveClientTimeZone(req.headers['x-user-timezone']);
    const data = {
      frameworks: queryAll('SELECT * FROM frameworks ORDER BY id'),
      goals: queryAll('SELECT * FROM goals ORDER BY id'),
      sessions: queryAll('SELECT * FROM sessions ORDER BY id'),
      journals: queryAll('SELECT * FROM journals ORDER BY id'),
      failures: queryAll('SELECT * FROM failures ORDER BY id'),
      users: queryAll('SELECT * FROM users ORDER BY id'),
      journal_questions: queryAll('SELECT * FROM journal_questions ORDER BY id'),
    };

    // Parse JSON columns for convenience
    data.frameworks = data.frameworks.map(r => ({
      ...r,
      keys: JSON.parse(r['keys'] as string),
      isDefault: Boolean(r['isDefault']),
    }));
    data.goals = data.goals.map(r => ({
      ...r,
      data: JSON.parse(r['data'] as string),
      isIndependent: Boolean(r['isIndependent']),
    }));
    data.journals = data.journals.map(r => ({
      ...r,
      content: JSON.parse(r['content'] as string),
    }));
    data.journal_questions = data.journal_questions.map(r => ({
      ...r,
      isDefault: Boolean(r['isDefault']),
    }));

    res.json({
      exportedAt: new Date().toISOString(),
      calendarContext: buildCalendarContextPayload(tz),
      ...data,
    });
  } catch (err) { next(err); }
});

// POST /api/export/clear — full reset of backend data
router.post('/clear', (_req, res, next) => {
  const { run } = require('../db');
  try {
    run('DELETE FROM goals');
    run('DELETE FROM sessions');
    run('DELETE FROM journals');
    run('DELETE FROM failures');
    run('DELETE FROM frameworks WHERE isDefault = 0');
    run('DELETE FROM users');
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
