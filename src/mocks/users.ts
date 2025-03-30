import type { Profile } from "../types";

// Mock database/service calls for users
// Provide a complete initial Profile mock, matching the type
export const mockUserProfile: Profile = {
	id: "mock-user-id",
	email: "user@example.com",
	name: "Mock User",
	avatar_url: null,
	created_at: new Date(0).toISOString(), // Example date
	updated_at: new Date().toISOString(),
};

// If you had multiple users for testing, you could use an array:
// export const mockUsers: Profile[] = [ mockUserProfile ];
