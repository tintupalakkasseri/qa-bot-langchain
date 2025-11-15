/**
 * Abbreviation Mapper
 * Expands user story and domain-specific abbreviations
 */

import { abbreviationMap } from './dictionaries.js';

export interface AbbreviationMapping {
  abbreviation: string;
  expansion: string;
  position: number;
}

export interface AbbreviationResult {
  expanded: string;
  mappings: AbbreviationMapping[];
}

/**
 * Expand abbreviations in text
 */
export function expandAbbreviations(text: string, customMap: Record<string, string> = {}): AbbreviationResult {
  if (!text || typeof text !== 'string') {
    return { expanded: '', mappings: [] };
  }

  const allAbbreviations = { ...abbreviationMap, ...customMap };
  const mappings: AbbreviationMapping[] = [];
  let expanded = text.toLowerCase();

  // Sort by length (longest first) to handle overlapping abbreviations
  const sortedAbbrevs = Object.entries(allAbbreviations)
    .sort(([a], [b]) => b.length - a.length);

  for (const [abbrev, fullForm] of sortedAbbrevs) {
    // Word boundary regex to match whole words only
    const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
    
    if (regex.test(expanded)) {
      const position = expanded.search(regex);
      mappings.push({
        abbreviation: abbrev,
        expansion: fullForm,
        position
      });
      
      expanded = expanded.replace(regex, fullForm);
    }
  }

  return { expanded, mappings };
}

/**
 * Expand abbreviations with context awareness
 */
export interface ContextualAbbreviationResult extends AbbreviationResult {
  ambiguous: Array<{
    abbreviation: string;
    possibleExpansions: string[];
    chosenExpansion: string;
  }>;
}

export function expandAbbreviationsContextual(
  text: string,
  options: { customMap?: Record<string, string>; preserveCase?: boolean } = {}
): ContextualAbbreviationResult {
  const { customMap = {} } = options;

  if (!text) {
    return { expanded: '', mappings: [], ambiguous: [] };
  }

  const result = expandAbbreviations(text, customMap);
  const ambiguous: ContextualAbbreviationResult['ambiguous'] = [];

  // Detect potentially ambiguous abbreviations
  const ambiguousAbbrevs: Record<string, string[]> = {
    'us': ['user story', 'united states'],
    'ac': ['acceptance criteria', 'alternating current'],
    'api': ['application programming interface', 'application programming interface']
  };

  // Check for ambiguous abbreviations in mappings
  result.mappings.forEach(mapping => {
    if (ambiguousAbbrevs[mapping.abbreviation.toLowerCase()]) {
      ambiguous.push({
        abbreviation: mapping.abbreviation,
        possibleExpansions: ambiguousAbbrevs[mapping.abbreviation.toLowerCase()],
        chosenExpansion: mapping.expansion
      });
    }
  });

  return {
    ...result,
    ambiguous
  };
}

/**
 * Smart expansion: only expand if context suggests user story domain
 */
export interface SmartExpansionResult extends AbbreviationResult {
  confidence: number;
  reason?: string;
}

export function smartExpand(text: string): SmartExpansionResult {
  if (!text) {
    return { expanded: '', mappings: [], confidence: 0 };
  }

  // User story context indicators
  const storyKeywords = [
    'user', 'story', 'feature', 'requirement', 'sprint',
    'epic', 'acceptance', 'criteria', 'product', 'owner',
    'scrum', 'agile', 'backlog', 'task', 'developer'
  ];

  const lowerText = text.toLowerCase();
  const contextMatches = storyKeywords.filter(keyword => 
    lowerText.includes(keyword)
  ).length;

  const confidence = Math.min(contextMatches / 3, 1.0); // 3+ keywords = 100% confidence

  // Only expand if confidence is high enough
  if (confidence >= 0.3) {
    const result = expandAbbreviations(text);
    return { ...result, confidence };
  }

  return {
    expanded: text,
    mappings: [],
    confidence,
    reason: 'Low user story context confidence'
  };
}

/**
 * Find all possible abbreviations in text without expanding
 */
export function findAbbreviations(text: string): AbbreviationMapping[] {
  if (!text) return [];

  const found: AbbreviationMapping[] = [];
  const lowerText = text.toLowerCase();

  Object.entries(abbreviationMap).forEach(([abbrev, fullForm]) => {
    const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
    let match;
    
    while ((match = regex.exec(lowerText)) !== null) {
      found.push({
        abbreviation: abbrev,
        expansion: fullForm,
        position: match.index
      });
    }
  });

  return found.sort((a, b) => a.position - b.position);
}

