import { Request, Response, NextFunction, RequestHandler } from 'express';

export function adminAuthMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const secret = process.env['ADMIN_SECRET'];
    if (secret == null || secret === '') {
      res.status(503).json({ error: 'Admin access not configured' });
      return;
    }

    const authHeader = req.headers['authorization'];
    if (authHeader == null || authHeader !== `Bearer ${secret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    next();
  };
}
