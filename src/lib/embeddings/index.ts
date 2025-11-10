import { Embeddings } from "@langchain/core/embeddings";
import { MistralEmbeddings } from "./mistralEmbeddings.js";

/**
 * Factory function to create embeddings based on provider
 */
export async function createEmbeddings(config: {
  provider: string;
  model: string;
  apiKey: string;
}): Promise<Embeddings> {
  const provider = config.provider.toLowerCase();

  switch (provider) {
    case "mistral": {
      if (!config.apiKey) {
        throw new Error("MISTRAL_API_KEY is required for Mistral embeddings");
      }
      
      return new MistralEmbeddings({
        apiKey: config.apiKey,
        modelName: config.model || "mistral-embed",
      });
    }

    case "openai": {
      const { OpenAIEmbeddings } = await import("@langchain/openai");
      
      if (!config.apiKey) {
        throw new Error("OPENAI_API_KEY is required for OpenAI embeddings");
      }
      
      return new OpenAIEmbeddings({
        openAIApiKey: config.apiKey,
        modelName: config.model || "text-embedding-3-small",
      });
    }

    default:
      throw new Error(
        `Unsupported embedding provider: "${provider}". Supported: mistral, openai`
      );
  }
}

