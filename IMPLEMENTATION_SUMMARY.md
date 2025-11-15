# Implementation Summary

## Overview
This repository implements a User Story RAG (Retrieval-Augmented Generation) system using LangChain libraries. All features from the original test case repository have been ported and adapted for user story search.

## ✅ Completed Features

### Backend (TypeScript + LangChain)

#### 1. Query Preprocessing Module
- **Location**: `src/utils/query-preprocessing/`
- **Features**:
  - Text normalization (lowercase, trim, special character handling)
  - Abbreviation expansion (user story domain-specific)
  - Synonym expansion (generates query variations)
  - Custom dictionaries for domain-specific terms
- **Endpoints**:
  - `POST /api/search/preprocess` - Preprocess queries
  - `POST /api/search/analyze` - Analyze query without preprocessing

#### 2. Multiple Search Strategies
- **BM25 Search** (`POST /api/search/bm25`)
  - Keyword-based search using MongoDB Atlas Search
  - Uses `BM25_search` index
  - Supports field-specific search with fuzzy matching
  
- **Hybrid Search** (`POST /api/search/hybrid`)
  - Combines BM25 + Vector search
  - Configurable weights for each method
  - Score normalization and fusion
  
- **Reranking** (`POST /api/search/rerank`)
  - Score fusion methods:
    - RRF (Reciprocal Rank Fusion)
    - Weighted normalized scores
    - Reciprocal weighted
  - Reranks top-K candidates

#### 3. Advanced Features
- **Summarization & Deduplication**
  - `POST /api/search/deduplicate` - Remove duplicate results
  - `POST /api/search/summarize` - AI-powered summarization using LangChain
  - Uses Jaccard similarity for deduplication
  
- **Prompt Schema Manager**
  - `GET/POST/DELETE /api/prompts/templates` - Manage prompt templates
  - `GET/POST/DELETE /api/prompts/schemas` - Manage JSON schemas
  - In-memory storage with default templates
  
- **Metadata Filtering**
  - Filter by: project, epic, priority, status
  - `GET /api/metadata/distinct` - Get available filter values
  - Applied to all search endpoints
  
- **Job Tracking**
  - `GET /api/jobs/active` - Get active jobs
  - `GET /api/jobs/:jobId` - Get job status
  - In-memory job tracking with automatic cleanup

### Frontend (React + Material-UI)

#### Components Created
1. **Vector Search** (`QuerySearch.js`)
   - Semantic search using embeddings
   - Displays rewritten user story
   - Metadata filtering (project, epic, priority, status)
   
2. **BM25 Search** (`BM25Search.js`)
   - Keyword-based search interface
   - Fast search results
   - Filter support
   
3. **Hybrid Search** (`HybridSearch.js`)
   - Combined BM25 + Vector search
   - Weight sliders for balancing
   - Shows which index found each result
   
4. **Reranking Search** (`RerankingSearch.js`)
   - Score fusion interface
   - Multiple fusion methods
   - Rank change indicators
   
5. **Query Preprocessing** (`QueryPreprocessing.js`)
   - Interactive preprocessing pipeline
   - Shows normalization, abbreviation, and synonym steps
   - Test search with preprocessed queries
   
6. **Summarization & Deduplication** (`SummarizationDedup.js`)
   - Search, deduplicate, and summarize workflow
   - Configurable threshold
   - Summary types (concise/detailed)
   
7. **Prompt Schema Manager** (`PromptSchemaManager.js`)
   - Manage prompt templates
   - Manage JSON schemas
   - CRUD operations
   
8. **Settings** (`Settings.js`)
   - View environment variables
   - Non-sensitive configuration display

## 📁 File Structure

```
user-story-rag-langchain/
├── src/
│   ├── config/
│   │   └── index.ts                    # Configuration (includes BM25 index)
│   ├── lib/
│   │   ├── embeddings/                 # Embedding providers
│   │   ├── models/                     # LLM models
│   │   └── vectorstore/                # Vector store (LangChain)
│   ├── services/
│   │   ├── searchServices.ts           # BM25, Hybrid, Reranking
│   │   ├── summarizationService.ts     # Summarization & Deduplication
│   │   ├── jobTracking.ts              # Job tracking
│   │   ├── promptSchemaManager.ts      # Prompt & schema management
│   │   ├── storyIngestion.ts           # Story ingestion (existing)
│   │   └── storySearch.ts              # Vector search (existing)
│   ├── types/
│   │   └── stories.ts                  # TypeScript types
│   ├── utils/
│   │   ├── mongodb.ts                  # MongoDB utilities
│   │   └── query-preprocessing/        # Query preprocessing modules
│   │       ├── dictionaries.ts
│   │       ├── normalizer.ts
│   │       ├── abbreviationMapper.ts
│   │       ├── synonymExpander.ts
│   │       └── queryPreprocessor.ts
│   └── server.ts                       # Express server with all endpoints
├── client/
│   ├── src/
│   │   ├── App.js                      # Main app component
│   │   ├── components/
│   │   │   ├── search/                 # Search components
│   │   │   ├── processing/             # Processing components
│   │   │   └── settings/               # Settings component
│   │   └── index.js
│   └── package.json
└── package.json
```

