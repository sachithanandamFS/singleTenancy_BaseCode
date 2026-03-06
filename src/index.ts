import express from "express";
import helmet from "helmet";
import bodyParser from "body-parser";
import cors, { CorsOptions } from "cors";
import dotenv from "dotenv";
import { Sequelize } from "sequelize";
import config, { IEnvironment } from "./db/config.js";
import routes from "./routes/index.js";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middleware/errorHandler.middleware.js";
import { languageMiddleware } from "./middleware/languageMiddleware.js";
import { uploadLimiter } from "./middleware/rateLimiter.middleware.js";
import { initializeEventListeners } from "./domain/events/EventListenerRegistry.js";
import "./models/associations.js";
import { closeRedis, initializeRedis } from "./config/redis.client.js";
import { requestContextMiddleware } from "./middleware/requestContext.middleware.js";

// Load environment variables
dotenv.config();

const app = express();

// Trust one proxy hop so req.ip reflects the real client IP from X-Forwarded-For
// Required for accurate rate limiting and security logging when behind a load balancer/reverse proxy
app.set("trust proxy", 1);

const port = process.env.PORT || 5000;
const env = process.env.NODE_ENV as IEnvironment;
logger.info(`Environment: ${env}`);
logger.info(`Server will run on port: ${port}`);

// Define allowed origins
const allowedOrigins: { [key: string]: string | string[] } = {
  development: process.env.DEV_ORIGIN?.split(",").map(o => o.trim()) || [],
  production: process.env.PROD_ORIGIN?.split(",").map(o => o.trim()) || [],
};

// Correct dynamic CORS options
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowed = allowedOrigins[env];

    // Requests with no Origin header (mobile apps, server-to-server, Postman) are allowed by design.
    // This is a known trade-off: browser-enforced CORS doesn't apply to non-browser clients.
    if (!origin || (Array.isArray(allowed) && allowed.includes(origin))) {
      callback(null, true);
    } else {
      logger.warn(`CORS rejected origin: ${origin}. Allowed origins: ${JSON.stringify(allowed)}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Language"],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// Force HTTPS in production - redirect HTTP to HTTPS
if (env === "production") {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https") {
      res.redirect(`https://${req.header("host")}${req.url}`);
    } else {
      next();
    }
  });
}

// Security headers (helmet covers CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
app.use(helmet());

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
// 10kb global limit protects against oversized payloads on all API endpoints.
// For file upload routes, apply express.raw() or multer with its own size limit per route instead.
app.use(bodyParser.json({ limit: "10kb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10kb" }));

// Request context: generates unique requestId for correlation + tracing
// Minimal overhead (~0.5ms per request) - only logs on security events
app.use(requestContextMiddleware);

//  Language Middleware
app.use(languageMiddleware);

// Global rate limiting for all routes
app.use(uploadLimiter);

routes(app);

// Error handling (register before startup)
app.use(errorHandler);

// code to authenticate the sequelize client and start server
let server: ReturnType<typeof app.listen> | null = null;

// code to authenticate the sequelize client and start server
const startServer = async () => {
  try {
    const sequelize = new Sequelize({
      ...config[env].postgres.options,
    });

    await sequelize.authenticate();
    logger.info("DB Connection tested successfully.");
    config[env].postgres.client = sequelize;

    // Initialize Redis for OTP and caching
    await initializeRedis();

    // Initialize global event listeners
    initializeEventListeners();

    // Start listening only after successful DB connection
    server = app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
      logger.info(`Environment: ${env}`);
    });
  } catch (error) {
    logger.error("Unable to connect to the database:", error);
    logger.error("Server will not start without database connection");
    process.exit(1);
  }
};

startServer();

const shutdown = async (signal: string) => {
  try {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    if (server) {
      await new Promise<void>((resolve) => server?.close(() => resolve()));
      logger.info("HTTP server closed");
    }

    if (config?.[env]?.postgres?.client) {
      await config[env].postgres.client.close();
      logger.info("Database connection closed");
    }

    await closeRedis();
    logger.info("Redis connection closed");

    process.exit(0);
  } catch (error) {
    logger.error("Graceful shutdown failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
