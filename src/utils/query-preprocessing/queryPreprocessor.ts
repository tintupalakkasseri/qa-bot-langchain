/**
 * Query Preprocessor - Main Pipeline Orchestrator
 * Combines normalization, abbreviation expansion, and synonym expansion
 */

import { normalizeComplete, extractStoryIds } from './normalizer.js';
import { expandAbbreviations, smartExpand } from './abbreviationMapper.js';
import { expandSynonyms, expandComplete as expandSynonymsComplete } from './synonymExpander.js';

export interface PreprocessingOptions {
  enableAbbreviations?: boolean;
  enableSynonyms?: boolean;
  maxSynonymVariations?: number;
  customAbbreviations?: Record<string, string>;
  customSynonyms?: Record<string, string[]>;
  smartExpansion?: boolean;
  preserveStoryIds?: boolean;
}

export interface PreprocessingResult {
  original: string;
  normalized: string;
  abbreviationExpanded: string;
  synonymExpanded: string[];
  metadata: {
    storyIds: Array<{ original: string; normalized: string }>;
    abbreviationMappings: Array<{ abbreviation: string; expansion: string; position: number }>;
    synonymMappings: Array<{ term: string; synonyms: string[]; position: number }>;
    tokens: string[];
    processingTime: number;
    steps: {
      normalization: boolean;
      abbreviationExpansion: boolean;
      synonymExpansion: boolean;
    };
  };
}

/**
 * Main query preprocessing pipeline
 */
export function preprocessQuery(rawQuery: string, options: PreprocessingOptions = {}): PreprocessingResult {
  const startTime = Date.now();

  const {
    enableAbbreviations = true,
    enableSynonyms = true,
    maxSynonymVariations = 5,
    customAbbreviations = {},
    customSynonyms = {},
    smartExpansion = false,
    preserveStoryIds = true
  } = options;

  // Validate input
  if (!rawQuery || typeof rawQuery !== 'string') {
    return {
      original: rawQuery || '',
      normalized: '',
      abbreviationExpanded: '',
      synonymExpanded: [],
      metadata: {
        storyIds: [],
        abbreviationMappings: [],
        synonymMappings: [],
        tokens: [],
        processingTime: 0,
        steps: {
          normalization: false,
          abbreviationExpansion: false,
          synonymExpansion: false
        }
      }
    };
  }

  // Step 1: Extract and preserve story IDs
  let storyIds: Array<{ original: string; normalized: string }> = [];
  let workingQuery = rawQuery;
  
  if (preserveStoryIds) {
    const storyResult = extractStoryIds(rawQuery);
    storyIds = storyResult.storyIds;
    workingQuery = storyResult.normalized;
  }

  // Step 2: Normalize
  const normalizeResult = normalizeComplete(workingQuery, {
    lowercase: true,
    preserveHyphens: true,
    preserveNumbers: true
  });

  const normalized = normalizeResult.normalized;

  // Step 3: Expand abbreviations
  let abbreviationExpanded = normalized;
  let abbreviationMappings: Array<{ abbreviation: string; expansion: string; position: number }> = [];

  if (enableAbbreviations) {
    const abbrevResult = smartExpansion
      ? smartExpand(normalized)
      : expandAbbreviations(normalized, customAbbreviations);
    
    abbreviationExpanded = abbrevResult.expanded;
    abbreviationMappings = abbrevResult.mappings;
  }

  // Step 4: Expand synonyms
  let synonymExpanded = [abbreviationExpanded];
  let synonymMappings: Array<{ term: string; synonyms: string[]; position: number }> = [];

  if (enableSynonyms) {
    const synResult = expandSynonyms(abbreviationExpanded, {
      customSynonyms,
      maxVariations: maxSynonymVariations,
      includeOriginal: true,
      minSynonymLength: 3
    });
    
    synonymExpanded = synResult.expanded;
    synonymMappings = synResult.mappings;
  }

  // Step 5: Re-attach story IDs if needed
  if (preserveStoryIds && storyIds.length > 0) {
    const storyStr = storyIds.map(s => s.normalized).join(' ');
    synonymExpanded = synonymExpanded.map(query => `${storyStr} ${query}`);
  }

  const processingTime = Date.now() - startTime;

  return {
    original: rawQuery,
    normalized,
    abbreviationExpanded,
    synonymExpanded,
    metadata: {
      storyIds,
      abbreviationMappings,
      synonymMappings,
      tokens: normalizeResult.metadata.tokens,
      processingTime,
      steps: {
        normalization: true,
        abbreviationExpansion: enableAbbreviations,
        synonymExpansion: enableSynonyms
      }
    }
  };
}

