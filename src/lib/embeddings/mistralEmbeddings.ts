import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";
import { MistralAIEmbeddings } from "@langchain/mistralai";

/**
 * Mistral AI Embeddings wrapper with proper configuration
 * Model: mistral-embed
 * Dimension: 1024
 */
export class MistralEmbeddings extends Embeddings {
  private embeddings: MistralAIEmbeddings;

  constructor(params: EmbeddingsParams & { apiKey: string; modelName?: string }) {
    super(params);
    
    this.embeddings = new MistralAIEmbeddings({
      apiKey: params.apiKey,
      modelName: params.modelName || "mistral-embed",
    });
  }

  /**
   * Embed a single document
   */
  async embedQuery(text: string): Promise<number[]> {
    try {
      const embedding = await this.embeddings.embedQuery(text);
      
      // Validate dimension
      if (embedding.length !== 1024) {
        throw new Error(`Expected embedding dimension 1024, got ${embedding.length}`);
      }
      
      return embedding;
    } catch (error) {
      throw new Error(
        `Failed to embed query: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Embed multiple documents with batch processing
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    try {
      const embeddings = await this.embeddings.embedDocuments(texts);
      
      // Validate all dimensions
      for (const embedding of embeddings) {
        if (embedding.length !== 1024) {
          throw new Error(`Expected embedding dimension 1024, got ${embedding.length}`);
        }
      }
      
      return embeddings;
    } catch (error) {
      throw new Error(
        `Failed to embed documents: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

