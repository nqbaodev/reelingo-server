process.env.DATABASE_URL ??=
  "postgresql://reelingo:reelingo@localhost:5432/reelingo_test?schema=public";
process.env.NODE_ENV ??= "test";
process.env.LOG_LEVEL ??= "silent";
process.env.GOOGLE_CLIENT_ID ??= "test-google-client-id.apps.googleusercontent.com";
process.env.JWT_SECRET ??= "test-jwt-secret-that-is-long-enough-for-zod";
