import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGroq } from "@langchain/groq";
import { config } from "../../config/index.js";

/**
 * Create chat model based on configuration
 */
export function createChatModel(): BaseChatModel {
  const provider = config.modelProvider;
  const temperature = config.temperature;

  // Validate temperature
  if (isNaN(temperature) || temperature < 0 || temperature > 2) {
    throw new Error(`Invalid temperature: ${temperature}. Must be between 0 and 2.`);
  }

  switch (provider) {
    case "groq": {
      const apiKey = config.groq.apiKey;
      const model = config.groq.model;

      if (!apiKey) {
        throw new Error("GROQ_API_KEY is required when MODEL_PROVIDER=groq");
      }

      return new ChatGroq({
        apiKey,
        model,
        temperature,
      }) as unknown as BaseChatModel;
    }

    default:
      throw new Error(
        `Unsupported MODEL_PROVIDER: "${provider}". Supported: groq`
      );
  }
}

/**
 * Get information about the current model configuration
 */
export function getModelInfo(): {
  provider: string;
  model: string;
  temperature: number;
} {
  const provider = config.modelProvider;
  const temperature = config.temperature;

  let model = "unknown";
  switch (provider) {
    case "groq":
      model = config.groq.model;
      break;
  }

  return { provider, model, temperature };
}

