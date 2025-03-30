import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt"; // Import verify function
import { getLocalToken } from "../mocks/getToken";
import type { AppEnv } from "../types/hono";
import { UnauthorizedError, InternalServerError } from "../utils/error"; // Import custom errors

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
	const authHeader = c.req.header("Authorization");
	const jwtSecret = c.env.JWT_SECRET;

	if (!jwtSecret) {
		console.error("JWT_SECRET environment variable not set");
		throw new InternalServerError("Auth configuration missing"); // Throw custom error
	}

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		// No need to log here, UnauthorizedError implies the reason
		throw new UnauthorizedError("Missing or invalid Authorization header"); // Throw custom error
	}

	// FIXME: ローカル限定
	const token =
		c.env.STAGE === "local" ? await getLocalToken(c) : authHeader.substring(7);

	try {
		// Verify the token using the secret
		const payload = await verify(token, jwtSecret);

		// Ensure payload.sub exists and is a string before setting
		const userId = payload?.sub; // Use optional chaining
		if (typeof userId !== "string") {
			// No need to log here, UnauthorizedError implies the reason
			throw new UnauthorizedError(
				"Invalid token payload (sub claim missing or invalid)",
			); // Throw custom error
		}

		// Set userId and optionally the full payload in context
		c.set("userId", userId);
		// c.set('jwtPayload', payload); // Uncomment if you need the full payload later

		// Proceed to the next middleware or route handler
		await next();
	} catch (error: unknown) {
		// Log the original error for debugging purposes
		console.error("JWT verification failed:", error);
		let errorMessage = "Token verification failed";
		let errorToSend: UnauthorizedError;

		if (error instanceof Error) {
			if (error.name === "JwtTokenExpired") {
				errorMessage = "Token expired";
			} else if (
				error.name === "JwtTokenInvalid" ||
				error.name === "JwtTokenSignatureMismatched"
			) {
				errorMessage = "Invalid token";
			}
			// Use the specific error message if available
			errorToSend = new UnauthorizedError(errorMessage);
		} else {
			// Handle non-Error exceptions
			errorToSend = new UnauthorizedError(
				"Token verification failed due to unexpected error",
			);
		}
		throw errorToSend; // Throw the custom UnauthorizedError
	}
});
