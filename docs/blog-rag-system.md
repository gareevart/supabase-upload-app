# Retrieval-Augmented Generation (RAG) for Blog Chat

This document describes the implementation of the RAG system that allows the chat assistant to answer questions based on the content of blog posts.

## Overview

The system uses a vector database to store embeddings of blog post content. When a user asks a question in the chat, the system generates an embedding for the query, searches for relevant blog post snippets, and provides them to the AI model as context.

## Components

### 1. Vector Database (Supabase + pgvector)
- **Extension**: `pgvector` enabled in Supabase.
- **Table**: `blog_post_embeddings`
  - `id`: Unique identifier (UUID).
  - `post_id`: Reference to the `blog_posts` table.
  - `content`: Plain text chunk of the blog post.
  - `embedding`: Vector representation (256 dimensions).
- **RPC Function**: `match_blog_posts` performs similarity search using the inner product distance (`<#>`) or cosine similarity (`<=>`).

### 2. Embeddings (YandexGPT)
- **Utility**: `lib/yandex.ts`
- **Models**: 
  - `emb://<folder-id>/text-search-query/latest` for user queries.
  - `emb://<folder-id>/text-search-doc/latest` for document chunks.
- **Dimension**: 256.

### 3. Sync & Automation
- **Utility**: `lib/blog-sync.ts` - handles text extraction from Tiptap JSON, chunking (2000 chars), and embedding generation.
- **Automation**: Integrated into `app/api/blog-posts/route.ts` and `app/api/blog-posts/[id]/route.ts`.
  - Indexing is triggered automatically when a post is created or updated.
  - If a post is unpublished, its embeddings are automatically removed.
- **Bulk Sync**: `app/api/admin/sync-embeddings/route.ts` allows re-indexing all published posts via a POST request.

### 4. Retrieval (Chat Integration)
- **Streaming API**: `app/api/generate-text-stream/route.ts`
- **Non-streaming API**: `app/api/generate-text/route.ts`
- **Process**:
  1. Extract search query from user prompt.
  2. Generate search query embedding.
  3. Query Supabase for top 3 matches (threshold 0.1).
  4. Inject retrieved text into the `system` message of the AI prompt.

## Maintenance

### Long-term Maintenance

- **Automation**: You don't need to manually trigger indexing for new or updated posts. The system automatically updates embeddings whenever you click "Publish" or "Save" on a post.
- **Bulk Re-indexing**: If you change the parsing logic or reset the vector database, you can force a full re-index of all published posts using this command:
```bash
curl -X POST http://localhost:3000/api/admin/sync-embeddings
```
*Note: Bulk synchronization is intentionally slow (0.5s per chunk) to avoid hitting Yandex API rate limits.*

### Troubleshooting
- **No relevant documents found**: Check if the article is published and indexed in the `blog_post_embeddings` table.
- **Garbled context**: Ensure the Tiptap JSON is correctly parsed (the system automatically ignores base64 images and technical noise).
- **Rate Limit Errors**: The system handles Yandex 429 errors with sequential processing and delays.
