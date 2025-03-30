import { Hono } from "hono";
import { logger } from "hono/logger"; // Import logger middleware
import tasksRouter from "./routes/tasks"; // Value import needed for app.route
import usersRouter from "./routes/users"; // Value import needed for app.route
import { authMiddleware } from "./middleware/auth"; // Placeholder for auth middleware
import { HttpError, InternalServerError } from "./utils/error"; // Import custom errors
import type { StatusCode } from "hono/utils/http-status"; // Import StatusCode type
import type { AppEnv } from "./types/hono";

const app = new Hono<AppEnv>().basePath("/api"); // Apply the Env type

// Apply logger middleware FIRST
app.use("*", logger());

// Apply auth middleware AFTER logger (so logger sees the request before auth potentially stops it)
app.use("*", authMiddleware);

// Route definitions
app.route("/tasks", tasksRouter);
app.route("/users", usersRouter);

// Health check or root endpoint (optional, outside /api)
// Example: app.get('/', (c) => c.text('API is running'));

// --- Global Error Handler ---
app.onError((err, c) => {
	console.error("[onError]", err); // Log the full error for debugging

	let errorResponse: HttpError;

	if (err instanceof HttpError) {
		// Use the custom error directly
		errorResponse = err;
	} else {
		// Access STAGE env var safely
		const stage = c.env.STAGE || "production"; // Default to production if not set
		const message =
			stage === "local" && err instanceof Error
				? err.message
				: "Internal Server Error";
		errorResponse = new InternalServerError(message);
	}

	// Set status code explicitly on the response object
	// Ensure the status code is a valid Hono StatusCode type
	c.status(errorResponse.status as StatusCode);
	// Return the JSON body
	return c.json(errorResponse.toJson());
});

export default app;
