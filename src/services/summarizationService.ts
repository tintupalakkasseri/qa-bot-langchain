/**
 * Summarization and Deduplication Services
 * Using LangChain for AI-powered summarization
 */

import { createChatModel } from "../lib/models/index.js";
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { calculateTextSimilarity } from "../utils/mongodb.js";

export interface DeduplicationResult {
  original: any[];
  deduplicated: any[];
  duplicates: any[];
  stats: {
    originalCount: number;
    deduplicatedCount: number;
    duplicatesRemoved: number;
    reductionPercentage: string;
  };
}

/**
 * Deduplicate results based on similarity
 */
export function deduplicateResults(
  results: any[],
  threshold: number = 0.85
): DeduplicationResult {
  const deduplicated: any[] = [];
  const duplicates: any[] = [];
  const seenTitles = new Map<string, any>();

  for (const result of results) {
    const title = (result.summary || result.description || result.text || '').toLowerCase();
    const key = result.key || result.storyId || '';

    // Check for exact title match
    let isDuplicate = false;
    
    for (const [seenTitle, seenResult] of seenTitles.entries()) {
      // Calculate similarity (Jaccard similarity)
      const similarity = calculateTextSimilarity(title, seenTitle);
      
      if (similarity >= threshold) {
        isDuplicate = true;
        duplicates.push({
          ...result,
          duplicateOf: seenResult.key || seenResult.storyId,
          similarity: similarity.toFixed(3)
        });
        break;
      }
    }

    if (!isDuplicate) {
      deduplicated.push(result);
      seenTitles.set(title, result);
    }
  }

  return {
    original: results,
    deduplicated,
    duplicates,
    stats: {
      originalCount: results.length,
      deduplicatedCount: deduplicated.length,
      duplicatesRemoved: duplicates.length,
      reductionPercentage: results.length > 0
        ? ((duplicates.length / results.length) * 100).toFixed(1)
        : '0.0'
    }
  };
}

/**
 * Summarize search results using LLM
 */
export async function summarizeResults(
  results: any[],
  summaryType: 'concise' | 'detailed' = 'concise'
): Promise<{
  summary: string;
  tokens?: { prompt: number; completion: number; total: number };
  cost?: number;
}> {
  if (results.length === 0) {
    return {
      summary: 'No results to summarize',
      tokens: { prompt: 0, completion: 0, total: 0 },
      cost: 0
    };
  }

  // Prepare concise content for summarization
  const resultsText = results.map((r, idx) => {
    const key = r.key || r.storyId || 'N/A';
    const summary = r.summary || 'No summary';
    const project = r.project || 'Unknown';
    const priority = r.priority || 'N/A';
    
    return `${idx + 1}. ${key} | ${project} | ${priority} | ${summary}`;
  }).join('\n');

  const systemPrompt = summaryType === 'detailed'
    ? `You are an expert Agile QA assistant. Analyze user stories and provide a DETAILED summary covering:
1. Main themes and patterns across stories
2. Common features and functionality
3. Project distribution
4. Priority patterns
5. Key insights and recommendations

Format your response as a structured summary.`
    : `You are an expert Agile QA assistant. Analyze user stories and provide a CONCISE summary covering:
1. Main themes (2-3 key points)
2. Common functionality areas
3. Project distribution
4. Key insights

Keep the summary brief and actionable.`;

  const system = SystemMessagePromptTemplate.fromTemplate(systemPrompt);
  const human = HumanMessagePromptTemplate.fromTemplate(
    "User Stories:\n{results}\n\nProvide a {summaryType} summary of these user stories."
  );
  const prompt = ChatPromptTemplate.fromMessages([system, human]);
  
  // Create LLM chain
  const model = createChatModel();
  const chain = prompt.pipe(model).pipe(new StringOutputParser());
  
  const summary = await chain.invoke({
    results: resultsText,
    summaryType: summaryType
  });

  return {
    summary,
    tokens: { prompt: 0, completion: 0, total: 0 }, // LangChain doesn't always expose token counts
    cost: 0
  };
}

