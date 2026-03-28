import { Router } from 'express';
import { getProgressSummary } from '../services/progress';

const router = Router();

// GET /api/progress/summary
router.get('/summary', (_req, res, next) => {
  try {
    const summary = getProgressSummary();
    res.json(summary);
  } catch (err) { next(err); }
});

export default router;
