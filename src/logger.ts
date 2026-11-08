import pino from "pino";
import { config } from "./config.js";

export const logger = pino({
  name: config.serviceName,
  level: config.logLevel,
  transport: !config.isProduction
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname"
        }
      }
    : undefined
});

