import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import dotenv from "dotenv";
import { connectMongo } from "./db/mongo";
import { connectMySQL } from "./db/mysql";
import authRoutes from "./routes/auth";
import keysRoutes from "./routes/keys";
import ragRoutes from "./routes/rag";
import agentsRoutes from "./routes/agents";
import chatRoutes from "./routes/chat";
import subscriptionsRoutes from "./routes/subscriptions";
import supportRoutes from "./routes/support";
import helplinesRoutes from "./routes/helplines";
import trendsRoutes from "./routes/trends";
import usersRoutes from "./routes/users";
import organizationsRoutes from "./routes/organizations";
import adminRoutes from "./routes/admin";
import mediaRoutes from "./routes/media";
import pipelineRoutes from "./routes/pipeline";
import jobsRoutes from "./routes/jobs";
import locationRoutes from "./routes/location";
import { PermissionError } from "./services/permission.service";
import { initWorkers, shutdownWorkers } from "./workers/index";

dotenv.config();

// ─── Environment Validation ────────────────────────────────────────
const REQUIRED_ENV_VARS = [
  "JWT_SECRET",
  "MONGODB_URI",
] as const;

const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

// Reject obviously weak JWT secrets
if ((process.env.JWT_SECRET as string).length < 32) {
  console.error("FATAL: JWT_SECRET must be at least 32 characters long");
  process.exit(1);
}

const app = express();

// ─── Security Headers (helmet) ─────────────────────────────────────
app.use(helmet());

// ─── CORS – restrict to known origins ──────────────────────────────
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // Allow explicit configured origins
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // In development, allow any localhost origin to ease local testing (ports may vary)
      if (process.env.NODE_ENV !== "production" && origin.startsWith("http://localhost")) {
        console.warn(`CORS: allowing localhost origin for dev: ${origin}`);
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error("CORS: origin not allowed"));
    },
    credentials: true,
  })
);

// ─── Body Size Limits ──────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ─── X-Request-ID ──────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  res.setHeader("X-Request-Id", requestId);
  (req as any).requestId = requestId;
  next();
});

// ─── HTTPS Enforcement (production only) ───────────────────────────
if (process.env.NODE_ENV === "production") {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
    }
    next();
  });
  app.set("trust proxy", 1);
}

// ─── Rate Limiting ─────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

app.use("/api/auth", authLimiter);
app.use("/api", generalLimiter);

const PORT = process.env.PORT || 4000;

async function start() {
  await connectMongo();
  await connectMySQL();

  app.use("/api/auth", authRoutes);
  app.use("/api/keys", keysRoutes);
  app.use("/api/rag", ragRoutes);
  app.use("/api/agents", agentsRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/subscriptions", subscriptionsRoutes);
  app.use("/api/support", supportRoutes);
  app.use("/api/helplines", helplinesRoutes);
  app.use("/api/trends", trendsRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/organizations", organizationsRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/media", mediaRoutes);
  app.use("/api/pipeline", pipelineRoutes);
  app.use("/api/jobs", jobsRoutes);
  app.use("/api/location", locationRoutes);

  // Initialize job queue workers (media, transcription, pipeline)
  initWorkers();

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Global error handler for PermissionError and other errors
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof PermissionError) {
      return res.status(err.status).json({ error: err.message });
    }
    // Don't leak stack traces in production
    if (process.env.NODE_ENV === "production") {
      console.error(`[ERROR] ${err.message}`);
      return res.status(500).json({ error: "Internal server error" });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  const server = app.listen(PORT, () => console.log(`Server listening on ${PORT}`));

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close();
    await shutdownWorkers();
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
