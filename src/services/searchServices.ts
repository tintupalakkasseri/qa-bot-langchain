/**
 * Search Services
 * BM25, Hybrid, and Reranking search implementations
 */

import { MongoClient } from "mongodb";
import { config } from "../config/index.js";
import { validateDbCollectionIndex, calculateTextSimilarity } from "../utils/mongodb.js";
// Note: Vector search uses StoryVectorStore directly for LangChain integration

export interface SearchFilters {
  project?: string;
  epic?: string;
  priority?: string;
  status?: string;
  [key: string]: any;
}

export interface BM25SearchResult {
  success: boolean;
  searchType: string;
  query: string;
  filters: SearchFilters;
  results: any[];
  count: number;
  searchTime: number;
  timestamp: string;
}

export interface HybridSearchResult extends BM25SearchResult {
  weights: { bm25: number; vector: number };
  stats: {
    foundInBoth: number;
    foundInBm25Only: number;
    foundInVectorOnly: number;
    bm25ResultCount: number;
    vectorResultCount: number;
  };
  timing: {
    bm25Time: number;
    vectorTime: number;
    totalTime: number;
  };
  cost?: number;
  tokens?: number;
}

export interface RerankSearchResult extends HybridSearchResult {
  fusionMethod: string;
  beforeReranking: any[];
  afterReranking: any[];
  reranked: boolean;
  totalCandidates: number;
  stats: {
    foundInBoth: number;
    foundInBm25Only: number;
    foundInVectorOnly: number;
    bm25ResultCount: number;
    vectorResultCount: number;
    avgRankChange: number;
  };
}

/**
 * BM25 Search
 */
export async function bm25Search(
  query: string,
  limit: number = 10,
  filters: SearchFilters = {},
  fields: string[] = ['key', 'summary', 'description', 'text', 'acceptanceCriteria', 'project']
): Promise<BM25SearchResult> {
  const startTime = Date.now();
  const mongoClient = new MongoClient(config.mongodb.uri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
  });

  try {
    await mongoClient.connect();

    const validation = await validateDbCollectionIndex(
      mongoClient,
      config.mongodb.dbName,
      config.mongodb.collection,
      config.mongodb.bm25IndexName,
      true
    );

    if (!validation.ok) {
      throw new Error(validation.error);
    }

    const db = mongoClient.db(config.mongodb.dbName);
    const collection = db.collection(config.mongodb.collection);

    // Build BM25 search pipeline
    const pipeline: any[] = [
      {
        $search: {
          index: config.mongodb.bm25IndexName,
          text: {
            query: query,
            path: fields,
            fuzzy: {
              maxEdits: 1,
              prefixLength: 2
            }
          }
        }
      },
      {
        $addFields: {
          score: { $meta: "searchScore" }
        }
      }
    ];

    // Apply filters if provided
    if (Object.keys(filters).length > 0) {
      const matchConditions: any = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          matchConditions[key] = value;
        }
      });

      if (Object.keys(matchConditions).length > 0) {
        pipeline.push({ $match: matchConditions });
      }
    }

    // Add projection and limit
    pipeline.push(
      {
        $project: {
          key: 1,
          storyId: 1,
          summary: 1,
          description: 1,
          text: 1,
          project: 1,
          epic: 1,
          priority: 1,
          status: 1,
          acceptanceCriteria: 1,
          score: 1
        }
      },
      { $limit: parseInt(String(limit)) }
    );

    const results = await collection.aggregate(pipeline).toArray();
    const searchTime = Date.now() - startTime;

    await mongoClient.close();

    return {
      success: true,
      searchType: 'bm25',
      query,
      filters,
      results,
      count: results.length,
      searchTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    await mongoClient.close();
    throw error;
  }
}

/**
 * Hybrid Search (BM25 + Vector)
 */
