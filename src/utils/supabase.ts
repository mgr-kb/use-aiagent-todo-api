import { createClient } from "@supabase/supabase-js";
import type { AppEnv } from "../types/hono"; // Import shared Env type
import type { Context as HonoContext } from "hono"; // Import HonoContext
import type {
	Task,
	Profile,
	TaskInsert,
	TaskUpdate,
	ProfileUpdate,
} from "../models"; // Import specific types

export interface Database {
	public: {
		Tables: {
			tasks: {
				Row: Task;
				Insert: TaskInsert; // Assuming TaskInsert covers this
				Update: TaskUpdate; // Assuming TaskUpdate covers this
			};
			profiles: {
				Row: Profile;
				Insert: Profile; // Assuming full Profile for insert (or define ProfileInsert)
				Update: ProfileUpdate; // Assuming ProfileUpdate covers this
			};
		};
		Views: Record<string, never>; // Use Record<string, never> for empty objects
		Functions: Record<string, never>; // Use Record<string, never>
	};
}
export const getSupabaseClient = (c: HonoContext<AppEnv>) => {
	// Environment variables are available in c.env in Hono routes/middleware
	const supabaseUrl = c.env.SUPABASE_URL;
	const supabaseAnonKey = c.env.SUPABASE_ANON_KEY;

	// Logging is kept for now, consider moving to a dedicated logger utility later
	console.log("[getSupabaseClient] Attempting to connect with:");
	console.log("  - URL:", supabaseUrl);
	console.log(
		"  - Anon Key:",
		supabaseAnonKey
			? `Present (starts with ${supabaseAnonKey.substring(0, 5)}...)`
			: "!!! MISSING !!!",
	);

	if (!supabaseUrl || !supabaseAnonKey) {
		console.error(
			"Supabase URL or Anon Key not provided in environment variables.",
		);
		throw new Error("Supabase environment variables not set."); // Consider InternalServerError
	}
	const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

	return supabase;
};
