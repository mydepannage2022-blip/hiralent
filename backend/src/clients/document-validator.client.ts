/**
 * Document Validator Service Client
 *
 * Communicates with the Python document-validator-service for AI-powered
 * document validation (OCR, NLP, completeness checks).
 */

import { internalTokenHeader } from "../config/internalServiceAuth";
import { getBackendUrl } from "../config/appUrls";

const DOC_VALIDATOR_URL = process.env.DOC_VALIDATOR_URL || "http://localhost:8002";

// ============ Types ============

export type DocumentType =
  | "passport_copy"
  | "visa_application_form"
  | "bank_statement"
  | "employment_letter"
  | "accommodation_proof";

export interface ValidationSignal {
  signal_type: string;
  passed: boolean;
  score: number;
  details: string;
}

export interface QuickValidationRequest {
  document_id: string;
  storage_key: string;
  document_type: DocumentType;
  mime_type: string;
  expected_data?: Record<string, any>;
}

export interface QuickValidationResponse {
  document_id: string;
  validation_type: "quick";
  status: "passed" | "failed";
  checks: ValidationSignal[];
  can_proceed_to_deep_validation: boolean;
  processing_time_ms: number;
}

export interface DeepValidationRequest {
  document_id: string;
  case_id?: string;
  storage_key: string;
  document_type: DocumentType;
  mime_type: string;
  expected_data?: Record<string, any>;
  callback_url?: string;
}

export interface DeepValidationQueueResponse {
  validation_job_id: string;
  status: "queued";
  estimated_completion_seconds: number;
}

export interface DeepValidationResult {
  validation_job_id: string;
  document_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  overall_confidence?: number;
  overall_status?: "valid" | "invalid" | "needs_review";
  extracted_data?: Record<string, any>;
  validation_signals?: ValidationSignal[];
  issues?: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
  processing_time_ms?: number;
  error_message?: string;
}

export interface HealthCheckResponse {
  service: string;
  version: string;
  status: "healthy" | "degraded" | "unhealthy";
  components: Record<string, {
    status: string;
    message?: string;
  }>;
}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============ Helper Functions ============

async function safeFetch<T>(
  url: string,
  options: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        // Internal service token (X-API-Token) required by the document-validator service.
        ...internalTokenHeader(),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // Type assertion for error response structure
      const errorData = data as { detail?: string; error?: string };
      return {
        ok: false,
        error: errorData.detail || errorData.error || `HTTP ${response.status}`,
      };
    }

    return data as ApiResponse<T>;
  } catch (error: any) {
    console.error(`[DocumentValidator] Request failed:`, error.message);
    return {
      ok: false,
      error: error.message || "Request failed",
    };
  }
}

// ============ Client Functions ============

/**
 * Check if the document validator service is healthy.
 */
export async function checkHealth(): Promise<ApiResponse<HealthCheckResponse>> {
  return safeFetch<HealthCheckResponse>(
    `${DOC_VALIDATOR_URL}/api/v1/health`,
    { method: "GET" }
  );
}

/**
 * Perform quick synchronous validation (format, size, page count).
 * Returns immediately with basic validation results.
 */
export async function validateDocumentQuick(
  request: QuickValidationRequest
): Promise<ApiResponse<QuickValidationResponse>> {
  console.log(`[DocumentValidator] Quick validation for: ${request.document_id}`);

  return safeFetch<QuickValidationResponse>(
    `${DOC_VALIDATOR_URL}/api/v1/documents/validate/quick`,
    {
      method: "POST",
      body: JSON.stringify(request),
    }
  );
}

/**
 * Queue deep asynchronous validation with OCR + NLP.
 * Returns job ID immediately, results sent via webhook.
 */
export async function validateDocumentDeep(
  request: DeepValidationRequest
): Promise<ApiResponse<DeepValidationQueueResponse>> {
  console.log(`[DocumentValidator] Deep validation queued for: ${request.document_id}`);

  // Set default callback URL if not provided
  const payload: DeepValidationRequest = {
    ...request,
    callback_url: request.callback_url ||
      `${getBackendUrl()}/api/v1/webhooks/document-validation`,
  };

  return safeFetch<DeepValidationQueueResponse>(
    `${DOC_VALIDATOR_URL}/api/v1/documents/validate/deep`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

/**
 * Get the result of a validation job.
 * Use this to poll for results if webhook is not available.
 */
export async function getValidationResult(
  jobId: string
): Promise<ApiResponse<DeepValidationResult>> {
  return safeFetch<DeepValidationResult>(
    `${DOC_VALIDATOR_URL}/api/v1/documents/validate/${jobId}/result`,
    { method: "GET" }
  );
}

/**
 * Get the status of a validation job.
 */
export async function getValidationStatus(
  jobId: string
): Promise<ApiResponse<{ job_id: string; status: string }>> {
  return safeFetch<{ job_id: string; status: string }>(
    `${DOC_VALIDATOR_URL}/api/v1/documents/validate/${jobId}/status`,
    { method: "GET" }
  );
}

/**
 * Validate a document with both quick and deep validation.
 * Runs quick first, then queues deep if quick passes.
 */
export async function validateDocumentFull(
  request: DeepValidationRequest
): Promise<{
  quick: ApiResponse<QuickValidationResponse>;
  deep?: ApiResponse<DeepValidationQueueResponse>;
}> {
  // 1. Run quick validation first
  const quickResult = await validateDocumentQuick({
    document_id: request.document_id,
    storage_key: request.storage_key,
    document_type: request.document_type,
    mime_type: request.mime_type,
    expected_data: request.expected_data,
  });

  // 2. If quick validation passed, queue deep validation
  if (quickResult.ok && quickResult.data?.can_proceed_to_deep_validation) {
    const deepResult = await validateDocumentDeep(request);
    return { quick: quickResult, deep: deepResult };
  }

  return { quick: quickResult };
}
