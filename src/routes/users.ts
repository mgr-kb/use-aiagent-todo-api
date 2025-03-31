import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import xss from "xss"; // Import the xss library
import type { AppEnv } from "../types/hono";
import { profileService } from "../services/profileService";
import type { Profile, ProfileUpdate } from "../models";
import { BadRequestError } from "../utils/error"; // Import BadRequestError

// Reuse or redefine Zod schemas
const profileSchema = z.object({
	// id and email are usually not updated by the user directly
	name: z
		.string()
		.optional()
		.nullable()
		.transform((val) => (val ? xss(val) : val)), // Sanitize name if present
	avatar_url: z.string().url().optional().nullable(),
	// created_at, updated_at are handled by service/DB
});
// Schema for updating the profile (only name and avatar_url)
const profileUpdateSchema = profileSchema.partial(); // Already partial and picks relevant fields

const users = new Hono<AppEnv>();

// GET /api/users/me - 現在のユーザー情報取得
users.get("/me", async (c) => {
	const profile = await profileService.getProfile(c);
	return c.json(profile);
});

// PUT /api/users/me - ユーザー情報更新
// Register validator middleware first, then the handler
users.put(
	"/me",
	zValidator("json", profileUpdateSchema, (result, c) => {
		if (!result.success) {
			const issues = result.error.issues
				.map((i) => `${i.path.join(".")}: ${i.message}`)
				.join(", ");
			throw new BadRequestError(`Invalid profile data: ${issues}`);
		}
	}),
	async (c) => {
		// Validation should have run before this handler
		// Define the expected type for validatedData based on ProfileUpdate
		const validatedData: Pick<ProfileUpdate, "name" | "avatar_url"> =
			c.req.valid("json"); // Type should be inferred
		const updatedProfile = await profileService.updateProfile(c, validatedData);
		return c.json(updatedProfile);
	},
);

export default users;
