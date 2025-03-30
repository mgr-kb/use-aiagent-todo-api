import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt"; // Import verify function
import { getToken } from "../mocks/getToken";

// Define types for context variables set by this middleware
// This helps with type inference in subsequent handlers
type AuthEnv = {
	Variables: {
		userId: string;
		jwtPayload?: Awaited<ReturnType<typeof verify>>; // Use the return type of verify
		// Add other auth-related variables if needed, e.g., user roles
	};
	Bindings: {
		// Access environment variables/secrets
		JWT_SECRET: string;
		// Add other bindings if needed (SUPABASE_URL, SUPABASE_ANON_KEY are already in AppEnv)
	};
};

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

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		console.log("Authorization header missing or invalid");
		return c.json({ error: "Unauthorized - Missing or invalid token" }, 401);
	}

	const token = authHeader.substring(7); // Remove "Bearer " prefix

	// FIXME: ローカル限定
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const localToken = (await getToken(c as any)) || "";

	try {
		// Verify the token using the secret
		// const payload = await verify(token, jwtSecret);
		const payload = await verify(localToken, jwtSecret);

		// Ensure payload.sub exists and is a string before setting
		const userId = payload?.sub; // Use optional chaining
		if (typeof userId !== "string") {
			// Check if sub is a string
			console.warn("JWT payload `sub` claim is missing or not a string.");
			return c.json(
				{ error: "Unauthorized - Invalid token payload (sub)" },
				401,
			);
		}

		console.log(`User authenticated: ${userId}`);

		// Set userId and optionally the full payload in context
		c.set("userId", userId);
		// c.set('jwtPayload', payload); // Uncomment if you need the full payload later

		// Proceed to the next middleware or route handler
		await next();
	} catch (error: unknown) {
		// Use unknown instead of any
		console.error("JWT verification failed:");

		// Type check the error before accessing properties
		if (error instanceof Error) {
			console.error("Error details:", error.message);
			// Check specific error names for JWT errors from hono/jwt
			if (error.name === "JwtTokenExpired") {
				return c.json({ error: "Unauthorized - Token expired" }, 401);
			}
			if (
				error.name === "JwtTokenInvalid" ||
				error.name === "JwtTokenSignatureMismatched"
			) {
				return c.json({ error: "Unauthorized - Invalid token" }, 401);
			}
		} else {
			// Handle non-Error exceptions if necessary
			console.error("Caught non-Error exception:", error);
		}

		// Generic fallback for other errors or non-Errors
		return c.json({ error: "Unauthorized - Token verification failed" }, 401);
	}
});
