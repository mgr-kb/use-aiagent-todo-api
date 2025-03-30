import { createClient } from "@supabase/supabase-js";
import type { AppEnv } from "../index"; // Import shared Env type
import type { Context as HonoContext } from "hono"; // Import HonoContext
import type {
	Task,
	Profile,
	TaskInsert,
	TaskUpdate,
	ProfileUpdate,
} from "../types"; // Import specific types

// Define Database interface based on your schema (optional but recommended)
// You can generate this automatically using supabase gen types typescript > types/supabase.ts
// For now, we'll use a generic type
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

// Function to create Supabase client, potentially using context for bindings
// In Workers, accessing env directly in top-level scope might not be ideal
// Passing context 'c' or just the bindings 'env' is often preferred.
export const getSupabaseClient = (c: HonoContext<AppEnv>) => {
	// Environment variables are available in c.env in Hono routes/middleware
	const supabaseUrl = c.env.SUPABASE_URL;
	const supabaseAnonKey = c.env.SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		console.error(
			"Supabase URL or Anon Key not provided in environment variables.",
		);
		// Consider throwing an error or returning a specific status in a real app
		throw new Error("Supabase environment variables not set.");
	}

	// Create and return the Supabase client instance
	// Use the Database interface for type safety
	const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

	return supabase;
};

// Example of how to use it in a route handler:
// import { getSupabaseClient } from '../db/client';
//
// someRoute.get('/', async (c) => {
//   const supabase = getSupabaseClient(c);
//   const { data, error } = await supabase.from('tasks').select('*').eq('user_id', c.get('userId'));
//   // ... handle data and error ...
// });
