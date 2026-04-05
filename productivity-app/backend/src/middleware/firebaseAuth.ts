import type { NextFunction, Request, Response } from 'express';
import { AUTH_ENABLED, DEV_AUTH_USER_ID } from '../config/authFlags';
import { getAdminAuth, isFirebaseAdminReady } from '../firebaseAdmin';

export interface AuthedRequest extends Request {
  userId?: string;
}

export async function firebaseAuthMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    // Allow health check through.
    if (req.path === '/health') {
      next();
      return;
    }

    if (!AUTH_ENABLED) {
      req.userId = DEV_AUTH_USER_ID;
      next();
      return;
    }

    if (!isFirebaseAdminReady()) {
      res.status(503).json({ error: 'Auth is not configured on the server' });
      return;
    }

    const header = req.header('authorization') || req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing Authorization token' });
      return;
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      res.status(401).json({ error: 'Missing Authorization token' });
      return;
    }

    const decoded = await getAdminAuth().verifyIdToken(token);
    req.userId = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

