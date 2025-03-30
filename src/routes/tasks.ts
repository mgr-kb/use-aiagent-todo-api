import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppEnv } from "../types/hono";
import { taskService } from "../services/taskService";
import type { Task, TaskUpdate } from "../models";
import { BadRequestError } from "../utils/error"; // Import BadRequestError
const tasks = new Hono<AppEnv>();

// Reuse or redefine Zod schemas here
const taskSchema = z.object({
	// id is excluded as it's generated or from path param
	title: z.string().min(1, { message: "Title cannot be empty" }),
	description: z.string().optional().nullable(),
	status: z.enum(["todo", "inprogress", "done"]).default("todo"),
	priority: z.enum(["low", "medium", "high"]).default("medium"),
	due_date: z.string().datetime({ offset: true }).optional().nullable(),
	// user_id, created_at, updated_at are handled by service/DB
});
// Schema for creating a task (ID is generated)
const taskInsertSchema = taskSchema; // Base schema already excludes id
// Schema for updating a task (all fields optional, ID from path)
const taskUpdateSchema = taskSchema.partial();
// Basic UUID validation regex
const uuidRegex =
	/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

tasks.get("/", async (c) => {
	const tasks = await taskService.getAllTasks(c);
	return c.json({ tasks });
});

tasks.post(
	"/",
	zValidator("json", taskInsertSchema, (result, c) => {
		if (!result.success) {
			const issues = result.error.issues
				.map((i) => `${i.path.join(".")}: ${i.message}`)
				.join(", ");
			throw new BadRequestError(`Invalid task data: ${issues}`);
		}
	}),
	async (c) => {
		// Validation should have run before this handler
		const validatedData = c.req.valid("json"); // Type should be inferred now
		// Ensure validatedData has the correct type expected by the service
		const createdTask = await taskService.createTask(
			c,
			validatedData as Omit<
				Task,
				"id" | "user_id" | "created_at" | "updated_at"
			>,
		);
		return c.json(createdTask, 201);
	},
);

tasks.get("/:id", async (c) => {
	const id = c.req.param("id");
	if (!uuidRegex.test(id)) {
		throw new BadRequestError("Invalid Task ID format");
	}
	const task = await taskService.getTaskById(c, id);
	return c.json(task);
});

tasks.put(
	"/:id",
	zValidator("json", taskUpdateSchema, (result, c) => {
		if (!result.success) {
			const issues = result.error.issues
				.map((i) => `${i.path.join(".")}: ${i.message}`)
				.join(", ");
			throw new BadRequestError(`Invalid update data: ${issues}`);
		}
	}),
	async (c) => {
		const id = c.req.param("id");
		if (!uuidRegex.test(id)) {
			throw new BadRequestError("Invalid Task ID format");
		}
		// Validation should have run before this handler
		const validatedData: Partial<TaskUpdate> = c.req.valid("json"); // Type should be inferred
		const updatedTask = await taskService.updateTask(c, id, validatedData);
		return c.json(updatedTask);
	},
);

tasks.delete("/:id", async (c) => {
	const id = c.req.param("id");
	if (!uuidRegex.test(id)) {
		throw new BadRequestError("Invalid Task ID format");
	}
	await taskService.deleteTask(c, id);
	return c.body(null, 204);
});

export default tasks;
