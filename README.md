
# 🚀 AI Nexus Studio Pro

Advanced AI File Analyzer with Multi-Model Support

## 🏃‍♂️ Quick Start

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Setup Environment Variables:**
   Copy `.env.example` to `.env` and fill in your API keys:
   ```bash
   cp .env.example .env
   ```

3. **Start ChromaDB (Vector Database):**
   ```bash
   # In a new terminal/shell
   pip3 install chromadb
   chroma run --host 0.0.0.0 --port 8000 --path ./chroma
   ```

4. **Start the Application:**
   ```bash
   npm run dev
   ```

## 🧠 Vector Database Setup

### ChromaDB (Primary)
```bash
# Install ChromaDB
pip3 install chromadb

# Start ChromaDB server
chroma run --host 0.0.0.0 --port 8000 --path ./chroma
```

### Qdrant (Secondary/Backup)
#### Option 1: Qdrant Cloud (Recommended)
1. Visit: https://cloud.qdrant.io/
2. Create free account (1GB free tier)
3. Create cluster और API key प्राप्त करें

#### Option 2: Local Qdrant
```bash
# Install Qdrant Python client
pip3 install qdrant-client

# या Node.js client (already installed)
npm install @qdrant/js-client-rest
```

### Environment Variables
```env
# ChromaDB
CHROMA_HOST=0.0.0.0
CHROMA_PORT=8000

# Qdrant (Cloud या Local)
QDRANT_URL=https://your-cluster-url.qdrant.tech
QDRANT_API_KEY=your_qdrant_api_key_here

# 🔐 Replit Secrets Configuration

Instead of using .env file, add these secrets in Replit Secrets:

1. Go to Tools → Secrets in your Replit
2. Add these keys:
   - `GEMINI_API_KEY` - Your Google Gemini API key
   - `OPENAI_API_KEY` - Your OpenAI API key (optional)
   - `CHROMA_HOST` - ChromaDB host (default: 0.0.0.0)
   - `CHROMA_PORT` - ChromaDB port (default: 8000)
```

## 🔧 Features

- **Context-Aware Chat:** ChromaDB-powered conversation memory
- **Multi-Model AI:** Gemini, GPT-4, OpenRouter support
- **File Analysis:** PDF OCR, Code Review, Data Visualization
- **Voice Chat:** Real-time transcription and TTS
- **Vector Memory:** Intelligent conversation context retrieval

## 📊 Architecture

```
Frontend (index.html) → Server (index.js) → Vector DB (ChromaDB) → AI APIs
                                         ↓
                                    Context Memory
```

---
*Built with ❤️ for the Replit community*
# AI-file-analyzer
