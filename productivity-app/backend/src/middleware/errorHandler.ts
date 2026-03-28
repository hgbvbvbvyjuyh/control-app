import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  status?: number;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const status = err.status ?? 500;
  const message = err.message ?? 'Internal Server Error';
  console.error(`[Error ${status}] ${message}`);
  res.status(status).json({ error: message });
}

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  const err: AppError = new Error('Route not found');
  err.status = 404;
  next(err);
}
