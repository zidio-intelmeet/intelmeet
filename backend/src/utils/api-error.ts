export class ApiError extends Error {
  public statusCode: number;
  public errors?: any;
  public success: boolean;

  constructor(statusCode: number, message: string, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.success = false;

    // Maintains proper stack trace for where our error was thrown (only available on V8 engines like Node)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // --- Static Helper Methods for Controllers ---
  
  static badRequest(message: string = "Bad Request", errors?: any) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message: string = "Unauthorized", errors?: any) {
    return new ApiError(401, message, errors);
  }

  static forbidden(message: string = "Forbidden", errors?: any) {
    return new ApiError(403, message, errors);
  }

  static notFound(message: string = "Not Found", errors?: any) {
    return new ApiError(404, message, errors);
  }

  static conflict(message: string = "Conflict", errors?: any) {
    return new ApiError(409, message, errors);
  }

  static server(message: string = "Internal Server Error", errors?: any) {
    return new ApiError(500, message, errors);
  }
}