import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Model Provider
  modelProvider: (process.env.MODEL_PROVIDER || "groq").toLowerCase().trim(),
  temperature: Number(process.env.TEMPERATURE ?? 0.1),
  maxTokens: Number(process.env.MAX_TOKENS) || 4096,

  // Groq
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "meta-llama/llama-4-maverick-17b-128e-instruct",
  },

  // Mistral
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY || "",
    embeddingModel: process.env.MISTRAL_EMBEDDING_MODEL || "mistral-embed",
  },

  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || "",
    dbName: process.env.MONGODB_DB_NAME || "rag_userstories",
    collection: process.env.MONGODB_COLLECTION || "stories",
    vectorIndexName: process.env.MONGODB_VECTOR_INDEX || "vector_index_stories",
    bm25IndexName: process.env.MONGODB_BM25_INDEX || "BM25_search",
  },

  // Embeddings
  embeddings: {
    provider: process.env.EMBEDDING_PROVIDER || "mistral",
    model: process.env.EMBEDDING_MODEL || "mistral-embed",
    dimension: Number(process.env.EMBEDDING_DIMENSION) || 1024,
  },

  // Ingestion
  ingestion: {
    batchSize: Number(process.env.INGESTION_BATCH_SIZE) || 10,
  },

  // Server
  server: {
    url: process.env.SERVER_URL || "http://localhost:8787",
    port: Number(process.env.PORT) || 8787,
  },
} as const;

export type Config = typeof config;

