import { createMiddleware } from "hono/factory";
// import { verify } from 'hono/jwt'; // Import Supabase compatible JWT verification later

// Define types for context variables set by this middleware
// This helps with type inference in subsequent handlers
type AuthEnv = {
	Variables: {
		userId: string;
		// Add other auth-related variables if needed, e.g., user roles
	};
	Bindings: {
		// Access environment variables/secrets
		JWT_SECRET: string;
		// Add other bindings if needed
	};
};

// Mock JWT verification logic - replace with actual Supabase/JWT logic
async function verifyToken(
	token: string | undefined,
	secret: string,
): Promise<{ sub: string } | null> {
	if (!token) {
		console.warn("No token provided");
		return null;
	}
	// TODO: Replace with actual JWT verification using Supabase JWT secret
	// Example using a placeholder:
	if (token === "Bearer valid-token" && secret === "your-secure-jwt-secret") {
		// In a real scenario, decode the token and get the 'sub' (subject/user ID)
		console.log("Mock token verified successfully");
		return { sub: "mock-user-id" }; // Use a mock user ID
	}
	console.warn("Mock token verification failed");
	return null;
}

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
	const authHeader = c.req.header("Authorization");
	const jwtSecret = c.env.JWT_SECRET;

	if (!jwtSecret) {
		console.error("JWT_SECRET environment variable not set");
		return c.json(
			{ error: "Internal Server Error - Auth configuration missing" },
			500,
		);
	}

	const decodedPayload = await verifyToken(authHeader, jwtSecret);

	if (!decodedPayload || !decodedPayload.sub) {
		console.log("Authentication failed or missing user ID in token");
		return c.json({ error: "Unauthorized" }, 401);
	}

	console.log(`User authenticated: ${decodedPayload.sub}`);
	c.set("userId", decodedPayload.sub); // Set userId in context for downstream handlers

	await next();
});
