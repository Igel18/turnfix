import { Request, Response, NextFunction } from 'express';
import { authenticateToken, AuthRequest } from '../../src/middleware/authBypass';

describe('Authentication Middleware', () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  describe('authenticateToken', () => {
    it('should add a dummy user to the request', async () => {
      await authenticateToken(req as AuthRequest, res as Response, next);

      expect(req.user).toBeDefined();
      expect(req.user).toEqual({
        id: '1',
        email: 'admin@turnfix.com',
        username: 'admin',
        role: 'admin'
      });
    });

    it('should call next() to continue middleware chain', async () => {
      await authenticateToken(req as AuthRequest, res as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should work with any request object', async () => {
      const customReq = { body: { test: 'data' } } as AuthRequest;
      
      await authenticateToken(customReq, res as Response, next);

      expect(customReq.user).toBeDefined();
      expect(customReq.body).toEqual({ test: 'data' });
      expect(next).toHaveBeenCalled();
    });
  });
});
