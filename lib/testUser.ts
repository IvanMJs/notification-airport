if (process.env.NODE_ENV === "production" && process.env.TEST_MODE === "true") {
  throw new Error("TEST_MODE cannot be enabled in production");
}

export const TEST_USER = {
  id: "test-user-00000000-0000-0000-0000-000000000000",
  email: "test@tripcopilot.com",
  user_metadata: {
    full_name: "Test User",
    name: "Test User",
  },
  app_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00.000Z",
} as const;

export const isTestMode = () => process.env.TEST_MODE === "true";
