// src/types/index.ts

// Based on public.tasks table schema
export interface Task {
	id: string; // UUID
	title: string;
	description?: string | null;
	status: "todo" | "inprogress" | "done"; // Assuming these statuses based on schema and routes
	priority: "low" | "medium" | "high"; // Assuming these priorities based on schema and routes
	due_date?: string | null; // ISO 8601 datetime string
	user_id: string; // UUID
	created_at: string; // ISO 8601 datetime string
	updated_at: string; // ISO 8601 datetime string
}

// Based on public.profiles table schema
export interface Profile {
	id: string; // UUID, references auth.users(id)
	email: string;
	name?: string | null;
	avatar_url?: string | null;
	created_at: string; // ISO 8601 datetime string
	updated_at: string; // ISO 8601 datetime string
}

// You might also want types for Insert/Update operations if they differ
// e.g., omitting id, created_at, updated_at for inserts
export type TaskInsert = Omit<Task, "id" | "created_at" | "updated_at">;
export type TaskUpdate = Partial<Omit<Task, "id" | "user_id" | "created_at">>; // Allow partial updates, restrict changing user_id/id

export type ProfileUpdate = Partial<
	Omit<Profile, "id" | "email" | "created_at">
>; // Allow updating name/avatar, restrict changing id/email
