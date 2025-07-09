import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

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

// Initialize Pinecone index
export async function initializePineconeIndex() {
  try {
    const indexList = await pc.listIndexes();
    
    // Check if index exists
    const indexExists = indexList.indexes?.some(index => index.name === INDEX_NAME);
    
    if (!indexExists) {
      console.log(`Creating Pinecone index: ${INDEX_NAME}`);
      await pc.createIndex({
        name: INDEX_NAME,
        dimension: 1536, // OpenAI text-embedding-ada-002 dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: process.env.PINECONE_ENVIRONMENT || 'us-east-1'
          }
        }
      });
      
      // Wait for index to be ready
      console.log('Waiting for index to be ready...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    return pc.index(INDEX_NAME);
  } catch (error) {
    console.error('Error initializing Pinecone index:', error);
    throw new Error('Failed to initialize Pinecone index');
  }
}

// Get existing index
export async function getPineconeIndex() {
  try {
    return pc.index(INDEX_NAME);
  } catch (error) {
    console.error('Error getting Pinecone index:', error);
    throw new Error('Failed to get Pinecone index');
  }
}

// Store candidate vector in Pinecone
export async function storeCandidateVector(
  candidateId: string,
  vector: number[],
  metadata: Record<string, any>
) {
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
    
    console.log(`Stored vector for candidate: ${candidateId}`);
  } catch (error) {
    console.error('Error storing candidate vector:', error);
    throw new Error('Failed to store candidate vector');
  }
}

// Store job vector in Pinecone
export async function storeJobVector(
  jobId: string,
  vector: number[],
  metadata: Record<string, any>
) {
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
    
    console.log(`Stored vector for job: ${jobId}`);
  } catch (error) {
    console.error('Error storing job vector:', error);
    throw new Error('Failed to store job vector');
  }
}

// Find similar candidates for a job
export async function findSimilarCandidates(
  jobVector: number[],
  topK: number = 10
) {
  try {
    const index = await getPineconeIndex();
    
    const queryResponse = await index.query({
      vector: jobVector,
      topK,
      filter: { type: 'candidate' },
      includeMetadata: true
    });
    
    return queryResponse.matches || [];
  } catch (error) {
    console.error('Error finding similar candidates:', error);
    throw new Error('Failed to find similar candidates');
  }
}

// Find similar jobs for a candidate
export async function findSimilarJobs(
  candidateVector: number[],
  topK: number = 20
) {
  try {
    const index = await getPineconeIndex();
    
    const queryResponse = await index.query({
      vector: candidateVector,
      topK,
      filter: { type: 'job' },
      includeMetadata: true
    });
    
    return queryResponse.matches || [];
  } catch (error) {
    console.error('Error finding similar jobs:', error);
    throw new Error('Failed to find similar jobs');
  }
}

// Update candidate vector
export async function updateCandidateVector(
  candidateId: string,
  vector: number[],
  metadata: Record<string, any>
) {
  try {
    await storeCandidateVector(candidateId, vector, metadata);
  } catch (error) {
    console.error('Error updating candidate vector:', error);
    throw new Error('Failed to update candidate vector');
  }
}

// Delete candidate vector
export async function deleteCandidateVector(candidateId: string) {
  try {
    const index = await getPineconeIndex();
    
    await index.deleteOne(`candidate_${candidateId}`);
    console.log(`Deleted vector for candidate: ${candidateId}`);
  } catch (error) {
    console.error('Error deleting candidate vector:', error);
    throw new Error('Failed to delete candidate vector');
  }
}

// Delete job vector
export async function deleteJobVector(jobId: string) {
  try {
    const index = await getPineconeIndex();
    
    await index.deleteOne(`job_${jobId}`);
    console.log(`Deleted vector for job: ${jobId}`);
  } catch (error) {
    console.error('Error deleting job vector:', error);
    throw new Error('Failed to delete job vector');
  }
}