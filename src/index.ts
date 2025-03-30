import { Hono } from "hono";
import tasks from "./routes/tasks"; // Value import needed for app.route
import users from "./routes/users"; // Value import needed for app.route
import { authMiddleware } from "./middleware/auth"; // Placeholder for auth middleware
import type { verify } from "hono/jwt";

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

// Apply auth middleware to protected routes (example: all routes under /api for now)
// Specific routes might need fine-grained control later
app.use("*", authMiddleware);

// Route definitions
app.route("/tasks", tasks);
app.route("/users", users);

// Health check or root endpoint (optional, outside /api)
// Example: app.get('/', (c) => c.text('API is running'));

export default app;
