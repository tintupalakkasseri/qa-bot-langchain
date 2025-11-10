import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { createChatModel, getModelInfo } from "./lib/models/index.js";
import { ingestStories } from "./services/storyIngestion.js";
import { searchAndRewriteStory } from "./services/storySearch.js";
import {
  StoryIngestionSchema,
  StorySearchSchema,
  type StorySearchRequest
} from "./types/index.js";
import { config } from "./config/index.js";

const app = express();
app.use(express.json({ limit: "10mb" }));

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".csv", ".json"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV and JSON files are allowed"));
    }
  }
});

// Ensure uploads directory exists
(async () => {
  try {
    await fs.mkdir("uploads", { recursive: true });
  } catch (error) {
    console.warn("Could not create uploads directory:", error);
  }
})();

// Health check endpoint
app.get("/health", (req, res) => {
  const modelInfo = getModelInfo();
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    model: modelInfo
  });
});

// Story ingestion endpoint
app.post("/ingest/stories", upload.single("file"), async (req, res) => {
  const requestId = `ingest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  try {
    console.log(`\n[${requestId}] === STORY INGESTION REQUEST ===`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    if (!req.file) {
      throw new Error("No file uploaded. Please provide a CSV or JSON file.");
    }
    
    const filePath = req.file.path;
    const clearExisting = req.body.clearExisting === "true" || req.body.clearExisting === true;
    
    console.log(`[${requestId}] File: ${req.file.originalname}`);
    console.log(`[${requestId}] Clear existing: ${clearExisting}`);
    
    const result = await ingestStories(filePath, clearExisting);
    
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Ingestion completed in ${duration}ms`);
    console.log(`====================================\n`);
    
    // Clean up uploaded file
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Could not delete temporary file: ${filePath}`);
    }
    
    res.json({
      ...result,
      message: `Successfully ingested ${result.success} story/stories`,
      duration
    });
    
  } catch (err: any) {
    const duration = Date.now() - startTime;
    
    console.error(`\n[${requestId}] === INGESTION ERROR ===`);
    console.error(`Error:`, err.message ?? String(err));
    console.error(`Duration: ${duration}ms`);
    console.error(`====================================\n`);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    res.status(400).json({
      error: err.message ?? String(err),
      duration
    });
  }
});

// Story search and rewrite endpoint
app.post("/search/stories", async (req, res) => {
  const requestId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  try {
    console.log(`\n[${requestId}] === STORY SEARCH REQUEST ===`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Request Body:`, JSON.stringify(req.body, null, 2));
    
    const parsed = StorySearchSchema.parse(req.body as StorySearchRequest);
    
    console.log(`[${requestId}] Request validated`);
    console.log(`  New User Story length: ${parsed.newUserStory.length} chars`);
    console.log(`  Top-K: ${parsed.topK}`);
    
    const result = await searchAndRewriteStory(parsed.newUserStory, parsed.topK);
    
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Search and rewrite completed in ${duration}ms`);
    console.log(`[${requestId}] Found ${result.relatedStories.length} related stories`);
    console.log(`[${requestId}] Quality Score: ${result.qualityScore}`);
    console.log(`====================================\n`);
    
    res.json({
      ...result,
      duration
    });
    
  } catch (err: any) {
    const duration = Date.now() - startTime;
    
    console.error(`\n[${requestId}] === SEARCH ERROR ===`);
    console.error(`Error:`, err.message ?? String(err));
    console.error(`Duration: ${duration}ms`);
    console.error(`Stack:`, err.stack);
    console.error(`====================================\n`);
    
    res.status(400).json({
      error: err.message ?? String(err),
      duration
    });
  }
});

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "localhost";
const serverUrl = process.env.SERVER_URL ?? `http://${host}:${port}`;

app.listen(port, () => {
  const modelInfo = getModelInfo();
  console.log(`User Story RAG API listening on ${serverUrl}`);
  console.log(`Provider: ${modelInfo.provider}`);
  console.log(`Model: ${modelInfo.model}`);
  console.log(`Temperature: ${modelInfo.temperature}`);
  console.log(`Database: ${config.mongodb.dbName}.${config.mongodb.collection}`);
  console.log(`Vector Index: ${config.mongodb.vectorIndexName}`);
  console.log("Server ready!");
});