export async function hybridSearch(
  query: string,
  limit: number = 10,
  filters: SearchFilters = {},
  bm25Weight: number = 0.5,
  vectorWeight: number = 0.5,
  bm25Fields: string[] = ['key', 'summary', 'description', 'text', 'acceptanceCriteria', 'project']
): Promise<HybridSearchResult> {
  const bm25StartTime = Date.now();
  const mongoClient = new MongoClient(config.mongodb.uri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
  });

  try {
    await mongoClient.connect();

    // Validate both indexes
    const bm25Validation = await validateDbCollectionIndex(
      mongoClient,
      config.mongodb.dbName,
      config.mongodb.collection,
      config.mongodb.bm25IndexName,
      true
    );

    const vectorValidation = await validateDbCollectionIndex(
      mongoClient,
      config.mongodb.dbName,
      config.mongodb.collection,
      config.mongodb.vectorIndexName,
      true
    );

    if (!bm25Validation.ok) {
      throw new Error(`BM25 Index: ${bm25Validation.error}`);
    }

    if (!vectorValidation.ok) {
      throw new Error(`Vector Index: ${vectorValidation.error}`);
    }

    const db = mongoClient.db(config.mongodb.dbName);
    const collection = db.collection(config.mongodb.collection);
    const searchLimit = parseInt(String(limit)) * 3; // Get more for better combination

    // 1. BM25 Search
    const bm25Pipeline: any[] = [
      {
        $search: {
          index: config.mongodb.bm25IndexName,
          text: {
            query: query,
            path: bm25Fields,
            fuzzy: {
              maxEdits: 1,
              prefixLength: 2
            }
          }
        }
      },
      {
        $addFields: {
          bm25Score: { $meta: "searchScore" }
        }
      },
      {
        $project: {
          _id: 1,
          key: 1,
          storyId: 1,
          summary: 1,
          description: 1,
          text: 1,
          project: 1,
          epic: 1,
          priority: 1,
          status: 1,
          acceptanceCriteria: 1,
          bm25Score: 1
        }
      },
      { $limit: searchLimit }
    ];

    const bm25Results = await collection.aggregate(bm25Pipeline).toArray();
    const bm25Time = Date.now() - bm25StartTime;

    // 2. Vector Search
    const vectorStartTime = Date.now();
    
    // Use StoryVectorStore for vector search (LangChain way)
    const { StoryVectorStore } = await import("../lib/vectorstore/index.js");
    const vectorStore = new StoryVectorStore({
      mongoUri: config.mongodb.uri,
      dbName: config.mongodb.dbName,
      collectionName: config.mongodb.collection,
      indexName: config.mongodb.vectorIndexName,
      embeddingProvider: config.embeddings.provider,
      embeddingModel: config.embeddings.model,
      apiKey: config.mistral.apiKey
    });
    
    await vectorStore.initialize();
    const vectorSearchResults = await vectorStore.searchWithScores(query, searchLimit);

    // Fetch full documents for vector search results
    const vectorResults: any[] = [];
    for (const [doc, score] of vectorSearchResults) {
      const storyKey = doc.metadata.key || doc.metadata.storyId || 'unknown';
      const storyDoc = await collection.findOne({ 
        $or: [
          { key: storyKey },
          { storyId: storyKey }
        ]
      });
      
      if (storyDoc) {
        vectorResults.push({
          ...storyDoc,
          vectorScore: Math.max(0, Math.min(1, score))
        });
      }
    }
    
    await vectorStore.close();
    const vectorTime = Date.now() - vectorStartTime;

    // 3. Normalize and combine scores
    const bm25Scores = bm25Results.map(r => r.bm25Score);
    const bm25Max = Math.max(...bm25Scores, 1);
    const bm25Min = Math.min(...bm25Scores, 0);
    const bm25Range = bm25Max - bm25Min || 1;

    const vectorScores = vectorResults.map(r => r.vectorScore);
    const vectorMax = Math.max(...vectorScores, 1);
    const vectorMin = Math.min(...vectorScores, 0);
    const vectorRange = vectorMax - vectorMin || 1;

    // Create result map
    const resultMap = new Map();

    // Add BM25 results
    bm25Results.forEach(result => {
      const key = result._id.toString();
      const normalizedScore = (result.bm25Score - bm25Min) / bm25Range;
      resultMap.set(key, {
        ...result,
        bm25ScoreNormalized: normalizedScore,
        vectorScore: 0,
        vectorScoreNormalized: 0,
        hybridScore: normalizedScore * bm25Weight,
        foundIn: 'bm25'
      });
    });

    // Add/merge vector results
    vectorResults.forEach(result => {
      const key = result._id.toString();
      const normalizedScore = (result.vectorScore - vectorMin) / vectorRange;
      
      if (resultMap.has(key)) {
        const existing = resultMap.get(key);
        existing.vectorScore = result.vectorScore;
        existing.vectorScoreNormalized = normalizedScore;
        existing.hybridScore += normalizedScore * vectorWeight;
        existing.foundIn = 'both';
      } else {
        resultMap.set(key, {
          ...result,
          bm25Score: 0,
          bm25ScoreNormalized: 0,
          vectorScoreNormalized: normalizedScore,
          hybridScore: normalizedScore * vectorWeight,
          foundIn: 'vector'
        });
      }
    });

    // Convert to array and sort
    let combinedResults = Array.from(resultMap.values());
    combinedResults.sort((a, b) => b.hybridScore - a.hybridScore);

    // Apply filters
    if (Object.keys(filters).length > 0) {
      combinedResults = combinedResults.filter(result => {
        return Object.entries(filters).every(([key, value]) => {
          if (!value || value === '') return true;
          return result[key] === value;
        });
      });
    }

    // Limit results
    const finalResults = combinedResults.slice(0, parseInt(String(limit)));
    const totalTime = Date.now() - bm25StartTime;

    await mongoClient.close();

    const bothCount = finalResults.filter(r => r.foundIn === 'both').length;
    const bm25OnlyCount = finalResults.filter(r => r.foundIn === 'bm25').length;
    const vectorOnlyCount = finalResults.filter(r => r.foundIn === 'vector').length;

    return {
      success: true,
      searchType: 'hybrid',
      query,
      filters,
      weights: { bm25: bm25Weight, vector: vectorWeight },
      results: finalResults,
      count: finalResults.length,
      stats: {
        foundInBoth: bothCount,
        foundInBm25Only: bm25OnlyCount,
        foundInVectorOnly: vectorOnlyCount,
        bm25ResultCount: bm25Results.length,
        vectorResultCount: vectorResults.length
      },
      timing: {
        bm25Time,
        vectorTime,
        totalTime
      },
      searchTime: totalTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    await mongoClient.close();
    throw error;
  }
}

