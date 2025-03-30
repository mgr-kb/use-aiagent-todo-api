import { createClient } from "@supabase/supabase-js";
import type { AppEnv } from "../index"; // Import shared Env type
import type { Context as HonoContext } from "hono";

export async function getLocalToken(c: HonoContext<AppEnv>) {
	const supabaseUrl = c.env.SUPABASE_URL;
	const supabaseAnonKey = c.env.SUPABASE_ANON_KEY;
	const localTestUserMail = c.env.LOCAL_TEST_USER_MAIL;
	const localTestUserPw = c.env.LOCAL_TEST_USER_PW;

	if (
		!supabaseUrl ||
		!supabaseAnonKey ||
		!localTestUserMail ||
		!localTestUserPw
	) {
		console.error(
			"Supabase URL or Anon Key not provided in environment variables.",
		);
		// Consider throwing an error or returning a specific status in a real app
		throw new Error("Supabase environment variables not set.");
	}

	// Create and return the Supabase client instance
	// Use the Database interface for type safety
	const supabase = createClient(supabaseUrl, supabaseAnonKey);

	try {
		const { data, error } = await supabase.auth.signInWithPassword({
			email: localTestUserMail,
			password: localTestUserPw,
		});

		if (error) {
			throw new Error(`Sign-in error: ${error.message}`);
		}

		if (data?.session?.access_token) {
			return data.session.access_token;
			// トークンの内容（ペイロード）も確認できます
			// const payload = JSON.parse(atob(data.session.access_token.split('.')[1]));
			// console.log('Token Payload (Decoded):', payload);
			// console.log('User ID (sub):', payload.sub);
		}
		throw new Error("Sign-in succeeded but no session/token found.");
	} catch (e) {
		console.error("An unexpected error occurred:", e);
		throw e;
	}
}