## 🔧 Configuration

### Environment Variables Required

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=rag_userstories
MONGODB_COLLECTION=stories
MONGODB_VECTOR_INDEX=vector_index_stories
MONGODB_BM25_INDEX=BM25_search

# Embeddings
EMBEDDING_PROVIDER=mistral
EMBEDDING_MODEL=mistral-embed
MISTRAL_API_KEY=your_mistral_api_key

# LLM
MODEL_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=meta-llama/llama-4-maverick-17b-128e-instruct
TEMPERATURE=0.1

# Server
PORT=8787
HOST=localhost
```

## 🚀 Setup Instructions

### Backend
```bash
cd /Users/Tintu.Prakasan/Documents/GenAITraining/user-story-rag-langchain
npm install
npm run dev  # Development mode with hot reload
# or
npm run build && npm start  # Production mode
```

### Frontend
```bash
cd client
npm install
npm start  # Runs on http://localhost:3000
```

## 📝 API Endpoints

### Search Endpoints
- `POST /search/stories` - Vector search with story rewriting (existing)
- `POST /api/search/bm25` - BM25 keyword search
- `POST /api/search/hybrid` - Hybrid search (BM25 + Vector)
- `POST /api/search/rerank` - Reranking with score fusion

### Preprocessing
- `POST /api/search/preprocess` - Preprocess query
- `POST /api/search/analyze` - Analyze query

### Processing
- `POST /api/search/deduplicate` - Deduplicate results
- `POST /api/search/summarize` - Summarize results

### Metadata & Configuration
- `GET /api/metadata/distinct` - Get filter options
- `GET /api/env` - Get environment settings
- `GET /api/jobs/active` - Get active jobs
- `GET /api/jobs/:jobId` - Get job status

### Prompt & Schema Management
- `GET /api/prompts/templates` - List templates
- `POST /api/prompts/templates` - Create/update template
- `DELETE /api/prompts/templates/:id` - Delete template
- `GET /api/prompts/schemas` - List schemas
- `POST /api/prompts/schemas` - Create/update schema
- `DELETE /api/prompts/schemas/:id` - Delete schema

## 🔑 Key Differences from Original

1. **TypeScript** - All backend code is in TypeScript
2. **LangChain Integration** - Uses LangChain for embeddings and vector search
3. **User Story Focus** - Adapted for user stories (not test cases)
4. **Field Names** - Uses user story fields (key, summary, description, project, epic, priority, status)
5. **Port** - Backend runs on port 8787 (instead of 3001)

## 📊 Data Structure

User stories are expected to have:
- `key` or `storyId` - Unique identifier
- `summary` - Story summary
- `description` or `text` - Full description
- `project` - Project name
- `epic` - Epic name
- `priority` - Priority level
- `status` - Story status
- `acceptanceCriteria` - Acceptance criteria
- `embedding` - Vector embedding (1536 or 1024 dimensions)

## 🎯 Next Steps

1. **Install Dependencies**: Run `npm install` in both root and client directories
2. **Configure Environment**: Set up `.env` file with MongoDB and API keys
3. **Create MongoDB Indexes**: 
   - Vector index on `embedding` field
   - BM25 index named `BM25_search` on searchable fields
4. **Ingest User Stories**: Use `/ingest/stories` endpoint to add stories
5. **Test Search**: Use the frontend to test all search strategies

## ⚠️ Notes

- The frontend expects the backend to be running on `http://localhost:8787`
- BM25 index must be created in MongoDB Atlas with name `BM25_search`
- Vector search uses LangChain's MongoDBAtlasVectorSearch integration
- All search endpoints support metadata filtering
- Job tracking is in-memory (consider Redis for production)

