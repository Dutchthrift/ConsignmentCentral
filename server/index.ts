import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// Check database connection to ensure database is working properly
import { getDatabaseStatus } from "./db-config";
import "dotenv/config";
import passport from "passport";
import { pool } from "./db";
import { configureSession } from "./session-config";
import { storage } from "./storage";

const app = express();
// Increase JSON payload limit to 50MB for image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Set trust proxy for session security in production
app.set('trust proxy', 1);

// Set up session middleware with PostgreSQL store
const sessionMiddleware = configureSession(pool);
app.use(sessionMiddleware);

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport serialization/deserialization
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    // First try to find admin user
    const adminUser = await storage.getAdminUserById(id);
    if (adminUser) {
      return done(null, { ...adminUser, userType: "admin" });
    }
    
    // Then try to find consignor user
    const consignorUser = await storage.getUserById(id);
    if (consignorUser) {
      const customer = await storage.getCustomerByUserId(id);
      return done(null, { 
        ...consignorUser, 
        customer,
        userType: "consignor" 
      });
    }
    
    // No user found
    return done(null, null);
  } catch (error) {
    return done(error);
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Improved global error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // If response is already sent, pass to next error handler
    if (res.headersSent) {
      return next(err);
    }

    // Better error details with stack in development
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log the error for server-side debugging
    console.error(`[ERROR] ${req.method} ${req.path}:`, {
      status,
      message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Send appropriate response to client
    res.status(status).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
