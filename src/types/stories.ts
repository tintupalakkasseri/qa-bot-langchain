import { z } from "zod";

/**
 * Story ingestion request schema
 */
export const StoryIngestionSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
  clearExisting: z.boolean().optional().default(false)
});

export type StoryIngestionRequest = z.infer<typeof StoryIngestionSchema>;

/**
 * Story ingestion response
 */
export interface StoryIngestionResponse {
  success: number;
  failed: number;
  errors: string[];
  message: string;
  duration?: number;
}

/**
 * Story search request schema
 */
export const StorySearchSchema = z.object({
  newUserStory: z.string().min(1, "User story text is required"),
  topK: z.number().int().positive().optional().default(6)
});

export type StorySearchRequest = z.infer<typeof StorySearchSchema>;

/**
 * Related story in search results
 */
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

/**
 * Story search response
 */
export interface StorySearchResponse {
  rewrittenStory: string;
  relatedStories: RelatedStory[];
  qualityScore: number;
  searchQuery: string;
  duration: number;
}

