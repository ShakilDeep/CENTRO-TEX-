import { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Base Application Error class
 */
export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(message: string, statusCode: number, isOperational: boolean = true, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Specific Error Classes
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 404, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, true, details);
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, true, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal Server Error', details?: any) {
    super(message, 500, false, details);
  }
}

/**
 * Global Error Handler
 */
export class ErrorHandler {
  /**
   * Handle errors and send appropriate response
   */
  static handle(error: Error | AppError, request: FastifyRequest, reply: FastifyReply): void {
    // Log error
    request.log.error({
      err: error,
      request: {
        id: request.id,
        method: request.method,
        url: request.url,
        params: request.params,
        query: request.query
      }
    });

    // Handle known operational errors
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        success: false,
        error: {
          message: error.message,
          details: error.details,
          statusCode: error.statusCode
        }
      });
      return;
    }

    // Handle Prisma errors
    if (error.constructor.name === 'PrismaClientKnownRequestError') {
      const prismaError = error as any;
      
      switch (prismaError.code) {
        case 'P2002':
          reply.status(409).send({
            success: false,
            error: {
              message: 'Duplicate entry',
              field: prismaError.meta?.target,
              statusCode: 409
            }
          });
          break;
        case 'P2025':
          reply.status(404).send({
            success: false,
            error: {
              message: 'Record not found',
              statusCode: 404
            }
          });
          break;
        default:
          reply.status(400).send({
            success: false,
            error: {
              message: 'Database operation failed',
              code: prismaError.code,
              statusCode: 400
            }
          });
      }
      return;
    }

    // Handle validation errors from Fastify
    if ((error as FastifyError).validation) {
      reply.status(400).send({
        success: false,
        error: {
          message: 'Validation failed',
          details: (error as FastifyError).validation,
          statusCode: 400
        }
      });
      return;
    }

    // Handle unknown errors
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    reply.status(500).send({
      success: false,
      error: {
        message: isDevelopment ? error.message : 'Something went wrong',
        statusCode: 500,
        ...(isDevelopment && { stack: error.stack })
      }
    });
  }

  /**
   * Register error handler plugin
   */
  static plugin(fastify: FastifyInstance): void {
    fastify.setErrorHandler((error, request, reply) => {
      ErrorHandler.handle(error, request, reply);
    });

    // Handle uncaught errors
    process.on('unhandledRejection', (reason: Error) => {
      fastify.log.error('Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (error: Error) => {
      fastify.log.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (request: FastifyRequest, reply: FastifyReply) => Promise<any>
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await fn(request, reply);
    } catch (error) {
      ErrorHandler.handle(error as Error, request, reply);
    }
  };
}