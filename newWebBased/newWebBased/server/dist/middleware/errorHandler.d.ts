import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode: number;
    isOperational: boolean;
}
export declare const createAppError: (message: string, statusCode: number) => AppError;
export declare const errorHandler: (error: Error, req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map