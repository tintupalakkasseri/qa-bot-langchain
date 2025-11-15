/**
 * Prompt Schema Manager
 * Manages prompt templates and JSON schemas for LLM interactions
 */

import fs from "fs/promises";
import path from "path";

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface JsonSchema {
  id: string;
  name: string;
  description: string;
  schema: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

class PromptSchemaManager {
  private templates: Map<string, PromptTemplate> = new Map();
  private schemas: Map<string, JsonSchema> = new Map();
  private storagePath: string;

  constructor(storagePath: string = "./data/prompts") {
    this.storagePath = storagePath;
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default prompt templates
   */
  private initializeDefaultTemplates(): void {
    // Default story rewrite template
    const defaultTemplate: PromptTemplate = {
      id: "default-story-rewrite",
      name: "Default Story Rewrite",
      description: "Default template for rewriting user stories",
      systemPrompt: `You are an expert Agile QA assistant trained to analyze and enhance new user stories by finding all related userstories.

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
A table with a one line summary of each related user story and it's score.`,
      userPromptTemplate: "New User Story:\n{newUserstory}\n\nRelated Stories:\n{userStories}",
      variables: ["newUserstory", "userStories"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.templates.set(defaultTemplate.id, defaultTemplate);
  }

  /**
   * Get all prompt templates
   */
  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Create or update a prompt template
   */
  saveTemplate(template: PromptTemplate): void {
    template.updatedAt = new Date().toISOString();
    if (!template.createdAt) {
      template.createdAt = new Date().toISOString();
    }
    this.templates.set(template.id, template);
  }

  /**
   * Delete a prompt template
   */
  deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  /**
   * Get all JSON schemas
   */
  getAllSchemas(): JsonSchema[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Get a specific schema by ID
   */
  getSchema(id: string): JsonSchema | undefined {
    return this.schemas.get(id);
  }

  /**
   * Create or update a JSON schema
   */
  saveSchema(schema: JsonSchema): void {
    schema.updatedAt = new Date().toISOString();
    if (!schema.createdAt) {
      schema.createdAt = new Date().toISOString();
    }
    this.schemas.set(schema.id, schema);
  }

  /**
   * Delete a JSON schema
   */
  deleteSchema(id: string): boolean {
    return this.schemas.delete(id);
  }
}

// Singleton instance
export const promptSchemaManager = new PromptSchemaManager();

