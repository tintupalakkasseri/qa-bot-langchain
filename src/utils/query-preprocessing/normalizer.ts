/**
 * Text Normalizer
 * Handles query normalization: lowercase, trim, special character removal
 */

export interface NormalizeOptions {
  lowercase?: boolean;
  trimWhitespace?: boolean;
  removeExtraSpaces?: boolean;
  removeSpecialChars?: boolean;
  preserveHyphens?: boolean;
  preserveUnderscores?: boolean;
  preserveNumbers?: boolean;
}

export interface NormalizeResult {
  normalized: string;
  metadata: {
    original: string;
    tokens: string[];
    length: number;
  };
}

/**
 * Normalize query text
 */
export function normalize(text: string, options: NormalizeOptions = {}): string {
  const {
    lowercase = true,
    trimWhitespace = true,
    removeExtraSpaces = true,
    removeSpecialChars = false,
    preserveHyphens = true,
    preserveUnderscores = false,
    preserveNumbers = true
  } = options;

  if (!text || typeof text !== 'string') {
    return '';
  }

  let normalized = text;

  // Trim whitespace
  if (trimWhitespace) {
    normalized = normalized.trim();
  }

  // Remove extra spaces (multiple spaces → single space)
  if (removeExtraSpaces) {
    normalized = normalized.replace(/\s+/g, ' ');
  }

  // Convert to lowercase
  if (lowercase) {
    normalized = normalized.toLowerCase();
  }

  // Remove special characters
  if (removeSpecialChars) {
    let pattern = '[^a-zA-Z0-9\\s';
    if (preserveHyphens) pattern += '-';
    if (preserveUnderscores) pattern += '_';
    pattern += ']';
    
    const regex = new RegExp(pattern, 'g');
    normalized = normalized.replace(regex, ' ');
    
    // Clean up extra spaces created by removal
    normalized = normalized.replace(/\s+/g, ' ').trim();
  }

  // Handle numbers
  if (!preserveNumbers) {
    normalized = normalized.replace(/\d+/g, '');
    normalized = normalized.replace(/\s+/g, ' ').trim();
  }

  return normalized;
}

/**
 * Tokenize text into words
 */
export function tokenize(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Split on whitespace and filter empty strings
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(token => token.length > 0);
}

/**
 * Remove punctuation from text
 */
export function removePunctuation(text: string, preserve: string[] = ['-', '_']): string {
  if (!text) return '';

  let pattern = '[^a-zA-Z0-9\\s';
  preserve.forEach(char => {
    pattern += '\\' + char;
  });
  pattern += ']';

  const regex = new RegExp(pattern, 'g');
  return text.replace(regex, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Normalize spacing and formatting
 */
export function normalizeSpacing(text: string): string {
  if (!text) return '';

  return text
    .replace(/\s+/g, ' ')  // Multiple spaces → single space
    .replace(/\n+/g, ' ')  // Newlines → space
    .replace(/\t+/g, ' ')  // Tabs → space
    .trim();
}

/**
 * Handle special user story formats (e.g., US-123, US_123)
 */
export interface StoryIdExtraction {
  normalized: string;
  storyIds: Array<{ original: string; normalized: string }>;
}

export function extractStoryIds(text: string): StoryIdExtraction {
  if (!text) return { normalized: '', storyIds: [] };

  const storyPattern = /\b(us|story)[_\s-]?(\d+)\b/gi;
  const storyIds: Array<{ original: string; normalized: string }> = [];
  
  let match;
  while ((match = storyPattern.exec(text)) !== null) {
    storyIds.push({
      original: match[0],
      normalized: `US_${match[2]}`
    });
  }

  // Normalize story IDs in text
  const normalized = text.replace(storyPattern, (match, prefix, number) => {
    return `US_${number}`;
  });

  return { normalized, storyIds };
}

/**
 * Complete normalization pipeline
 */
export function normalizeComplete(text: string, options: NormalizeOptions = {}): NormalizeResult {
  if (!text) {
    return {
      normalized: '',
      metadata: {
        original: '',
        tokens: [],
        length: 0
      }
    };
  }

  // Extract story IDs first
  const { normalized: withNormalizedIds, storyIds } = extractStoryIds(text);

  // Apply standard normalization
  const normalized = normalize(withNormalizedIds, options);

  // Tokenize
  const tokens = tokenize(normalized);

  return {
    normalized,
    metadata: {
      original: text,
      tokens,
      length: tokens.length
    }
  };
}

