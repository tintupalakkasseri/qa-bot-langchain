import { MongoClient } from "mongodb";
import { StoryVectorStore } from "../lib/vectorstore/index.js";
import { config } from "../config/index.js";
import { parseStoryFile, createStoryContent, type UserStory } from "../utils/fileParser.js";

/**
 * Ingest user stories from file to MongoDB with vector embeddings
 */
export async function ingestStories(
  filePath: string,
  clearExisting: boolean = false
): Promise<{ success: number; failed: number; errors: string[] }> {
  console.log("🚀 Starting story ingestion pipeline\n");
  
  // Validate configuration
  if (!config.mongodb.uri) {
    throw new Error("MONGODB_URI is not set in .env file");
  }
  
  const embeddingProvider = config.embeddings.provider;
  const apiKey = config.mistral.apiKey;
  
  if (!apiKey) {
    throw new Error(`MISTRAL_API_KEY is required for generating embeddings`);
  }
  
  console.log(`📊 Configuration:`);
  console.log(`  - Database: ${config.mongodb.dbName}.${config.mongodb.collection}`);
  console.log(`  - Embedding Provider: ${embeddingProvider}`);
  console.log(`  - Embedding Model: ${config.embeddings.model}`);
  console.log(`  - Dimension: ${config.embeddings.dimension}`);
  console.log();
  
  // Parse stories from file
  console.log(`📂 Parsing stories from: ${filePath}`);
  const stories = await parseStoryFile(filePath);
  console.log(`✓ Found ${stories.length} story/stories\n`);
  
  if (stories.length === 0) {
    throw new Error("No stories found in file");
  }
  
  // Initialize vector store
  const vectorStore = new StoryVectorStore({
    mongoUri: config.mongodb.uri,
    dbName: config.mongodb.dbName,
    collectionName: config.mongodb.collection,
    indexName: config.mongodb.vectorIndexName,
    embeddingProvider: embeddingProvider,
    embeddingModel: config.embeddings.model,
    apiKey: apiKey
  });
  
  const mongoClient = new MongoClient(config.mongodb.uri);
  
  try {
    await vectorStore.initialize();
    await mongoClient.connect();
    
    // Clear existing data if requested
    if (clearExisting) {
      console.log("🗑️  Clearing existing stories...");
      await vectorStore.clearCollection();
      const db = mongoClient.db(config.mongodb.dbName);
      const collection = db.collection(config.mongodb.collection);
      await collection.deleteMany({});
      console.log();
    }
    
    // Convert stories to documents with full content
    const storyDocuments = stories.map((story) => {
      const fullContent = createStoryContent(story);
      const storyKey = story.storyId || story.key || `story_${stories.indexOf(story)}`;
      
      return {
        key: storyKey,
        fullContent: fullContent,
        metadata: {
          ...story,
          fullContent: fullContent,
          embeddingGenerated: true,
          ingestedAt: new Date().toISOString(),
        }
      };
    });
    
    console.log(`🔄 Generating embeddings and storing ${storyDocuments.length} story/stories...`);
    const batchSize = config.ingestion.batchSize || 10;
    await vectorStore.addStoriesBatch(storyDocuments, batchSize);
    console.log();
    
    // Also store full story objects in MongoDB for retrieval
    const db = mongoClient.db(config.mongodb.dbName);
    const collection = db.collection(config.mongodb.collection);
    
    // Insert stories with metadata
    const storiesToInsert = stories.map((story) => ({
      ...story,
      key: story.storyId || story.key || `story_${stories.indexOf(story)}`,
      fullContent: createStoryContent(story),
      embeddingGenerated: true,
      ingestedAt: new Date().toISOString(),
    }));
    
    await collection.insertMany(storiesToInsert);
    
    console.log("=" .repeat(60));
    console.log("✅ INGESTION COMPLETE");
    console.log("=" .repeat(60));
    console.log(`📊 Statistics:`);
    console.log(`  - Total stories: ${stories.length}`);
    console.log(`  - Successful: ${stories.length}`);
    console.log(`  - Embeddings generated: ${stories.length}`);
    console.log();
    
    return {
      success: stories.length,
      failed: 0,
      errors: []
    };
    
  } catch (error) {
    console.error("❌ Ingestion failed:", error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await vectorStore.close();
    await mongoClient.close();
  }
}

