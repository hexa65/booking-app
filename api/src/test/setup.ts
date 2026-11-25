import { config as loadEnv } from "dotenv";

// Loads .env.test BEFORE any app code reads the environment. override: true so the real .env can never leak in.
loadEnv({ path: ".env.test", override: true });
process.env.NODE_ENV = "test";
