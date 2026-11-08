import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4001),
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "production",
  logLevel: process.env.LOG_LEVEL || "info",
  serviceName: process.env.SERVICE_NAME || "ars-factory",
  serviceVersion: process.env.SERVICE_VERSION || "1.0.0",
  apiSecretToken: process.env.API_SECRET_TOKEN || "",
  databaseUrl: process.env.DATABASE_URL,
  demoMode: process.env.FACTORY_DEMO_MODE === "true",
  isProduction: (process.env.NODE_ENV || "production") === "production"
};

export const operatorConfigured = /^[A-Za-z0-9._~-]{32,}$/.test(config.apiSecretToken);

