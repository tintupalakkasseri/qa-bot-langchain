import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";

export interface UserStory {
  key?: string;
  storyId?: string;
  summary?: string;
  description?: string;
  text?: string;
  parentSummary?: string;
  acceptanceCriteria?: string;
  projectName?: string;
  project?: string;
  epic?: string;
  status?: { name: string; category: string } | string;
  priority?: { name: string; id: string } | string;
  [key: string]: any; // Allow additional fields
}

/**
 * Parse CSV file and extract user stories
 */
export async function parseStoryFile(filePath: string): Promise<UserStory[]> {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === ".csv") {
    const content = await fs.readFile(filePath, "utf-8");
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    return records.map((record: any, index: number) => ({
      ...record,
      originalRowIndex: index + 1,
      sourceType: "csv",
      importedAt: new Date().toISOString(),
    })) as UserStory[];
  } else if (ext === ".json") {
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);
    
    // Handle both array and single object
    const stories = Array.isArray(data) ? data : [data];
    
    return stories.map((story: any, index: number) => ({
      ...story,
      originalRowIndex: index + 1,
      sourceType: "json",
      importedAt: new Date().toISOString(),
    })) as UserStory[];
  }
  
  throw new Error(`Unsupported file type: ${ext}. Only CSV and JSON are supported.`);
}

/**
 * Create full content text from user story for embedding
 * Based on parser pattern: {storyId},{text},{summary},{parentSummary},{acceptanceCriteria},{projectName}
 */
export function createStoryContent(story: UserStory): string {
  const parts: string[] = [];
  
  // Use storyId or key
  const storyId = story.storyId || story.key;
  if (storyId) parts.push(`Story ID: ${storyId}`);
  
  // Use text or description
  const text = story.text || story.description;
  if (text) parts.push(`Text: ${text}`);
  
  if (story.summary) parts.push(`Summary: ${story.summary}`);
  if (story.parentSummary) parts.push(`Parent Summary: ${story.parentSummary}`);
  if (story.acceptanceCriteria) parts.push(`Acceptance Criteria: ${story.acceptanceCriteria}`);
  
  // Use projectName or project
  const projectName = story.projectName || story.project;
  if (projectName) parts.push(`Project: ${projectName}`);
  
  if (story.epic) parts.push(`Epic: ${story.epic}`);
  
  return parts.join(". ");
}

/**
 * Format stories for prompt template
 * Based on parser pattern: {storyId},{text},{summary},{parentSummary},{acceptanceCriteria},{projectName}
 */
export function formatStoriesForPrompt(stories: Array<{ story: UserStory; score: number }>): string {
  return stories
    .map((item, index) => {
      const s = item.story;
      const storyId = s.storyId || s.key || `Story ${index + 1}`;
      const text = s.text || s.description || "";
      const summary = s.summary || "";
      const parentSummary = s.parentSummary || "";
      const acceptanceCriteria = s.acceptanceCriteria || "";
      const projectName = s.projectName || s.project || "";
      
      return `${index + 1}. Story ID: ${storyId}\n   Text: ${text}\n   Summary: ${summary}\n   Parent Summary: ${parentSummary}\n   Acceptance Criteria: ${acceptanceCriteria}\n   Project: ${projectName}\n   Relevance Score: ${(item.score * 100).toFixed(1)}%`;
    })
    .join("\n\n");
}

