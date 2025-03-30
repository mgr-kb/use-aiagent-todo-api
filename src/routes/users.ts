import { Hono } from "hono";
import type { AppEnv } from "../index"; // Use import type for types
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Profile, ProfileUpdate } from "../types"; // Import profile types
import { getSupabaseClient } from "../db/client"; // Import Supabase client helper
// Import custom errors and HttpError base class
import {
	HttpError,
	NotFoundError,
	DatabaseError,
	InternalServerError,
} from "../errors/httpErrors";
import type { PostgrestError } from "@supabase/supabase-js"; // Import PostgrestError

const profileSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	name: z.string().optional().nullable(),
	avatar_url: z.string().url().optional().nullable(),
	created_at: z.string().datetime({ offset: true }).optional(),
	updated_at: z.string().datetime({ offset: true }).optional(),
});

const users = new Hono<AppEnv>();

// Use the same Supabase error handler helper (or define locally if preferred)
function handleSupabaseError(error: PostgrestError, context: string): never {
	console.error(`[Supabase Error - ${context}]`, error);
	if (error.code === "PGRST116") {
		// Not found or RLS issue
		throw new NotFoundError(
			`${context} failed: Resource not found or insufficient permissions.`,
		);
	}
	throw new DatabaseError(`${context} failed`, error);
}

// GET /api/users/me - 現在のユーザー情報取得
users.get("/me", async (c) => {
	const userId = c.get("userId");
	const supabase = getSupabaseClient(c);

	try {
		const { data, error } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", userId)
			.maybeSingle(); // Use maybeSingle

		if (error) {
			handleSupabaseError(error, "Fetching user profile");
		}

		if (!data) {
			// Profile might genuinely not exist yet for a new user
			console.log(
				`Profile not found for user ${userId}, potential first login.`,
			);
			throw new NotFoundError(`Profile for user ${userId} not found`);
		}

		return c.json<Profile>(data);
	} catch (err) {
		if (err instanceof HttpError) throw err; // Re-throw known errors
		console.error("[GET /users/me] Unexpected error:", err);
		throw new InternalServerError(
			"An unexpected error occurred while fetching the user profile.",
		);
	}
});

// PUT /api/users/me - ユーザー情報更新
// Validate against the fields allowed in ProfileUpdate
const profileUpdateSchema = profileSchema
	.pick({ name: true, avatar_url: true })
	.partial();
users.put("/me", zValidator("json", profileUpdateSchema), async (c) => {
	const userId = c.get("userId");
	const validatedData: Partial<ProfileUpdate> = c.req.valid("json");
	const supabase = getSupabaseClient(c);

	try {
		const profileToUpdate = {
			...validatedData,
			updated_at: new Date().toISOString(),
		};

		const { data, error } = await supabase
			.from("profiles")
			.update(profileToUpdate)
			.eq("id", userId) // Update where id matches the authenticated user's ID
			.select()
			.maybeSingle(); // Use maybeSingle

		if (error) {
			handleSupabaseError(error, "Updating user profile");
		}

		if (!data) {
			// If update affects 0 rows (profile doesn't exist or RLS)
			throw new NotFoundError(
				`Profile for user ${userId} not found or update forbidden`,
			);
		}

		return c.json<Profile>(data);
	} catch (err) {
		if (err instanceof HttpError) throw err; // Re-throw known errors
		console.error("[PUT /users/me] Unexpected error:", err);
		throw new InternalServerError(
			"An unexpected error occurred while updating the user profile.",
		);
	}
});

export default users;