/**
 * Reranking Search with Score Fusion
 */
export async function rerankSearch(
  query: string,
  limit: number = 10,
  filters: SearchFilters = {},
  fusionMethod: 'rrf' | 'weighted' | 'reciprocal' = 'rrf',
  rerankTopK: number = 50,
  bm25Weight: number = 0.4,
  vectorWeight: number = 0.6
): Promise<RerankSearchResult> {
  const startTime = Date.now();
  const mongoClient = new MongoClient(config.mongodb.uri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
  });

  try {
    await mongoClient.connect();

    const db = mongoClient.db(config.mongodb.dbName);
    const collection = db.collection(config.mongodb.collection);

    // Use StoryVectorStore for vector search
    const { StoryVectorStore } = await import("../lib/vectorstore/index.js");
    const vectorStore = new StoryVectorStore({
      mongoUri: config.mongodb.uri,
      dbName: config.mongodb.dbName,
      collectionName: config.mongodb.collection,
      indexName: config.mongodb.vectorIndexName,
      embeddingProvider: config.embeddings.provider,
      embeddingModel: config.embeddings.model,
      apiKey: config.mistral.apiKey
    });
    
    await vectorStore.initialize();
    const vectorSearchResults = await vectorStore.searchWithScores(query, rerankTopK);

    // BM25 Pipeline with field weights
    const weights: Record<string, number> = {
      key: 10.0,
      summary: 8.0,
      project: 5.0,
      description: 2.0,
      acceptanceCriteria: 1.5,
      text: 1.0
    };

    const searchFields = Object.entries(weights).map(([field, weight]) => ({
      text: {
        query: query,
        path: field,
        fuzzy: { maxEdits: 1, prefixLength: 2 },
        score: { boost: { value: weight } }
      }
    }));

    const bm25Pipeline: any[] = [
      {
        $search: {
          index: config.mongodb.bm25IndexName,
          compound: {
            should: searchFields,
            minimumShouldMatch: 1
          }
        }
      },
      {
        $addFields: {
          bm25Score: { $meta: "searchScore" }
        }
      },
      { $limit: rerankTopK }
    ];

    if (Object.keys(filters).length > 0) {
      bm25Pipeline.push({ $match: filters });
    }

    // Fetch full documents for vector search results
    const vectorResults: any[] = [];
    for (const [doc, score] of vectorSearchResults) {
      const storyKey = doc.metadata.key || doc.metadata.storyId || 'unknown';
      const storyDoc = await collection.findOne({ 
        $or: [
          { key: storyKey },
          { storyId: storyKey }
        ]
      });
      
      if (storyDoc) {
        // Apply filters if provided
        let passesFilter = true;
        if (Object.keys(filters).length > 0) {
          passesFilter = Object.entries(filters).every(([key, value]) => {
            if (!value || value === '') return true;
            return storyDoc[key] === value;
          });
        }
        
        if (passesFilter) {
          vectorResults.push({
            ...storyDoc,
            vectorScore: Math.max(0, Math.min(1, score))
          });
        }
      }
    }
    
    await vectorStore.close();

    // Execute BM25 search
    const bm25Results = await collection.aggregate(bm25Pipeline).toArray();

    // Score Fusion
    const resultMap = new Map();

    // Normalize scores
    const normalizeBM25 = (score: number, minScore: number, maxScore: number) => {
      if (maxScore === minScore) return 1.0;
      return (score - minScore) / (maxScore - minScore);
    };

    const normalizeVector = (score: number, minScore: number, maxScore: number) => {
      if (maxScore === minScore) return 1.0;
      return (score - minScore) / (maxScore - minScore);
    };

    const bm25Scores = bm25Results.map(r => r.bm25Score);
    const vectorScores = vectorResults.map(r => r.vectorScore);
    const minBM25 = Math.min(...bm25Scores, 0);
    const maxBM25 = Math.max(...bm25Scores, 1);
    const minVector = Math.min(...vectorScores, 0);
    const maxVector = Math.max(...vectorScores, 1);

    // Process BM25 results
    bm25Results.forEach((doc, index) => {
      const id = doc._id.toString();
      const normalizedScore = normalizeBM25(doc.bm25Score, minBM25, maxBM25);
      
      resultMap.set(id, {
        ...doc,
        bm25Score: doc.bm25Score,
        bm25Normalized: normalizedScore,
        bm25Rank: index + 1,
        vectorScore: 0,
        vectorNormalized: 0,
        vectorRank: null,
        foundIn: 'bm25'
      });
    });

    // Process Vector results and merge
    vectorResults.forEach((doc, index) => {
      const id = doc._id.toString();
      const normalizedScore = normalizeVector(doc.vectorScore, minVector, maxVector);
      
      if (resultMap.has(id)) {
        const existing = resultMap.get(id);
        existing.vectorScore = doc.vectorScore;
        existing.vectorNormalized = normalizedScore;
        existing.vectorRank = index + 1;
        existing.foundIn = 'both';
      } else {
        resultMap.set(id, {
          ...doc,
          bm25Score: 0,
          bm25Normalized: 0,
          bm25Rank: null,
          vectorScore: doc.vectorScore,
          vectorNormalized: normalizedScore,
          vectorRank: index + 1,
          foundIn: 'vector'
        });
      }
    });

    const allResults = Array.from(resultMap.values());

    // Apply fusion method
    let fusedResults: any[] = [];

    if (fusionMethod === 'rrf') {
      const k = 60; // RRF constant
      fusedResults = allResults.map(doc => {
        const bm25RRF = doc.bm25Rank ? 1 / (k + doc.bm25Rank) : 0;
        const vectorRRF = doc.vectorRank ? 1 / (k + doc.vectorRank) : 0;
        const fusedScore = bm25RRF + vectorRRF;
        
        return {
          ...doc,
          fusedScore,
          fusionComponents: {
            bm25RRF: bm25RRF.toFixed(4),
            vectorRRF: vectorRRF.toFixed(4)
          }
        };
      });
    } else if (fusionMethod === 'weighted') {
      fusedResults = allResults.map(doc => {
        const fusedScore = (doc.bm25Normalized * bm25Weight) + (doc.vectorNormalized * vectorWeight);
        
        return {
          ...doc,
          fusedScore,
          fusionComponents: {
            bm25Contribution: (doc.bm25Normalized * bm25Weight).toFixed(4),
            vectorContribution: (doc.vectorNormalized * vectorWeight).toFixed(4)
          }
        };
      });
    } else if (fusionMethod === 'reciprocal') {
      fusedResults = allResults.map(doc => {
        const bm25Reciprocal = doc.bm25Rank ? (1 / doc.bm25Rank) * bm25Weight : 0;
        const vectorReciprocal = doc.vectorRank ? (1 / doc.vectorRank) * vectorWeight : 0;
        const fusedScore = bm25Reciprocal + vectorReciprocal;
        
        return {
          ...doc,
          fusedScore,
          fusionComponents: {
            bm25Reciprocal: bm25Reciprocal.toFixed(4),
            vectorReciprocal: vectorReciprocal.toFixed(4)
          }
        };
      });
    }

    // Sort by fused score
    fusedResults.sort((a, b) => b.fusedScore - a.fusedScore);

    // Add ranking information
    fusedResults.forEach((doc, index) => {
      doc.newRank = index + 1;
      doc.originalRank = doc.bm25Rank || doc.vectorRank || index + 1;
      doc.rankChange = doc.originalRank - doc.newRank;
    });

    const afterResults = fusedResults.slice(0, parseInt(String(limit)));
    const totalTime = Date.now() - startTime;

    await mongoClient.close();

    const bothCount = fusedResults.filter(r => r.foundIn === 'both').length;
    const bm25OnlyCount = fusedResults.filter(r => r.foundIn === 'bm25').length;
    const vectorOnlyCount = fusedResults.filter(r => r.foundIn === 'vector').length;
    const avgRankChange = fusedResults.length > 0
      ? fusedResults.reduce((sum, r) => sum + r.rankChange, 0) / fusedResults.length
      : 0;

    return {
      success: true,
      searchType: 'rerank',
      fusionMethod,
      query,
      filters,
      weights: { bm25: bm25Weight, vector: vectorWeight },
      results: afterResults,
      beforeReranking: (fusionMethod === 'rrf' ? vectorResults : bm25Results).slice(0, limit),
      afterReranking: afterResults,
      reranked: true,
      count: afterResults.length,
      totalCandidates: fusedResults.length,
      stats: {
        foundInBoth: bothCount,
        foundInBm25Only: bm25OnlyCount,
        foundInVectorOnly: vectorOnlyCount,
        bm25ResultCount: bm25Results.length,
        vectorResultCount: vectorResults.length,
        avgRankChange
      },
      timing: {
        bm25Time: 0,
        vectorTime: 0,
        totalTime
      },
      searchTime: totalTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    await mongoClient.close();
    throw error;
  }
}

