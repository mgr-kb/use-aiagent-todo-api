import type { Context } from "hono";
import type { AppEnv } from "../types/hono";
import { getSupabaseClient } from "../utils/supabase";
import type { Task, TaskInsert, TaskUpdate } from "../models";
// Import errors and error handler
import {
	HttpError,
	NotFoundError,
	DatabaseError,
	InternalServerError,
} from "../utils/error";
import type { PostgrestError } from "@supabase/supabase-js";

// Define the Supabase error handler helper
function handleSupabaseError(error: PostgrestError, context: string): never {
	console.error(`[Supabase Error - ${context}]`, error);
	if (error.code === "PGRST116") {
		throw new NotFoundError(
			`${context} failed: Resource not found or insufficient permissions.`,
		);
	}
	throw new DatabaseError(`${context} failed`, error);
}

export const taskService = {
	async getAllTasks(c: Context<AppEnv>): Promise<Task[]> {
		const userId = c.get("userId");
		const supabase = getSupabaseClient(c);
		try {
			const { data, error } = await supabase
				.from("tasks")
				.select("*")
				.eq("user_id", userId)
				.order("created_at", { ascending: false });

			if (error) handleSupabaseError(error, "Fetching tasks");
			return data || [];
		} catch (err) {
			if (err instanceof HttpError) throw err;
			console.error("[taskService.getAllTasks] Unexpected error:", err);
			throw new InternalServerError("Unexpected error in task service.");
		}
	},

	async createTask(
		c: Context<AppEnv>,
		newTaskData: Omit<TaskInsert, "user_id">,
	): Promise<Task> {
		const userId = c.get("userId");
		const supabase = getSupabaseClient(c);
		try {
			const taskToInsert = { ...newTaskData, user_id: userId };
			const { data, error } = await supabase
				.from("tasks")
				.insert(taskToInsert)
				.select()
				.single();

			if (error) handleSupabaseError(error, "Creating task");
			if (!data)
				throw new InternalServerError("Task creation returned no data.");
			return data;
		} catch (err) {
			if (err instanceof HttpError) throw err;
			console.error("[taskService.createTask] Unexpected error:", err);
			throw new InternalServerError("Unexpected error in task service.");
		}
	},

	async getTaskById(c: Context<AppEnv>, id: string): Promise<Task> {
		const userId = c.get("userId");
		const supabase = getSupabaseClient(c);
		try {
			const { data, error } = await supabase
				.from("tasks")
				.select("*")
				.eq("id", id)
				.eq("user_id", userId)
				.maybeSingle();

			if (error) handleSupabaseError(error, "Fetching task by ID");
			if (!data) throw new NotFoundError(`Task with id ${id} not found`);
			return data;
		} catch (err) {
			if (err instanceof HttpError) throw err;
			console.error(
				`[taskService.getTaskById] Unexpected error for id ${id}:`,
				err,
			);
			throw new InternalServerError("Unexpected error in task service.");
		}
	},

	async updateTask(
		c: Context<AppEnv>,
		id: string,
		updateData: Partial<TaskUpdate>,
	): Promise<Task> {
		const userId = c.get("userId");
		const supabase = getSupabaseClient(c);
		try {
			const taskToUpdate = {
				...updateData,
				updated_at: new Date().toISOString(),
			};
			const { data, error } = await supabase
				.from("tasks")
				.update(taskToUpdate)
				.eq("id", id)
				.eq("user_id", userId)
				.select()
				.maybeSingle();

			if (error) handleSupabaseError(error, "Updating task");
			if (!data)
				throw new NotFoundError(
					`Task with id ${id} not found or update forbidden`,
				);
			return data;
		} catch (err) {
			if (err instanceof HttpError) throw err;
			console.error(
				`[taskService.updateTask] Unexpected error for id ${id}:`,
				err,
			);
			throw new InternalServerError("Unexpected error in task service.");
		}
	},

	async deleteTask(c: Context<AppEnv>, id: string): Promise<void> {
		const userId = c.get("userId");
		const supabase = getSupabaseClient(c);
		try {
			const { error, count } = await supabase
				.from("tasks")
				.delete({ count: "exact" })
				.eq("id", id)
				.eq("user_id", userId);

			if (error) handleSupabaseError(error, "Deleting task");
			if (count === 0)
				throw new NotFoundError(
					`Task with id ${id} not found or delete forbidden`,
				);
		} catch (err) {
			if (err instanceof HttpError) throw err;
			console.error(
				`[taskService.deleteTask] Unexpected error for id ${id}:`,
				err,
			);
			throw new InternalServerError("Unexpected error in task service.");
		}
	},
};
