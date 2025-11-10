import { MongoClient } from "mongodb";
import { StoryVectorStore } from "../lib/vectorstore/index.js";
import { createChatModel } from "../lib/models/index.js";
import { config } from "../config/index.js";
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { formatStoriesForPrompt, type UserStory } from "../utils/fileParser.js";

export interface RelatedStory {
  key: string;
  storyId?: string;
  summary?: string;
  description?: string;
  text?: string;
  project?: string;
  epic?: string;
  acceptanceCriteria?: string;
  score: number;
  content: string;
}

export interface StorySearchResult {
  rewrittenStory: string;
  relatedStories: RelatedStory[];
  qualityScore: number;
  searchQuery: string;
}

/**
 * Search for related stories using vector search and rewrite the new story
 */
export async function searchAndRewriteStory(
  newUserStory: string,
  topK: number = 6
): Promise<StorySearchResult> {
  console.log("🔍 Starting story search and rewrite\n");
  
  // Validate configuration
  if (!config.mongodb.uri) {
    throw new Error("MONGODB_URI is not set in .env file");
  }
  
  const embeddingProvider = config.embeddings.provider;
  const apiKey = config.mistral.apiKey;
  
  if (!apiKey) {
    throw new Error(`MISTRAL_API_KEY is required`);
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
    
    const db = mongoClient.db(config.mongodb.dbName);
    const collection = db.collection(config.mongodb.collection);
    
    // Perform vector search
    console.log(`🔎 Searching for related stories (topK: ${topK})...`);
    const searchResults = await vectorStore.searchWithScores(newUserStory, topK);
    
    console.log(`✓ Found ${searchResults.length} related stories\n`);
    
    // Fetch full story documents from MongoDB
    const relatedStories: RelatedStory[] = [];
    
    for (const [doc, score] of searchResults) {
      const storyKey = doc.metadata.key || doc.metadata.storyId || doc.metadata.fileName?.replace(".json", "") || "unknown";
      
      // Find the full story document
      const storyDoc = await collection.findOne({ 
        $or: [
          { key: storyKey },
          { storyId: storyKey },
          { _id: storyKey }
        ]
      });
      
      if (storyDoc) {
        relatedStories.push({
          key: storyDoc.key || storyDoc.storyId || storyKey,
          storyId: storyDoc.storyId || storyDoc.key,
          summary: storyDoc.summary || "",
          description: storyDoc.description || storyDoc.text || "",
          text: storyDoc.text || storyDoc.description || "",
          project: storyDoc.projectName || storyDoc.project,
          epic: storyDoc.epic,
          acceptanceCriteria: storyDoc.acceptanceCriteria,
          score: Math.max(0, Math.min(1, score)), // Normalize score to 0-1
          content: doc.pageContent || ""
        });
      } else {
        // Fallback to document content if story not found
        relatedStories.push({
          key: storyKey,
          summary: doc.metadata.summary || "",
          description: doc.pageContent.substring(0, 200) || "",
          text: doc.pageContent || "",
          score: Math.max(0, Math.min(1, score)),
          content: doc.pageContent || ""
        });
      }
    }
    
    // Format related stories for prompt (using parser pattern format)
    const formattedStories = formatStoriesForPrompt(
      relatedStories.map(rs => ({ story: rs as UserStory, score: rs.score }))
    );
    
    // Create prompt for rewriting (matching Langflow prompt template)
    const systemPrompt = `You are an expert Agile QA assistant trained to analyze and enhance new user stories by finding all related userstories.

-Given the following new user story: 
{newUserstory} 

-Perform the following tasks:
1. **Normalize the Story**  
   - Convert the story into a clean, structured format using standard Agile syntax (e.g., "As a [role], I want to [action], so that [benefit]").
2. **Refine the User Story**  
   - Rewrite the story with improved wording, clarity, and structure while preserving its original intent.

-Refer the following related user stories:
{userStories} 

The above userstories are fetched from the user story repository, perform the following tasks on the above listed user stories:
1. **Score the Related Stories**  
   - Rank them by relevance to the new user story.

3. **Evaluate User Story Search Quality**  
   - Assign a quality score (0–100) based on the relevancy between the inputted new user story

Outputs:
The re written new user story.
A table with a one line summary of each related user story and it's score.`;

    const system = SystemMessagePromptTemplate.fromTemplate(systemPrompt);
    const human = HumanMessagePromptTemplate.fromTemplate(
      "New User Story:\n{newUserstory}\n\nRelated Stories:\n{userStories}"
    );
    const prompt = ChatPromptTemplate.fromMessages([system, human]);
    
    // Create LLM chain
    const model = createChatModel();
    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    
    console.log("🤖 Rewriting story with LLM...");
    const rewrittenStory = await chain.invoke({
      newUserstory: newUserStory,
      userStories: formattedStories
    });
    
    // Calculate quality score based on average relevance
    const avgScore = relatedStories.length > 0
      ? relatedStories.reduce((sum, s) => sum + s.score, 0) / relatedStories.length
      : 0;
    const qualityScore = Math.round(avgScore * 100);
    
    console.log(`✓ Story rewritten (Quality Score: ${qualityScore})\n`);
    
    return {
      rewrittenStory,
      relatedStories,
      qualityScore,
      searchQuery: newUserStory
    };
    
  } catch (error) {
    console.error("❌ Search and rewrite failed:", error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await vectorStore.close();
    await mongoClient.close();
  }
}

