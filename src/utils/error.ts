export class HttpError extends Error {
	readonly status: number;
	readonly code?: string; // Optional application-specific error code

	constructor(status: number, message: string, code?: string) {
		super(message);
		this.status = status;
		this.code = code;
		// Ensure the prototype chain is correct for instanceof checks
		Object.setPrototypeOf(this, new.target.prototype);
		this.name = this.constructor.name; // Set the error name to the class name
	}

	// Method to create a JSON response body
	toJson() {
		const response: { message: string; code?: string } = {
			message: this.message,
		};
		if (this.code) {
			response.code = this.code;
		}
		return response;
	}
}

// Specific HTTP error classes
export class BadRequestError extends HttpError {
	constructor(message = "Bad Request", code?: string) {
		super(400, message, code);
	}
}

export class UnauthorizedError extends HttpError {
	constructor(message = "Unauthorized", code?: string) {
		super(401, message, code);
	}
}

export class ForbiddenError extends HttpError {
	constructor(message = "Forbidden", code?: string) {
		super(403, message, code);
	}
}

export class NotFoundError extends HttpError {
	constructor(message = "Not Found", code?: string) {
		super(404, message, code);
	}
}

export class InternalServerError extends HttpError {
	constructor(message = "Internal Server Error", code?: string) {
		super(500, message, code);
	}
}

// Example: Database-specific error (can be extended)
export class DatabaseError extends InternalServerError {
	readonly originalError?: Error; // Store the original DB error

	constructor(
		message = "Database operation failed",
		originalError?: Error,
		code = "DB_ERROR",
	) {
		super(message, code);
		this.originalError = originalError;
	}
}
