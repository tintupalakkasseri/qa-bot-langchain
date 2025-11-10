# User Story RAG System with LangChain

A LangChain-based system for ingesting user stories and performing semantic search with AI-powered rewriting.

## Features

1. **Story Ingestion**: Accept CSV/JSON files with user stories and ingest them to MongoDB with vector embeddings
2. **Story Search & Rewrite**: Accept a new user story, find related stories using vector search, rank them by relevance, and rewrite the story using LLM

## Project Structure

```
user-story-rag-langchain/
├── src/
│   ├── config/          # Configuration management
│   ├── lib/
│   │   ├── embeddings/  # Embedding providers (Mistral)
│   │   ├── models/      # LLM model factory (Groq)
│   │   └── vectorstore/ # MongoDB vector store wrapper
│   ├── services/        # Business logic
│   │   ├── storyIngestion.ts
│   │   └── storySearch.ts
│   ├── types/           # TypeScript types and Zod schemas
│   ├── utils/           # Utility functions (file parsing)
│   └── server.ts        # Express API server
├── package.json
├── tsconfig.json
└── README.md
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=rag_userstories
MONGODB_COLLECTION=stories
MONGODB_VECTOR_INDEX=vector_index_stories

# Mistral Embeddings
MISTRAL_API_KEY=your_mistral_api_key
EMBEDDING_PROVIDER=mistral
EMBEDDING_MODEL=mistral-embed
EMBEDDING_DIMENSION=1024

# Groq LLM
MODEL_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=meta-llama/llama-4-maverick-17b-128e-instruct
TEMPERATURE=0.1

# Server
PORT=8787
HOST=localhost
```

3. Build the project:
```bash
npm run build
```

4. Run the server:
```bash
npm run dev  # Development mode
# or
npm start    # Production mode
```

## API Endpoints

### 1. Health Check
```
GET /health
```

### 2. Ingest Stories
```
POST /ingest/stories
Content-Type: multipart/form-data

Body:
- file: CSV or JSON file
- clearExisting: boolean (optional, default: false)
```

### 3. Search and Rewrite Story
```
POST /search/stories
Content-Type: application/json

Body:
{
  "newUserStory": "As a user, I want to...",
  "topK": 6  // optional, default: 6
}
```

## Usage Examples

### Ingest Stories
```bash
curl -X POST http://localhost:8787/ingest/stories \
  -F "file=@stories.csv" \
  -F "clearExisting=true"
```

### Search and Rewrite
```bash
curl -X POST http://localhost:8787/search/stories \
  -H "Content-Type: application/json" \
  -d '{
    "newUserStory": "As a consultant, I want to view patient vitals on dashboard",
    "topK": 6
  }'
```

## Technology Stack

- **LangChain**: Vector stores, embeddings, LLM chains
- **MongoDB Atlas**: Vector search database
- **Mistral AI**: Embeddings (mistral-embed, 1024 dimensions)
- **Groq**: LLM for story rewriting
- **Express**: REST API server
- **TypeScript**: Type-safe development

