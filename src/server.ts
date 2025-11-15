import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { createChatModel, getModelInfo } from "./lib/models/index.js";
import { ingestStories } from "./services/storyIngestion.js";
import { searchAndRewriteStory } from "./services/storySearch.js";
import { bm25Search, hybridSearch, rerankSearch } from "./services/searchServices.js";
import { deduplicateResults, summarizeResults } from "./services/summarizationService.js";
import { jobTracker } from "./services/jobTracking.js";
import { getDistinctMetadata } from "./utils/mongodb.js";
import { preprocessQuery, analyzeQuery } from "./utils/query-preprocessing/queryPreprocessor.js";
import { promptSchemaManager } from "./services/promptSchemaManager.js";
import {
  StoryIngestionSchema,
  StorySearchSchema,
  type StorySearchRequest
} from "./types/index.js";
import { config } from "./config/index.js";
import { MongoClient } from "mongodb";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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

// ======================== Query Preprocessing ========================
app.post("/api/search/preprocess", async (req, res) => {
  try {
    const { query, options = {} } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = preprocessQuery(query, {
      enableAbbreviations: options.enableAbbreviations !== false,
      enableSynonyms: options.enableSynonyms !== false,
      maxSynonymVariations: options.maxSynonymVariations || 5,
      customAbbreviations: options.customAbbreviations || {},
      customSynonyms: options.customSynonyms || {},
      smartExpansion: options.smartExpansion || false,
      preserveStoryIds: options.preserveStoryIds !== false
    });

    res.json(result);
  } catch (error: any) {
    console.error('Preprocessing error:', error);
    res.status(500).json({ 
      error: 'Failed to preprocess query', 
      details: error.message 
    });
  }
});

app.post("/api/search/analyze", async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const analysis = await analyzeQuery(query);
    res.json(analysis);
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze query', 
      details: error.message 
    });
  }
});

// ======================== BM25 Search ========================
app.post("/api/search/bm25", async (req, res) => {
  try {
    const { query, limit = 10, filters = {}, fields = ['key', 'summary', 'description', 'text', 'acceptanceCriteria', 'project'] } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await bm25Search(query, limit, filters, fields);
    res.json(result);
  } catch (error: any) {
    console.error('BM25 Search error:', error);
    res.status(500).json({ 
      error: 'BM25 search failed', 
      details: error.message 
    });
  }
});

// ======================== Hybrid Search ========================
app.post("/api/search/hybrid", async (req, res) => {
  try {
    const { 
      query, 
      limit = 10, 
      filters = {},
      bm25Weight = 0.5,
      vectorWeight = 0.5,
      bm25Fields = ['key', 'summary', 'description', 'text', 'acceptanceCriteria', 'project']
    } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await hybridSearch(query, limit, filters, bm25Weight, vectorWeight, bm25Fields);
    res.json(result);
  } catch (error: any) {
    console.error('Hybrid Search error:', error);
    res.status(500).json({ 
      error: 'Hybrid search failed', 
      details: error.message 
    });
  }
});

// ======================== Reranking Search ========================
app.post("/api/search/rerank", async (req, res) => {
  try {
    const { 
      query, 
      limit = 10, 
      filters = {}, 
      fusionMethod = 'rrf',
      rerankTopK = 50,
      bm25Weight = 0.4,
      vectorWeight = 0.6
    } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await rerankSearch(query, limit, filters, fusionMethod, rerankTopK, bm25Weight, vectorWeight);
    res.json(result);
  } catch (error: any) {
    console.error('Reranking Search error:', error);
    res.status(500).json({ 
      error: 'Reranking search failed', 
      details: error.message 
    });
  }
});

// ======================== Summarization & Deduplication ========================
app.post("/api/search/deduplicate", async (req, res) => {
  try {
    const { results, threshold = 0.85 } = req.body;
    
    if (!results || !Array.isArray(results)) {
      return res.status(400).json({ error: 'Results array is required' });
    }

    const result = deduplicateResults(results, threshold);
    res.json(result);
  } catch (error: any) {
    console.error('Deduplication error:', error);
    res.status(500).json({ 
      error: 'Failed to deduplicate results', 
      details: error.message 
    });
  }
});

