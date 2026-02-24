/**
 * Structured logging utility
 *
 * Provides consistent logging across the application with
 * different output formats for development vs production.
 */

enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";

  /**
   * Internal logging function
   */
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();

    if (this.isDevelopment) {
      // Pretty print in development
      const prefix = `[${timestamp}] ${level.toUpperCase()}:`;
      console.log(prefix, message, context || "");
    } else {
      // JSON logs for production (easier to parse with log aggregators)
      const logEntry = {
        timestamp,
        level,
        message,
        ...context,
      };
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Debug log - only shown in development
   */
  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  /**
   * Info log
   */
  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Warning log
   */
  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Error log
   */
  error(message: string, error?: Error, context?: LogContext) {
    const errorContext = {
      ...context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: this.isDevelopment ? error.stack : undefined,
          }
        : undefined,
    };

    this.log(LogLevel.ERROR, message, errorContext);
  }

  /**
   * Log API request
   */
  request(req: Request, context?: LogContext) {
    const url = new URL(req.url);

    this.info("API Request", {
      method: req.method,
      path: url.pathname,
      query: url.search,
      ...context,
    });
  }

  /**
   * Log API response
   */
  response(
    req: Request,
    statusCode: number,
    durationMs?: number,
    context?: LogContext
  ) {
    const url = new URL(req.url);

    this.info("API Response", {
      method: req.method,
      path: url.pathname,
      statusCode,
      durationMs,
      ...context,
    });
  }

  /**
   * Log database query
   */
  query(query: string, durationMs?: number, context?: LogContext) {
    this.debug("Database Query", {
      query,
      durationMs,
      ...context,
    });
  }
}

/**
 * Singleton logger instance
 */
export const logger = new Logger();

/**
 * Error logging helper
 * Logs error with context and returns the error
 */
export function logError(
  error: Error,
  context?: Record<string, any>
): Error {
  logger.error(error.message, error, context);
  return error;
}
