import { Hono } from "hono";
import type { AppEnv } from "../index"; // Use import type for types
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Task, TaskInsert, TaskUpdate } from "../types"; // Import task types
import { getSupabaseClient } from "../db/client"; // Import Supabase client helper

const taskSchema = z.object({
	id: z.string().uuid().optional(), // UUID generated by DB or provided for update
	title: z.string().min(1),
	description: z.string().optional().nullable(), // Allow null in Zod schema
	status: z.enum(["todo", "inprogress", "done"]).default("todo"),
	priority: z.enum(["low", "medium", "high"]).default("medium"),
	due_date: z.string().datetime({ offset: true }).optional().nullable(), // Allow null, specify offset for TZ
	user_id: z.string().uuid(), // Changed from userId
	created_at: z.string().datetime({ offset: true }).optional(),
	updated_at: z.string().datetime({ offset: true }).optional(),
});

const tasks = new Hono<AppEnv>();

// GET /api/tasks - タスク一覧取得
tasks.get("/", async (c) => {
	const userId = c.get("userId");
	const supabase = getSupabaseClient(c);

	const { data, error } = await supabase
		.from("tasks")
		.select("*")
		.eq("user_id", userId) // Filter by authenticated user
		.order("created_at", { ascending: false }); // Example ordering

	if (error) {
		console.error("Error fetching tasks:", error);
		return c.json(
			{ error: "Failed to fetch tasks", details: error.message },
			500,
		);
	}

	return c.json<{ tasks: Task[] }>({ tasks: data || [] });
});

// POST /api/tasks - タスク作成
const taskInsertSchema = taskSchema.omit({
	id: true,
	user_id: true, // user_id will be added from context
	created_at: true,
	updated_at: true,
});
tasks.post("/", zValidator("json", taskInsertSchema), async (c) => {
	const validatedData = c.req.valid("json");
	const userId = c.get("userId");
	if (!userId) return c.json({ error: "Unauthorized" }, 401); // Should be caught by middleware, but double-check

	const supabase = getSupabaseClient(c);

	const taskToInsert = {
		...validatedData,
		user_id: userId, // Add the user_id from the authenticated user
	};

	const { data, error } = await supabase
		.from("tasks")
		.insert(taskToInsert)
		.select() // Return the created record
		.single(); // Expecting a single record back

	if (error) {
		console.error("Error creating task:", error);
		return c.json(
			{ error: "Failed to create task", details: error.message },
			500,
		);
	}
	if (!data) {
		console.error("Task creation returned no data");
		return c.json({ error: "Failed to create task - no data returned" }, 500);
	}

	return c.json<Task>(data, 201);
});

// GET /api/tasks/:id - 特定タスク取得
tasks.get("/:id", async (c) => {
	const { id } = c.req.param();
	if (!id) return c.json({ error: "Task ID is required" }, 400);
	const userId = c.get("userId");
	const supabase = getSupabaseClient(c);

	const { data, error } = await supabase
		.from("tasks")
		.select("*")
		.eq("id", id)
		.eq("user_id", userId) // Ensure the user owns the task
		.single(); // Expecting one or zero tasks

	if (error) {
		// Differentiate between not found and other errors
		if (error.code === "PGRST116") {
			// Resource not found
			return c.notFound();
		}
		console.error("Error fetching task by id:", error);
		return c.json(
			{ error: "Failed to fetch task", details: error.message },
			500,
		);
	}

	if (!data) {
		return c.notFound();
	}

	return c.json<Task>(data);
});

// PUT /api/tasks/:id - タスク更新
const taskUpdateSchema = taskSchema
	.partial()
	.omit({ id: true, user_id: true, created_at: true }); // Keep updated_at implicitly updated
tasks.put("/:id", zValidator("json", taskUpdateSchema), async (c) => {
	const { id } = c.req.param();
	if (!id) return c.json({ error: "Task ID is required" }, 400);
	const validatedData: Partial<TaskUpdate> = c.req.valid("json");
	const userId = c.get("userId");
	const supabase = getSupabaseClient(c);

	// Ensure updated_at is set automatically (or handle manually if needed)
	const taskToUpdate = {
		...validatedData,
		updated_at: new Date().toISOString(), // Explicitly set updated_at
	};

	const { data, error } = await supabase
		.from("tasks")
		.update(taskToUpdate)
		.eq("id", id)
		.eq("user_id", userId) // Ensure user owns the task
		.select()
		.single();

	if (error) {
		// Differentiate between not found (due to RLS or wrong ID) and other errors
		if (error.code === "PGRST116") {
			// Resource not found or RLS prevented update
			console.warn(
				`Update failed for task ${id} by user ${userId}. Task not found or permission denied.`,
			);
			return c.notFound(); // Or c.json({ error: 'Task not found or update forbidden' }, 404)
		}
		console.error("Error updating task:", error);
		return c.json(
			{ error: "Failed to update task", details: error.message },
			500,
		);
	}
	if (!data) {
		// This might happen if RLS prevents the update but doesn't throw PGRST116
		console.warn(
			`Update operation for task ${id} by user ${userId} returned no data, likely due to RLS.`,
		);
		return c.notFound();
	}

	return c.json<Task>(data);
});

// DELETE /api/tasks/:id - タスク削除
tasks.delete("/:id", async (c) => {
	const { id } = c.req.param();
	if (!id) return c.json({ error: "Task ID is required" }, 400);
	const userId = c.get("userId");
	const supabase = getSupabaseClient(c);

	const { error, count } = await supabase
		.from("tasks")
		.delete({ count: "exact" }) // Request count of deleted rows
		.eq("id", id)
		.eq("user_id", userId); // Ensure user owns the task

	if (error) {
		console.error("Error deleting task:", error);
		return c.json(
			{ error: "Failed to delete task", details: error.message },
			500,
		);
	}

	if (count === 0) {
		// Task didn't exist or didn't belong to the user
		console.warn(
			`Delete failed for task ${id} by user ${userId}. Task not found or permission denied.`,
		);
		return c.notFound();
	}

	// Use 204 No Content for successful deletions as there's no body
	return c.body(null, 204);
	// return c.json({ message: 'Task deleted successfully' }, 200); // Alternative with body
});

export default tasks;
