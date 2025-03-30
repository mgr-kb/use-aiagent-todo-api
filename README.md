# TODO Application API (Backend)

This is the backend API for the TODO application, built with Hono and running on Cloudflare Workers. It uses Supabase for database storage and authentication.

## Prerequisites

*   Node.js and pnpm installed
*   Cloudflare account and `wrangler` CLI installed (`pnpm install -g wrangler`)
*   A Supabase project created

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd use-aiagent-todo-api
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Configure Environment Variables/Secrets:**
    *   **Development (`.dev.vars`):** Create a `.dev.vars` file in the root directory (this file is gitignored). Add your Supabase URL, Anon Key, and a **secure** JWT Secret (obtainable from your Supabase project settings -> API -> JWT Settings):
        ```dotenv
        SUPABASE_URL="YOUR_SUPABASE_URL"
        SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
        JWT_SECRET="YOUR_SUPABASE_JWT_SECRET"
        ```
    *   **Production (Cloudflare Secrets):** Set the secrets using the `wrangler` CLI. These will override `.dev.vars` when deployed.
        ```bash
        wrangler secret put SUPABASE_URL
        # Paste your Supabase URL when prompted
        wrangler secret put SUPABASE_ANON_KEY
        # Paste your Supabase Anon Key when prompted
        wrangler secret put JWT_SECRET
        # Paste your Supabase JWT Secret when prompted
        ```

4.  **Database Setup:**
    *   Ensure the required tables (`profiles`, `tasks`) and Row Level Security (RLS) policies are set up in your Supabase project as defined in `structre.md`. You can use the SQL provided in `structre.md` via the Supabase SQL Editor.

## Running Locally

```bash
pnpm run dev
```

This will start the development server, typically accessible at `http://localhost:8787`. It uses the variables defined in `.dev.vars`.

## Deployment

```bash
pnpm run deploy
```

This will deploy the worker to your Cloudflare account using the configuration in `wrangler.jsonc` and the secrets set via the `wrangler secret put` command.

## API Endpoints

The API base path is `/api`. Authentication (via a valid Supabase JWT in the `Authorization: Bearer <token>` header) is required for all endpoints.

*   **Tasks (`/tasks`)**
    *   `GET /`: Get all tasks for the authenticated user.
    *   `POST /`: Create a new task. (Body: `TaskInsert` excluding `user_id`)
    *   `GET /:id`: Get a specific task by ID.
    *   `PUT /:id`: Update a specific task by ID. (Body: Partial `TaskUpdate`)
    *   `DELETE /:id`: Delete a specific task by ID.
*   **Users (`/users`)**
    *   `GET /me`: Get the profile of the authenticated user.
    *   `PUT /me`: Update the profile of the authenticated user. (Body: Partial `ProfileUpdate` - only `name` and `avatar_url`)

## Linting and Formatting

This project uses Biome for linting and formatting.

```bash
# Check formatting and linting
pnpm run check

# Apply formatting and lint fixes
pnpm run check:fix
```
