import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;

    const message = exception instanceof HttpException 
      ? (exception.getResponse() as any).message || exception.message 
      : 'Internal server error';

    response.status(status).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: {
        code: status,
        message: Array.isArray(message) ? message[0] : message, // Handles class-validator arrays
        type: exception.name,
      },
    });
  }
}