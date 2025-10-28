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

const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'talenta-candidates';

export { pc };

export async function initializePineconeIndex() {
  try {
    const indexList = await pc.listIndexes();
    
    const indexExists = indexList.indexes?.some(index => index.name === INDEX_NAME);
    
    if (!indexExists) {
      await pc.createIndex({
        name: INDEX_NAME,
        dimension: 1024,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: process.env.PINECONE_ENVIRONMENT || 'us-east-1'
          }
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    return pc.index(INDEX_NAME);
  } catch (error) {
    console.error('Error initializing Pinecone index:', error);
    throw new Error('Failed to initialize Pinecone index');
  }
}

export async function getPineconeIndex() {
  try {
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