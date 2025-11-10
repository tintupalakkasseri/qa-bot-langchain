import { Embeddings } from "@langchain/core/embeddings";
import { Document } from "@langchain/core/documents";
import { MongoClient } from "mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { createEmbeddings } from "../embeddings/index.js";

export interface VectorStoreConfig {
  mongoUri: string;
  dbName: string;
  collectionName: string;
  indexName?: string;
  embeddingProvider: string;
  embeddingModel: string;
  apiKey: string;
}

/**
 * LangChain MongoDB Vector Store for User Stories
 * Supports Mistral (mistral-embed, 1024 dims) embeddings
 * Uses LangChain's MongoDBAtlasVectorSearch integration
 */
export class StoryVectorStore {
  private client: MongoClient;
  private vectorStore: MongoDBAtlasVectorSearch | null = null;
  private embeddings: Embeddings | null = null;
  private config: VectorStoreConfig;

  constructor(config: VectorStoreConfig) {
    this.config = config;
    this.client = new MongoClient(config.mongoUri);
  }

  /**
   * Initialize the vector store connection
   */
  async initialize(): Promise<void> {
    try {
      // Initialize embeddings using factory
      this.embeddings = await createEmbeddings({
        provider: this.config.embeddingProvider,
        model: this.config.embeddingModel,
        apiKey: this.config.apiKey,
      });
      
      console.log(`Initialized ${this.config.embeddingProvider} embeddings (${this.config.embeddingModel})`);
      
      await this.client.connect();
      
      const collection = this.client
        .db(this.config.dbName)
        .collection(this.config.collectionName);

      // Initialize LangChain MongoDB Atlas Vector Search
      this.vectorStore = new MongoDBAtlasVectorSearch(this.embeddings, {
        collection,
        indexName: this.config.indexName || "vector_index_stories",
        textKey: "fullContent",
        embeddingKey: "embedding"
      });

      console.log(`Connected to MongoDB Vector Store: ${this.config.dbName}.${this.config.collectionName}`);
    } catch (error) {
      throw new Error(`Failed to initialize vector store: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add story documents with automatic embedding generation
   */
  async addStories(stories: Array<{
    key: string;
    fullContent: string;
    metadata: Record<string, any>;
  }>): Promise<void> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized. Call initialize() first.");
    }

    if (stories.length === 0) {
      console.log("No stories to add");
      return;
    }

    // Convert to LangChain Documents
    const documents = stories.map((story) => 
      new Document({
        pageContent: story.fullContent,
        metadata: {
          key: story.key,
          ...story.metadata,
          processedAt: new Date().toISOString(),
        }
      })
    );

    try {
      console.log(`Generating embeddings for ${stories.length} stories...`);
      const startTime = Date.now();
      
      await this.vectorStore.addDocuments(documents);
      
      const duration = Date.now() - startTime;
      console.log(`✓ Added ${stories.length} stories with embeddings (${duration}ms)`);
    } catch (error) {
      throw new Error(`Failed to add stories: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add stories with batch processing
   */
  async addStoriesBatch(
    stories: Array<{
      key: string;
      fullContent: string;
      metadata: Record<string, any>;
    }>,
    batchSize: number = 10
  ): Promise<void> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized. Call initialize() first.");
    }

    if (stories.length === 0) {
      console.log("No stories to add");
      return;
    }

    console.log(`Processing ${stories.length} stories in batches of ${batchSize}...`);
    const startTime = Date.now();

    // Split into batches
    const batches: typeof stories[] = [];
    for (let i = 0; i < stories.length; i += batchSize) {
      batches.push(stories.slice(i, i + batchSize));
    }

    let successCount = 0;
    let failureCount = 0;

    // Process batches sequentially
    for (let idx = 0; idx < batches.length; idx++) {
      const batch = batches[idx];
      const documents = batch.map((story) => 
        new Document({
          pageContent: story.fullContent,
          metadata: {
            key: story.key,
            ...story.metadata,
            processedAt: new Date().toISOString(),
          }
        })
      );

      try {
        await this.vectorStore.addDocuments(documents);
        console.log(`✓ Batch ${idx + 1}/${batches.length} completed (${batch.length} stories)`);
        successCount += batch.length;
      } catch (error) {
        console.error(`✗ Batch ${idx + 1} failed:`, error instanceof Error ? error.message : String(error));
        failureCount++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n✓ Batch processing complete:`);
    console.log(`  - Successful: ${successCount} stories`);
    console.log(`  - Failed: ${failureCount} batches`);
    console.log(`  - Duration: ${duration}ms`);

    if (failureCount > 0) {
      throw new Error(`${failureCount} batch(es) failed during processing`);
    }
  }

  /**
   * Semantic search across stories using vector similarity
   */
  async searchStories(query: string, topK: number = 6): Promise<Document[]> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized. Call initialize() first.");
    }

    try {
      const results = await this.vectorStore.similaritySearch(query, topK);
      return results;
    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Semantic search with relevance scores
   */
  async searchWithScores(query: string, topK: number = 6): Promise<Array<[Document, number]>> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized. Call initialize() first.");
    }

    try {
      const results = await this.vectorStore.similaritySearchWithScore(query, topK);
      return results;
    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clear all documents from the collection
   */
  async clearCollection(): Promise<void> {
    try {
      const collection = this.client
        .db(this.config.dbName)
        .collection(this.config.collectionName);
      
      const result = await collection.deleteMany({});
      console.log(`Cleared ${result.deletedCount} documents from collection`);
    } catch (error) {
      throw new Error(`Failed to clear collection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Close the MongoDB connection
   */
  async close(): Promise<void> {
    await this.client.close();
    console.log("MongoDB connection closed");
  }
}

