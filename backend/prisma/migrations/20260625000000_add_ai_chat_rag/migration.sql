-- Enable pgvector for embeddings-based RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceEmbedding" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceIndexState" (
    "userId" UUID NOT NULL,
    "signature" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceIndexState_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FinanceEmbedding_userId_idx" ON "FinanceEmbedding"("userId");

-- Approximate nearest-neighbour index for cosine distance
CREATE INDEX "FinanceEmbedding_embedding_idx" ON "FinanceEmbedding"
  USING hnsw ("embedding" vector_cosine_ops);

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEmbedding" ADD CONSTRAINT "FinanceEmbedding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceIndexState" ADD CONSTRAINT "FinanceIndexState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
