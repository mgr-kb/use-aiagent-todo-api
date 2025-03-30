import type { Context } from "hono";
import type { AppEnv } from "../types/hono";
import { getSupabaseClient } from "../utils/supabase";
import type { Profile, ProfileUpdate } from "../models";
// Import errors and error handler
import {
	HttpError,
	NotFoundError,
	DatabaseError,
	InternalServerError,
} from "../utils/error";
import type { PostgrestError } from "@supabase/supabase-js";

// Define the Supabase error handler helper (could be moved to a shared util)
function handleSupabaseError(error: PostgrestError, context: string): never {
	console.error(`[Supabase Error - ${context}]`, error);
	if (error.code === "PGRST116") {
		throw new NotFoundError(
			`${context} failed: Resource not found or insufficient permissions.`,
		);
	}
	throw new DatabaseError(`${context} failed`, error);
}

export const profileService = {
	async getProfile(c: Context<AppEnv>): Promise<Profile> {
		const userId = c.get("userId");
		const supabase = getSupabaseClient(c);
		try {
			const { data, error } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", userId)
				.maybeSingle();

			if (error) handleSupabaseError(error, "Fetching user profile");
			if (!data) {
				console.log(
					`Profile not found for user ${userId}, potential first login.`,
				); // Keep specific log
				throw new NotFoundError(`Profile for user ${userId} not found`);
			}
			return data;
		} catch (err) {
			if (err instanceof HttpError) throw err;
			console.error("[profileService.getProfile] Unexpected error:", err);
			throw new InternalServerError("Unexpected error in profile service.");
		}
	},

	async updateProfile(
		c: Context<AppEnv>,
		updateData: Partial<ProfileUpdate>,
	): Promise<Profile> {
		const userId = c.get("userId");
		const supabase = getSupabaseClient(c);
		try {
			const profileToUpdate = {
				...updateData,
				updated_at: new Date().toISOString(),
			};
			const { data, error } = await supabase
				.from("profiles")
				.update(profileToUpdate)
				.eq("id", userId)
				.select()
				.maybeSingle();

			if (error) handleSupabaseError(error, "Updating user profile");
			if (!data)
				throw new NotFoundError(
					`Profile for user ${userId} not found or update forbidden`,
				);
			return data;
		} catch (err) {
			if (err instanceof HttpError) throw err;
			console.error("[profileService.updateProfile] Unexpected error:", err);
			throw new InternalServerError("Unexpected error in profile service.");
		}
	},
};
