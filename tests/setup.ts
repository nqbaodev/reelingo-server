process.env.DATABASE_URL ??=
  "postgresql://reelingo:reelingo@localhost:5432/reelingo_test?schema=public";
process.env.NODE_ENV ??= "test";
process.env.LOG_LEVEL ??= "silent";
