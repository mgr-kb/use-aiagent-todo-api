import { Hono } from "hono";
import type { AppEnv } from "../index"; // Use import type for types
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Profile, ProfileUpdate } from "../types"; // Import profile types
import { getSupabaseClient } from "../db/client"; // Import Supabase client helper

const profileSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	name: z.string().optional().nullable(),
	avatar_url: z.string().url().optional().nullable(),
	created_at: z.string().datetime({ offset: true }).optional(),
	updated_at: z.string().datetime({ offset: true }).optional(),
});

const users = new Hono<AppEnv>();

// Middleware specific to user routes (if needed, e.g., ensuring user ID matches param)

// GET /api/users/me - 現在のユーザー情報取得
users.get("/me", async (c) => {
	const userId = c.get("userId");
	const supabase = getSupabaseClient(c);

	// Fetch the profile from the 'profiles' table using the authenticated user ID
	const { data, error } = await supabase
		.from("profiles")
		.select("*")
		.eq("id", userId) // 'id' in profiles table should match auth.users.id
		.single();

	if (error) {
		// Differentiate between profile not found (might be first login) and other errors
		if (error.code === "PGRST116") {
			console.log(
				`Profile not found for user ${userId}, might be first login.`,
			);
			// Optional: Consider creating a profile entry here if it doesn't exist
			// Or return a specific status/message indicating profile needs creation/setup
			return c.notFound(); // Or return a default/empty profile shape
		}
		console.error("Error fetching user profile:", error);
		return c.json(
			{ error: "Failed to fetch user profile", details: error.message },
			500,
		);
	}

	if (!data) {
		// This case might occur if RLS prevents access but no error is thrown
		return c.notFound();
	}

	return c.json<Profile>(data);
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

	// Ensure updated_at is set automatically
	const profileToUpdate = {
		...validatedData,
		updated_at: new Date().toISOString(),
	};

	// Update the profile in the 'profiles' table for the authenticated user
	const { data, error } = await supabase
		.from("profiles")
		.update(profileToUpdate)
		.eq("id", userId) // Update where id matches the authenticated user's ID
		.select()
		.single();

	if (error) {
		// Handle cases where the profile might not exist or RLS prevents update
		if (error.code === "PGRST116") {
			console.warn(
				`Profile update failed for user ${userId}. Profile not found or permission denied.`,
			);
			return c.notFound(); // Or c.json({ error: 'Profile not found or update forbidden' }, 404)
		}
		console.error("Error updating user profile:", error);
		return c.json(
			{ error: "Failed to update user profile", details: error.message },
			500,
		);
	}

	if (!data) {
		// If RLS prevents update without error
		console.warn(
			`Profile update operation for user ${userId} returned no data, likely due to RLS.`,
		);
		return c.notFound();
	}

	return c.json<Profile>(data);
});

export default users;
