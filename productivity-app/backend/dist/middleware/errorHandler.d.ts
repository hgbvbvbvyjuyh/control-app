import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    status?: number;
}
export declare function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction): void;
export declare function notFound(_req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=errorHandler.d.ts.map