app.post("/api/search/summarize", async (req, res) => {
  try {
    const { results, summaryType = 'concise' } = req.body;
    
    if (!results || !Array.isArray(results)) {
      return res.status(400).json({ error: 'Results array is required' });
    }

    const result = await summarizeResults(results, summaryType);
    res.json(result);
  } catch (error: any) {
    console.error('Summarization error:', error);
    res.status(500).json({ 
      error: 'Failed to summarize results', 
      details: error.message 
    });
  }
});

// ======================== Metadata ========================
app.get("/api/metadata/distinct", async (req, res) => {
  try {
    const mongoClient = new MongoClient(config.mongodb.uri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });

    await mongoClient.connect();
    const metadata = await getDistinctMetadata(
      mongoClient,
      config.mongodb.dbName,
      config.mongodb.collection
    );
    await mongoClient.close();

    res.json({
      success: true,
      metadata
    });
  } catch (error: any) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ 
      error: 'Failed to fetch metadata', 
      details: error.message 
    });
  }
});

// ======================== Job Tracking ========================
app.get("/api/jobs/active", (req, res) => {
  const activeJobs = jobTracker.getActiveJobs();
  res.json({
    success: true,
    jobs: activeJobs,
    count: activeJobs.length
  });
});

app.get("/api/jobs/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = jobTracker.getJob(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  res.json({
    success: true,
    job
  });
});

// ======================== Environment Settings ========================
app.get("/api/env", (req, res) => {
  // Return non-sensitive environment variables
  res.json({
    success: true,
    env: {
      MONGODB_DB_NAME: config.mongodb.dbName,
      MONGODB_COLLECTION: config.mongodb.collection,
      MONGODB_VECTOR_INDEX: config.mongodb.vectorIndexName,
      MONGODB_BM25_INDEX: config.mongodb.bm25IndexName,
      MODEL_PROVIDER: config.modelProvider,
      GROQ_MODEL: config.groq.model,
      TEMPERATURE: config.temperature,
      PORT: config.server.port
    }
  });
});

app.post("/api/env", (req, res) => {
  // Note: This is a read-only endpoint in this implementation
  // Environment variables should be set in .env file
  res.json({
    success: true,
    message: 'Environment variables should be set in .env file. Server restart required for changes.'
  });
});

// ======================== Prompt Schema Manager ========================
app.get("/api/prompts/templates", (req, res) => {
  const templates = promptSchemaManager.getAllTemplates();
  res.json({
    success: true,
    templates
  });
});

app.get("/api/prompts/templates/:id", (req, res) => {
  const { id } = req.params;
  const template = promptSchemaManager.getTemplate(id);
  
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  res.json({
    success: true,
    template
  });
});

app.post("/api/prompts/templates", (req, res) => {
  try {
    const template = req.body;
    promptSchemaManager.saveTemplate(template);
    res.json({
      success: true,
      template
    });
  } catch (error: any) {
    res.status(400).json({
      error: 'Failed to save template',
      details: error.message
    });
  }
});

app.delete("/api/prompts/templates/:id", (req, res) => {
  const { id } = req.params;
  const deleted = promptSchemaManager.deleteTemplate(id);
  
  if (!deleted) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  res.json({
    success: true,
    message: 'Template deleted'
  });
});

app.get("/api/prompts/schemas", (req, res) => {
  const schemas = promptSchemaManager.getAllSchemas();
  res.json({
    success: true,
    schemas
  });
});

app.get("/api/prompts/schemas/:id", (req, res) => {
  const { id } = req.params;
  const schema = promptSchemaManager.getSchema(id);
  
  if (!schema) {
    return res.status(404).json({ error: 'Schema not found' });
  }
  
  res.json({
    success: true,
    schema
  });
});

app.post("/api/prompts/schemas", (req, res) => {
  try {
    const schema = req.body;
    promptSchemaManager.saveSchema(schema);
    res.json({
      success: true,
      schema
    });
  } catch (error: any) {
    res.status(400).json({
      error: 'Failed to save schema',
      details: error.message
    });
  }
});

app.delete("/api/prompts/schemas/:id", (req, res) => {
  const { id } = req.params;
  const deleted = promptSchemaManager.deleteSchema(id);
  
  if (!deleted) {
    return res.status(404).json({ error: 'Schema not found' });
  }
  
  res.json({
    success: true,
    message: 'Schema deleted'
  });
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

