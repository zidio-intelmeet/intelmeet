import { STATUS_CODES, StatusCode } from "../constants/status-codes";
import type { Response } from "express";

type ApiResponseParams<T> = {
  success: boolean;
  message: string;
  statusCode: StatusCode;
  data?: T | null;
  errors?: unknown;
};

export class ApiResponse<T = unknown> {
  public readonly success: boolean;
  public readonly message: string;
  public readonly statusCode: StatusCode;
  public readonly data?: T | null;
  public readonly errors?: unknown;

  constructor(
    statusCodeOrParams: StatusCode | ApiResponseParams<T>,
    data?: T | null,
    message: string = "Success"
  ) {
    // Handle both positional arguments and object parameter
    if (typeof statusCodeOrParams === "number") {
      // Positional arguments: (statusCode, data?, message?)
      this.statusCode = statusCodeOrParams;
      this.data = data;
      this.message = message;
      this.success = statusCodeOrParams >= 200 && statusCodeOrParams < 300;
      this.errors = undefined;
    } else {
      // Object parameter: ({ statusCode, data, message, ... })
      const params = statusCodeOrParams;
      this.statusCode = params.statusCode;
      this.data = params.data;
      this.message = params.message;
      this.success = params.success;
      this.errors = params.errors;
    }
  }

  send(res: Response): Response {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.data !== undefined && { data: this.data }),
      ...(this.errors !== undefined && { errors: this.errors })
    });
  }

  toJSON() {
    return {
      success: this.success,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.data !== undefined && { data: this.data }),
      ...(this.errors !== undefined && { errors: this.errors })
    };
  }

  static Success<T>(
    res: Response,
    message: string,
    data?: T,
    statusCode: StatusCode = STATUS_CODES.OK
  ): Response {
    const response = new ApiResponse<T>(statusCode, data, message);
    return res.status(response.statusCode).json(response);
  }

  static ok<T>(res: Response, message = "OK", data?: T) {
    return ApiResponse.Success(res, message, data, STATUS_CODES.OK);
  }

  static created<T>(res: Response, message = "Created", data?: T) {
    return ApiResponse.Success(res, message, data, STATUS_CODES.CREATED);
  }
}

/*
 * Usage:
 * ApiResponse.ok(res, "OK", data);
 * ApiResponse.created(res, "Created", data);
 */
