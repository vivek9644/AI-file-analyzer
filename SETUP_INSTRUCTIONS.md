
# ChromaDB + Qdrant Setup Instructions

## Replit Environment Setup

Since Replit doesn't support Docker directly, we have two options:

### Option 1: Local Development (Recommended for testing)
```bash
# If you have Docker locally, you can run:
docker-compose up -d
```

### Option 2: Cloud Services (Production Ready)

#### ChromaDB Cloud:
- Visit: https://www.trychroma.com/
- Create free account
- Get API endpoint and key

#### Qdrant Cloud:
- Visit: https://cloud.qdrant.io/
- Create free cluster (1GB free)
- Get cluster URL and API key

### Option 3: Alternative Local Setup (Without Docker)

#### ChromaDB Local:
```bash
pip install chromadb
chroma run --host 0.0.0.0 --port 8000
```

#### Qdrant Local:
```bash
# Download Qdrant binary or use their Python client
pip install qdrant-client
```

## Environment Variables (.env)

Add these to your .env file:

```env
# ChromaDB Configuration
CHROMA_HOST=0.0.0.0
CHROMA_PORT=8000
CHROMA_API_KEY=your_chroma_api_key

# Qdrant Configuration  
QDRANT_URL=http://0.0.0.0:6333
QDRANT_API_KEY=your_qdrant_api_key

# OpenAI (Already configured)
OPENAI_API_KEY=your_openai_api_key_here
```

## Status Check

Once services are running, check:
- ChromaDB: http://localhost:8000/api/v1/heartbeat
- Qdrant: http://localhost:6333/collections

## Next Steps

After services are running:
1. Install Node.js packages: `npm install @qdrant/qdrant-js chromadb`
2. Update server code to use vector databases
3. Migrate existing in-memory data
