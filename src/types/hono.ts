import type { verify } from "hono/jwt";

// Define and export the Hono application environment type
export type AppEnv = {
	Variables: {
		userId: string;
		// Use JWTPayload or the inferred type, ensure consistency
		jwtPayload?: Awaited<ReturnType<typeof verify>>;
	};
	Bindings: {
		SUPABASE_URL: string;
		SUPABASE_ANON_KEY: string;
		JWT_SECRET: string;
		LOCAL_TEST_USER_MAIL: string;
		LOCAL_TEST_USER_PW: string;
		STAGE: string;
	};
};
