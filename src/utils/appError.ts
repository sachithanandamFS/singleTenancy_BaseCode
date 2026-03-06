// appError.ts
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  validationErrors?: Record<string, string>[];

  constructor(
    message: string, 
    statusCode: number, 
    validationErrors?: Record<string, string>[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.validationErrors = validationErrors;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}