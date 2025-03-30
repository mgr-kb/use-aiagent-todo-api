import { Hono } from "hono";
import { logger } from "hono/logger"; // Import logger middleware
import tasks from "./routes/tasks"; // Value import needed for app.route
import users from "./routes/users"; // Value import needed for app.route
import { authMiddleware } from "./middleware/auth"; // Placeholder for auth middleware
import type { verify } from "hono/jwt";
import { HttpError, InternalServerError } from "./errors/httpErrors"; // Import custom errors
import type { StatusCode } from "hono/utils/http-status"; // Import StatusCode type

// Define and export the environment type
export type AppEnv = {
	Variables: {
		userId: string;
		jwtPayload?: Awaited<ReturnType<typeof verify>>;
	};
	Bindings: {
		// Define expected environment variables/secrets
		SUPABASE_URL: string;
		SUPABASE_ANON_KEY: string;
		JWT_SECRET: string;
		LOCAL_TEST_USER_MAIL: string;
		LOCAL_TEST_USER_PW: string;
		STAGE: string;
	};
};

const app = new Hono<AppEnv>().basePath("/api"); // Apply the Env type

// Apply logger middleware FIRST
app.use("*", logger());

// Apply auth middleware AFTER logger (so logger sees the request before auth potentially stops it)
app.use("*", authMiddleware);

// Route definitions
app.route("/tasks", tasks);
app.route("/users", users);

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
		// Wrap unexpected errors in InternalServerError
		// Avoid leaking internal details in production
		const message =
			c.env.STAGE === "local" && err instanceof Error
				? err.message
				: "Internal Server Error";
		errorResponse = new InternalServerError(message);
		// Optionally include original error type in local dev for debugging
		// if (c.env.STAGE === 'local' && err instanceof Error) {
		//    console.error('Original error type:', err.constructor.name);
		// }
	}

	// Set status code explicitly on the response object
	// Ensure the status code is a valid Hono StatusCode type
	c.status(errorResponse.status as StatusCode);
	// Return the JSON body
	return c.json(errorResponse.toJson());
});

export default app;
