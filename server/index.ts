import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initDb, seedInitialData } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  // Initialize database if we have a DATABASE_URL
  if (process.env.DATABASE_URL) {
    try {
      log("Initializing database...");
      await initDb();
      log("Database schema initialized successfully");
      
      try {
        await seedInitialData();
        log("Database initial data seeded successfully");
      } catch (seedError) {
        log("Warning: Error seeding initial data: " + seedError);
        log("Continuing with application startup...");
      }
    } catch (error) {
      log("Warning: Error initializing database: " + error);
      log("Continuing with in-memory storage...");
    }
  } else {
    log("No DATABASE_URL found, using in-memory storage");
  }
  
  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log the error
    log(`Error ${status}: ${message}`, "express");
    if (err.stack) {
      log(err.stack, "express");
    }
    
    // Send a structured error response
    res.status(status).json({ 
      error: message,
      status: status
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

  // Allow port override via environment variables
  // This enables flexibility for different deployment environments
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  
  // Check if we have a database connection
  const databaseConnected = process.env.DATABASE_URL !== undefined;
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`Server running on port ${port}`);
    log(`Database ${databaseConnected ? 'configured' : 'not configured'}, using ${databaseConnected ? 'PostgreSQL' : 'in-memory'} storage`);
  });
})();
