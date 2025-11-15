/**
 * Synonym Expander
 * Generates multiple query variations using synonyms
 */

import { synonymMap, phraseMap } from './dictionaries.js';

export interface SynonymMapping {
  term: string;
  synonyms: string[];
  position: number;
}

export interface SynonymResult {
  expanded: string[];
  mappings: SynonymMapping[];
}

export interface SynonymExpansionOptions {
  customSynonyms?: Record<string, string[]>;
  maxVariations?: number;
  includeOriginal?: boolean;
  minSynonymLength?: number;
}

/**
 * Expand query with synonyms to generate multiple variations
 */
export function expandSynonyms(text: string, options: SynonymExpansionOptions = {}): SynonymResult {
  const {
    customSynonyms = {},
    maxVariations = 5,
    includeOriginal = true,
    minSynonymLength = 3
  } = options;

  if (!text || typeof text !== 'string') {
    return { expanded: [], mappings: [] };
  }

  const allSynonyms = { ...synonymMap, ...customSynonyms };
  const mappings: SynonymMapping[] = [];
  const tokens = text.toLowerCase().split(/\s+/);
  
  // Find all synonym opportunities
  const synonymOpportunities: Array<{
    position: number;
    original: string;
    synonyms: string[];
  }> = [];
  
  tokens.forEach((token, index) => {
    // Skip very short words
    if (token.length < minSynonymLength) return;
    
    // Check if token has synonyms
    if (allSynonyms[token]) {
      synonymOpportunities.push({
        position: index,
        original: token,
        synonyms: allSynonyms[token]
      });
      
      mappings.push({
        term: token,
        synonyms: allSynonyms[token],
        position: index
      });
    }
  });

  // Generate variations
  const variations = new Set<string>();
  
  // Add original if requested
  if (includeOriginal) {
    variations.add(text);
  }

  // Strategy 1: Replace each term with one synonym at a time
  synonymOpportunities.forEach(opportunity => {
    opportunity.synonyms.forEach(synonym => {
      const newTokens = [...tokens];
      newTokens[opportunity.position] = synonym;
      variations.add(newTokens.join(' '));
    });
  });

  // Strategy 2: If we have multiple opportunities, try combinations
  if (synonymOpportunities.length >= 2 && variations.size < maxVariations) {
    // Generate a few smart combinations
    const combinations = generateSmartCombinations(
      tokens,
      synonymOpportunities,
      maxVariations - variations.size
    );
    
    combinations.forEach(combo => variations.add(combo));
  }

  // Convert Set to Array and limit
  const expanded = Array.from(variations).slice(0, maxVariations);

  return { expanded, mappings };
}

/**
 * Generate smart combinations of synonyms
 */
function generateSmartCombinations(
  tokens: string[],
  opportunities: Array<{ position: number; original: string; synonyms: string[] }>,
  maxCombos: number
): string[] {
  const combinations: string[] = [];
  
  // Strategy: Replace 2 terms at once with high-value synonyms
  if (opportunities.length >= 2) {
    const limit = Math.min(maxCombos, 3);
    
    for (let i = 0; i < Math.min(opportunities.length - 1, limit); i++) {
      const opp1 = opportunities[i];
      const opp2 = opportunities[i + 1];
      
      // Take first synonym of each
      if (opp1.synonyms[0] && opp2.synonyms[0]) {
        const newTokens = [...tokens];
        newTokens[opp1.position] = opp1.synonyms[0];
        newTokens[opp2.position] = opp2.synonyms[0];
        combinations.push(newTokens.join(' '));
      }
    }
  }
  
  return combinations;
}

/**
 * Expand multi-word phrases using phrase map
 */
export interface PhraseMapping {
  phrase: string;
  alternatives: string[];
}

export interface PhraseResult {
  expanded: string[];
  mappings: PhraseMapping[];
}

export function expandPhrases(text: string): PhraseResult {
  if (!text) {
    return { expanded: [text], mappings: [] };
  }

  const mappings: PhraseMapping[] = [];
  const variations = new Set<string>([text]);

  // Check each phrase in phrase map
  Object.entries(phraseMap).forEach(([phrase, alternatives]) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes(phrase)) {
      mappings.push({
        phrase,
        alternatives
      });
      
      // Generate variations with each alternative
      alternatives.forEach(alt => {
        const regex = new RegExp(phrase, 'gi');
        const newText = text.replace(regex, alt);
        variations.add(newText);
      });
    }
  });

  return {
    expanded: Array.from(variations),
    mappings
  };
}

/**
 * Combined expansion: both word-level synonyms and phrase-level
 */
export interface CompleteExpansionResult {
  expanded: string[];
  mappings: {
    synonyms: SynonymMapping[];
    phrases: PhraseMapping[];
  };
}

export function expandComplete(text: string, options: SynonymExpansionOptions = {}): CompleteExpansionResult {
  const {
    maxVariations = 5,
    customSynonyms = {}
  } = options;

  if (!text) {
    return { expanded: [], mappings: { synonyms: [], phrases: [] } };
  }

  // First, expand phrases
  const phraseResult = expandPhrases(text);
  
  // Then expand each phrase variation with synonyms
  const allVariations = new Set<string>();
  const synonymMappings: SynonymMapping[] = [];

  phraseResult.expanded.forEach(variation => {
    const synResult = expandSynonyms(variation, {
      customSynonyms,
      maxVariations: Math.ceil(maxVariations / phraseResult.expanded.length),
      includeOriginal: true
    });
    
    synResult.expanded.forEach(exp => allVariations.add(exp));
    synonymMappings.push(...synResult.mappings);
  });

  // Deduplicate mappings
  const uniqueSynonymMappings = Array.from(
    new Map(synonymMappings.map(m => [m.term, m])).values()
  );

  return {
    expanded: Array.from(allVariations).slice(0, maxVariations),
    mappings: {
      synonyms: uniqueSynonymMappings,
      phrases: phraseResult.mappings
    }
  };
}

/**
 * Find potential synonyms for a term
 */
export function findSynonyms(term: string): string[] {
  if (!term) return [];
  
  const lowerTerm = term.toLowerCase();
  
  if (synonymMap[lowerTerm]) {
    return synonymMap[lowerTerm];
  }
  
  return [];
}

