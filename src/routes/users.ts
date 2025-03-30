import { Hono } from "hono";
import type { AppEnv } from "../index"; // Use import type for types
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Profile, ProfileUpdate } from "../types"; // Import profile types
import { mockUserProfile } from "../mocks/users"; // Import mock data

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
users.get("/me", (c) => {
	const userId = c.get("userId"); // Assume userId is set by auth middleware
	// TODO: Implement Supabase fetch logic for profile based on auth.uid()
	if (userId === mockUserProfile.id) {
		return c.json<Profile>(mockUserProfile);
	}
	// If not the mock user, simulate fetching (return a differently typed object or error)
	// For now, return a placeholder or 404, as we only have one mock user
	// return c.json<Profile>({ id: userId, email: 'fetched@example.com', name: 'Fetched User', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
	return c.notFound(); // Or return fetched profile if logic exists
});

// PUT /api/users/me - ユーザー情報更新
// Validate against the fields allowed in ProfileUpdate
const profileUpdateSchema = profileSchema
	.pick({ name: true, avatar_url: true })
	.partial();
users.put("/me", zValidator("json", profileUpdateSchema), async (c) => {
	const userId = c.get("userId");
	// Ensure validated data conforms to Partial<ProfileUpdate>
	const updateData: Partial<ProfileUpdate> = c.req.valid("json");
	// TODO: Implement Supabase update logic for profile where id = auth.uid()
	console.log(`Updating profile for user ${userId} with data:`, updateData);

	// Ensure we only update the mock user if the ID matches
	if (userId !== mockUserProfile.id) {
		return c.json({ error: "Cannot update this profile" }, 403); // Forbidden
	}

	// Update mock data (simple merge, ensure fields match Profile type)
	const updatedProfile: Profile = {
		...mockUserProfile, // Start with existing profile
		...updateData, // Apply validated updates
		id: userId, // Ensure ID remains the same
		updated_at: new Date().toISOString(), // Update timestamp
	};
	// Update the mock object in memory
	Object.assign(mockUserProfile, updatedProfile);

	return c.json<Profile>(updatedProfile); // Type the response
});

export default users;
