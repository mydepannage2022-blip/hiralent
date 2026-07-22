import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import { VectorMetadata, PineconeMatch } from '../types/candidate.types';

dotenv.config();

if (!process.env.PINECONE_API_KEY) {
  console.warn('PINECONE_API_KEY is not set in environment variables');
}

if (!process.env.PINECONE_ENVIRONMENT) {
  console.warn('PINECONE_ENVIRONMENT is not set in environment variables');
}

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

// The effective index is PINECONE_INDEX_NAME from env (backend/.env), with this
// Hiralent-branded default when unset. The index is auto-created on first use by
// ensureIndexExists() below, so a fresh environment (dev or a clean deploy) does not
// need the index pre-created in the Pinecone dashboard.
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'hiralent-candidates';

export { pc };

// Ensure INDEX_NAME exists in Pinecone, creating it once if missing. The result is
// cached so the listIndexes/createIndex round-trip runs at most once per process; on
// failure the cache is cleared so a later call can retry instead of caching the error.
let indexReady: Promise<void> | null = null;

async function ensureIndexExists(): Promise<void> {
  const indexList = await pc.listIndexes();
  const exists = indexList.indexes?.some(index => index.name === INDEX_NAME);

  if (!exists) {
    await pc.createIndex({
      name: INDEX_NAME,
      // Must match the embedding size produced by createEmbedding() in lib/openai.ts,
      // which uses Google 'text-embedding-004' (768 dims). A mismatch makes every
      // upsert fail with a dimension error (silently, since callers treat Pinecone as
      // best-effort). Update both together if the embedding model changes.
      dimension: 768,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: process.env.PINECONE_ENVIRONMENT || 'us-east-1'
        }
      }
    });

    // Give the new serverless index a moment to become queryable.
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

function ready(): Promise<void> {
  if (!indexReady) {
    indexReady = ensureIndexExists().catch(error => {
      indexReady = null; // allow a retry on the next call instead of caching the failure
      throw error;
    });
  }
  return indexReady;
}

export async function initializePineconeIndex() {
  try {
    await ready();
    return pc.index(INDEX_NAME);
  } catch (error) {
    console.error('Error initializing Pinecone index:', error);
    throw new Error('Failed to initialize Pinecone index');
  }
}

export async function getPineconeIndex() {
  try {
    await ready();
    return pc.index(INDEX_NAME);
  } catch (error) {
    console.error('Error getting Pinecone index:', error);
    throw new Error('Failed to get Pinecone index');
  }
}

export async function storeCandidateVector(
  candidateId: string,
  vector: number[],
  metadata: VectorMetadata
): Promise<void> {
  try {
    const index = await getPineconeIndex();
    
    await index.upsert([
      {
        id: `candidate_${candidateId}`,
        values: vector,
        metadata: {
          type: 'candidate',
          candidateId,
          ...metadata
        }
      }
    ]);
    
  } catch (error) {
    console.error('Error storing candidate vector:', error);
    throw new Error('Failed to store candidate vector');
  }
}

export async function storeJobVector(
  jobId: string,
  vector: number[],
  metadata: Record<string, any>
): Promise<void> {
  try {
    const index = await getPineconeIndex();
    
    await index.upsert([
      {
        id: `job_${jobId}`,
        values: vector,
        metadata: {
          type: 'job',
          jobId,
          ...metadata
        }
      }
    ]);
    
  } catch (error) {
    console.error('Error storing job vector:', error);
    throw new Error('Failed to store job vector');
  }
}

export async function findSimilarCandidates(
  jobVector: number[],
  topK: number = 10
): Promise<PineconeMatch[]> {
  try {
    const index = await getPineconeIndex();
    
    const queryResponse = await index.query({
      vector: jobVector,
      topK,
      filter: { type: 'candidate' },
      includeMetadata: true
    });
    
    return (queryResponse.matches || []) as PineconeMatch[];
  } catch (error) {
    console.error('Error finding similar candidates:', error);
    throw new Error('Failed to find similar candidates');
  }
}

export async function findSimilarJobs(
  candidateVector: number[],
  topK: number = 20
): Promise<PineconeMatch[]> {
  try {
    const index = await getPineconeIndex();
    
    const queryResponse = await index.query({
      vector: candidateVector,
      topK,
      filter: { type: 'job' },
      includeMetadata: true
    });
    
    return (queryResponse.matches || []) as PineconeMatch[];
  } catch (error) {
    console.error('Error finding similar jobs:', error);
    throw new Error('Failed to find similar jobs');
  }
}

export async function updateCandidateVector(
  candidateId: string,
  vector: number[],
  metadata: VectorMetadata
): Promise<void> {
  try {
    await storeCandidateVector(candidateId, vector, metadata);
  } catch (error) {
    console.error('Error updating candidate vector:', error);
    throw new Error('Failed to update candidate vector');
  }
}

export async function deleteCandidateVector(candidateId: string): Promise<void> {
  try {
    const index = await getPineconeIndex();
    
    await index.deleteOne(`candidate_${candidateId}`);
  } catch (error) {
    console.error('Error deleting candidate vector:', error);
    throw new Error('Failed to delete candidate vector');
  }
}

export async function deleteJobVector(jobId: string): Promise<void> {
  try {
    const index = await getPineconeIndex();
    
    await index.deleteOne(`job_${jobId}`);
  } catch (error) {
    console.error('Error deleting job vector:', error);
    throw new Error('Failed to delete job vector');
  }
}
