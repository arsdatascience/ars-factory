import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4001),
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "production",
  logLevel: process.env.LOG_LEVEL || "info",
  serviceName: process.env.SERVICE_NAME || "ars-factory",
  serviceVersion: process.env.SERVICE_VERSION || "1.0.0",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  storagePath: process.env.STORAGE_PATH || "./data/artifacts",
  apiSecretToken: process.env.API_SECRET_TOKEN || "",
  isProduction: process.env.NODE_ENV === "production"
};
