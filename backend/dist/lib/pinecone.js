"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pc = void 0;
exports.initializePineconeIndex = initializePineconeIndex;
exports.getPineconeIndex = getPineconeIndex;
exports.storeCandidateVector = storeCandidateVector;
exports.storeJobVector = storeJobVector;
exports.findSimilarCandidates = findSimilarCandidates;
exports.findSimilarJobs = findSimilarJobs;
exports.updateCandidateVector = updateCandidateVector;
exports.deleteCandidateVector = deleteCandidateVector;
exports.deleteJobVector = deleteJobVector;
const pinecone_1 = require("@pinecone-database/pinecone");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
if (!process.env.PINECONE_API_KEY) {
    console.warn('PINECONE_API_KEY is not set in environment variables');
}
if (!process.env.PINECONE_ENVIRONMENT) {
    console.warn('PINECONE_ENVIRONMENT is not set in environment variables');
}
const pc = new pinecone_1.Pinecone({
    apiKey: process.env.PINECONE_API_KEY || '',
});
exports.pc = pc;
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'talenta-candidates';
// Initialize Pinecone index
async function initializePineconeIndex() {
    try {
        const indexList = await pc.listIndexes();
        // Check if index exists
        const indexExists = indexList.indexes?.some(index => index.name === INDEX_NAME);
        if (!indexExists) {
            console.log(`Creating Pinecone index: ${INDEX_NAME}`);
            await pc.createIndex({
                name: INDEX_NAME,
                dimension: 1024, // OpenAI text-embedding-ada-002 dimension
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
    }
    catch (error) {
        console.error('Error initializing Pinecone index:', error);
        throw new Error('Failed to initialize Pinecone index');
    }
}
// Get existing index
async function getPineconeIndex() {
    try {
        return pc.index(INDEX_NAME);
    }
    catch (error) {
        console.error('Error getting Pinecone index:', error);
        throw new Error('Failed to get Pinecone index');
    }
}
// Store candidate vector in Pinecone
async function storeCandidateVector(candidateId, vector, metadata) {
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
    }
    catch (error) {
        console.error('Error storing candidate vector:', error);
        throw new Error('Failed to store candidate vector');
    }
}
// Store job vector in Pinecone
async function storeJobVector(jobId, vector, metadata) {
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
    }
    catch (error) {
        console.error('Error storing job vector:', error);
        throw new Error('Failed to store job vector');
    }
}
// Find similar candidates for a job
async function findSimilarCandidates(jobVector, topK = 10) {
    try {
        const index = await getPineconeIndex();
        const queryResponse = await index.query({
            vector: jobVector,
            topK,
            filter: { type: 'candidate' },
            includeMetadata: true
        });
        return (queryResponse.matches || []);
    }
    catch (error) {
        console.error('Error finding similar candidates:', error);
        throw new Error('Failed to find similar candidates');
    }
}
// Find similar jobs for a candidate
async function findSimilarJobs(candidateVector, topK = 20) {
    try {
        const index = await getPineconeIndex();
        const queryResponse = await index.query({
            vector: candidateVector,
            topK,
            filter: { type: 'job' },
            includeMetadata: true
        });
        return (queryResponse.matches || []);
    }
    catch (error) {
        console.error('Error finding similar jobs:', error);
        throw new Error('Failed to find similar jobs');
    }
}
// Update candidate vector
async function updateCandidateVector(candidateId, vector, metadata) {
    try {
        await storeCandidateVector(candidateId, vector, metadata);
    }
    catch (error) {
        console.error('Error updating candidate vector:', error);
        throw new Error('Failed to update candidate vector');
    }
}
// Delete candidate vector
async function deleteCandidateVector(candidateId) {
    try {
        const index = await getPineconeIndex();
        await index.deleteOne(`candidate_${candidateId}`);
        console.log(`Deleted vector for candidate: ${candidateId}`);
    }
    catch (error) {
        console.error('Error deleting candidate vector:', error);
        throw new Error('Failed to delete candidate vector');
    }
}
// Delete job vector
async function deleteJobVector(jobId) {
    try {
        const index = await getPineconeIndex();
        await index.deleteOne(`job_${jobId}`);
        console.log(`Deleted vector for job: ${jobId}`);
    }
    catch (error) {
        console.error('Error deleting job vector:', error);
        throw new Error('Failed to delete job vector');
    }
}
