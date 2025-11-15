/**
 * MongoDB Utility Functions
 * Validation and helper functions for MongoDB operations
 */

import { MongoClient } from "mongodb";
import { config } from "../config/index.js";

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Validate database, collection, and index existence
 */
export async function validateDbCollectionIndex(
  client: MongoClient,
  dbName: string,
  collectionName: string,
  indexName: string,
  requireDocuments: boolean = false
): Promise<ValidationResult> {
  try {
    // Check database
    const adminDb = client.db().admin();
    const dbList = await adminDb.listDatabases();
    const dbExists = dbList.databases.some(db => db.name === dbName);

    if (!dbExists) {
      return {
        ok: false,
        error: `Database "${dbName}" does not exist`
      };
    }

    const db = client.db(dbName);

    // Check collection
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      return {
        ok: false,
        error: `Collection "${collectionName}" does not exist in database "${dbName}"`
      };
    }

    const collection = db.collection(collectionName);

    // Check if documents exist
    if (requireDocuments) {
      const count = await collection.countDocuments();
      if (count === 0) {
        return {
          ok: false,
          error: `Collection "${collectionName}" is empty. Please create embeddings first.`
        };
      }
    }

    // Check index (try to list indexes)
    // Note: Atlas Search indexes are NOT regular MongoDB indexes and won't appear in collection.indexes()
    // For Atlas Search indexes, we skip the check and let the actual search operation validate it
    try {
      const indexes = await collection.indexes();
      const indexExists = indexes.some(idx => idx.name === indexName);

      if (!indexExists) {
        // For Atlas Search indexes, we can't verify them via standard index listing
        // They are managed separately. We'll skip the check and let the search operation handle it
        console.log(`Note: Index "${indexName}" not found in standard indexes. If this is an Atlas Search index, this is expected.`);
        // Don't return error - let the actual search operation validate the index
        // return {
        //   ok: false,
        //   error: `Index "${indexName}" does not exist on collection "${collectionName}". Please create the index first.`
        // };
      }
    } catch (indexError) {
      // If we can't check indexes, assume it exists (might be a permissions issue or Atlas Search index)
      console.warn(`Could not verify index "${indexName}":`, indexError);
      console.log(`Note: If "${indexName}" is an Atlas Search index, this is expected.`);
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: `Validation error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Get distinct values for metadata filtering
 */
export async function getDistinctMetadata(
  client: MongoClient,
  dbName: string,
  collectionName: string
): Promise<{
  projects?: string[];
  epics?: string[];
  priorities?: string[];
  statuses?: string[];
}> {
  try {
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const [projects, epics, priorities, statuses] = await Promise.all([
      collection.distinct("project").catch(() => []),
      collection.distinct("epic").catch(() => []),
      collection.distinct("priority").catch(() => []),
      collection.distinct("status").catch(() => [])
    ]);

    return {
      projects: projects.filter(Boolean).sort(),
      epics: epics.filter(Boolean).sort(),
      priorities: priorities.filter(Boolean).sort(),
      statuses: statuses.filter(Boolean).sort()
    };
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return {};
  }
}

/**
 * Calculate text similarity (Jaccard similarity)
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;

  const set1 = new Set(text1.toLowerCase().split(/\s+/));
  const set2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