/**
 * Quick preprocessing - only normalization and abbreviations
 */
export function preprocessQueryQuick(rawQuery: string, options: PreprocessingOptions = {}): PreprocessingResult {
  return preprocessQuery(rawQuery, {
    ...options,
    enableSynonyms: false,
    maxSynonymVariations: 0
  });
}

/**
 * Full preprocessing with phrase expansion
 */
export function preprocessQueryComplete(rawQuery: string, options: PreprocessingOptions = {}): PreprocessingResult {
  const startTime = Date.now();

  const {
    maxSynonymVariations = 5,
    customAbbreviations = {},
    customSynonyms = {}
  } = options;

  if (!rawQuery) {
    return {
      original: '',
      normalized: '',
      abbreviationExpanded: '',
      synonymExpanded: [],
      metadata: {
        storyIds: [],
        abbreviationMappings: [],
        synonymMappings: [],
        tokens: [],
        processingTime: 0,
        steps: {
          normalization: false,
          abbreviationExpansion: false,
          synonymExpansion: false
        }
      }
    };
  }

  // Step 1: Normalize
  const normalizeResult = normalizeComplete(rawQuery);
  const normalized = normalizeResult.normalized;

  // Step 2: Expand abbreviations
  const abbrevResult = expandAbbreviations(normalized, customAbbreviations);
  const abbreviationExpanded = abbrevResult.expanded;

  // Step 3: Expand synonyms (includes phrase expansion)
  const synResult = expandSynonymsComplete(abbreviationExpanded, {
    customSynonyms,
    maxVariations: maxSynonymVariations
  });

  const processingTime = Date.now() - startTime;

  return {
    original: rawQuery,
    normalized,
    abbreviationExpanded,
    synonymExpanded: synResult.expanded,
    metadata: {
      storyIds: [],
      abbreviationMappings: abbrevResult.mappings,
      synonymMappings: synResult.mappings.synonyms,
      tokens: normalizeResult.metadata.tokens,
      processingTime,
      steps: {
        normalization: true,
        abbreviationExpansion: true,
        synonymExpansion: true
      }
    }
  };
}

/**
 * Analyze query (show what preprocessing would do without applying)
 */
export async function analyzeQuery(rawQuery: string): Promise<{
  original: string;
  tokens: string[];
  abbreviations: Array<{ abbreviation: string; expansion: string }>;
  synonyms: Array<{ term: string; synonyms: string[] }>;
  tokenCount: number;
}> {
  if (!rawQuery) {
    return {
      original: '',
      tokens: [],
      abbreviations: [],
      synonyms: [],
      tokenCount: 0
    };
  }

  const normalizeResult = normalizeComplete(rawQuery);
  
  // Dynamic imports to avoid circular dependencies
  const { findAbbreviations } = await import('./abbreviationMapper.js');
  const { findSynonyms } = await import('./synonymExpander.js');

  const abbreviations = findAbbreviations(normalizeResult.normalized);
  const synonyms = normalizeResult.metadata.tokens
    .map(token => {
      const syns = findSynonyms(token);
      return syns.length > 0 ? { term: token, synonyms: syns } : null;
    })
    .filter((s): s is { term: string; synonyms: string[] } => s !== null);

  return {
    original: rawQuery,
    tokens: normalizeResult.metadata.tokens,
    abbreviations: abbreviations.map(a => ({ abbreviation: a.abbreviation, expansion: a.expansion })),
    synonyms,
    tokenCount: normalizeResult.metadata.tokens.length
  };
}

