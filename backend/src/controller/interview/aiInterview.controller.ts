import { Request, Response } from 'express';
import {
  createInterview,
  assignInterview,
  startInterview,
  submitResponse,
  streamSubmitResponse,
  endInterview,
  getInterviewForCandidate,
  getInterviewDetails,
  getCandidateInterviews,
  getRecruiterInterviews,
  uploadInterviewVideo,
  getInterviewVideoUrl,
  logViolation,
} from '../../services/interview/aiInterview.service';
import { s3GetObjectStream } from '../../lib/s3';
import prisma from '../../lib/prisma';

/**
 * Create a new AI interview session
 * POST /api/v1/interviews
 */
export const createInterviewController = async (req: Request, res: Response) => {
  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { applicationId, jobId, interviewType } = req.body;

    if (!applicationId) {
      return res.status(400).json({ success: false, error: 'applicationId is required' });
    }

    const result = await createInterview({
      candidateId,
      applicationId,
      jobId,
      interviewType: interviewType || 'screening',
    });

    return res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    console.error('Create interview error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

/**
 * Start an interview session (generates questions and returns first question)
 * POST /api/v1/interviews/:interviewId/start
 */
export const startInterviewController = async (req: Request, res: Response) => {
  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const interviewId = req.params.interviewId as string;
    if (!interviewId) {
      return res.status(400).json({ success: false, error: 'interviewId is required' });
    }

    const result = await startInterview({
      interviewId,
      candidateId,
    });

    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Start interview error:', err);

    if (err.message === 'Interview not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message === 'Unauthorized access to interview') {
      return res.status(403).json({ success: false, error: err.message });
    }
    if (err.message?.includes('cannot be started')) {
      return res.status(400).json({ success: false, error: err.message });
    }

    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

/**
 * Submit a response to a question
 * POST /api/v1/interviews/:interviewId/respond
 */
export const submitResponseController = async (req: Request, res: Response) => {
  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const interviewId = req.params.interviewId as string;
    const { questionId, responseText, responseDuration } = req.body;

    if (!interviewId) {
      return res.status(400).json({ success: false, error: 'interviewId is required' });
    }
    if (!questionId) {
      return res.status(400).json({ success: false, error: 'questionId is required' });
    }
    if (!responseText) {
      return res.status(400).json({ success: false, error: 'responseText is required' });
    }

    const result = await submitResponse({
      interviewId,
      candidateId,
      questionId,
      responseText,
      responseDuration: responseDuration || 0,
    });

    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Submit response error:', err);

    if (err.message === 'Interview not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message === 'Unauthorized access to interview') {
      return res.status(403).json({ success: false, error: err.message });
    }
    if (err.message === 'Question not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message?.includes('Cannot submit response')) {
      return res.status(400).json({ success: false, error: err.message });
    }

    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

/**
 * Submit response with SSE streaming — streams question text chunks then done event
 * POST /api/v1/interviews/:interviewId/respond-stream
 */
export const submitResponseStreamController = async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) { send({ type: 'error', error: 'Unauthorized' }); return res.end(); }

    const interviewId = req.params.interviewId as string;
    const { questionId, responseText, responseDuration } = req.body;

    if (!questionId || !responseText) {
      send({ type: 'error', error: 'questionId and responseText are required' });
      return res.end();
    }

    for await (const event of streamSubmitResponse({ interviewId, candidateId, questionId, responseText, responseDuration: responseDuration || 0 })) {
      send(event);
      if (event.type === 'done' || event.type === 'error') break;
    }

    res.end();
  } catch (err: any) {
    console.error('Stream submit response error:', err);
    try { res.write(`data: ${JSON.stringify({ type: 'error', error: err.message || 'Internal server error' })}\n\n`); } catch {}
    res.end();
  }
};

/**
 * End the interview and get final evaluation
 * POST /api/v1/interviews/:interviewId/end
 */
export const endInterviewController = async (req: Request, res: Response) => {
  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const interviewId = req.params.interviewId as string;
    if (!interviewId) {
      return res.status(400).json({ success: false, error: 'interviewId is required' });
    }

    const result = await endInterview({
      interviewId,
      candidateId,
    });

    // Return limited info to candidate (no detailed scores)
    return res.json({
      success: true,
      data: {
        interviewId: result.interviewId,
        status: result.status,
        duration: result.duration,
        completedAt: result.completedAt,
        // Note: qualification and scores are NOT exposed to candidates
      },
    });
  } catch (err: any) {
    console.error('End interview error:', err);

    if (err.message === 'Interview not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message === 'Unauthorized access to interview') {
      return res.status(403).json({ success: false, error: err.message });
    }
    if (err.message?.includes('Cannot end interview')) {
      return res.status(400).json({ success: false, error: err.message });
    }

    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

/**
 * Get interview status (for candidates - limited info)
 * GET /api/v1/interviews/:interviewId
 */
export const getInterviewController = async (req: Request, res: Response) => {
  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const interviewId = req.params.interviewId as string;
    if (!interviewId) {
      return res.status(400).json({ success: false, error: 'interviewId is required' });
    }

    const result = await getInterviewForCandidate(interviewId, candidateId);

    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Get interview error:', err);

    if (err.message === 'Interview not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message === 'Unauthorized access to interview') {
      return res.status(403).json({ success: false, error: err.message });
    }

    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

/**
 * Get full interview details (for admins/recruiters only)
 * GET /api/v1/interviews/:interviewId/details
 */
export const getInterviewDetailsController = async (req: Request, res: Response) => {
  try {
    // Check if user is admin or recruiter
    const userRole = req.user?.role;
    if (!userRole || !['superadmin', 'company_admin', 'agency_admin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied. Admin/recruiter role required.' });
    }

    const interviewId = req.params.interviewId as string;
    if (!interviewId) {
      return res.status(400).json({ success: false, error: 'interviewId is required' });
    }

    const result = await getInterviewDetails(interviewId);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Interview not found' });
    }

    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Get interview details error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

// ==================== Recruiter Routes ====================

/**
 * Assign an interview to a candidate (recruiter only)
 * POST /api/v1/interviews/assign
 */
export const assignInterviewController = async (req: Request, res: Response) => {
  try {
    const recruiterId = req.user?.user_id;
    const userRole = req.user?.role;

    // Only recruiters/admins can assign interviews
    if (!recruiterId || !userRole || !['superadmin', 'company_admin', 'agency_admin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied. Recruiter role required.' });
    }

    const { candidateId, applicationId, jobId, interviewType, scheduledDate, softSkillWeight } = req.body;

    if (!candidateId) {
      return res.status(400).json({ success: false, error: 'candidateId is required' });
    }
    if (!applicationId) {
      return res.status(400).json({ success: false, error: 'applicationId is required' });
    }
    if (!jobId) {
      return res.status(400).json({ success: false, error: 'jobId is required' });
    }
    if (!scheduledDate) {
      return res.status(400).json({ success: false, error: 'scheduledDate is required' });
    }

    const result = await assignInterview({
      recruiterId,
      candidateId,
      applicationId,
      jobId,
      interviewType: interviewType || 'screening',
      scheduledDate: new Date(scheduledDate),
      softSkillWeight: softSkillWeight !== undefined ? Number(softSkillWeight) : 70,
    });

    return res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    console.error('Assign interview error:', err);

    if (err.message === 'Application not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message?.includes('does not match') || err.message?.includes('does not belong')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (err.message === 'Interview already assigned for this application') {
      return res.status(409).json({ success: false, error: err.message });
    }

    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

/**
 * Get all interviews for the company (recruiter view)
 * GET /api/v1/interviews/company
 */
export const getCompanyInterviewsController = async (req: Request, res: Response) => {
  try {
    const recruiterId = req.user?.user_id;
    const userRole = req.user?.role;

    if (!recruiterId || !userRole || !['superadmin', 'company_admin', 'agency_admin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied. Recruiter role required.' });
    }

    // For company_admin, also filter by company
    // For superadmin, show all
    const companyId = userRole === 'company_admin' ? recruiterId : undefined;

    const result = await getRecruiterInterviews(recruiterId, companyId);

    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Get company interviews error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

// ==================== Candidate Routes ====================

/**
 * Get all interviews for the candidate (their assigned interviews)
 * GET /api/v1/interviews/my
 */
export const getMyInterviewsController = async (req: Request, res: Response) => {
  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const result = await getCandidateInterviews(candidateId);

    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Get my interviews error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

// ==================== Video Upload Routes ====================

/**
 * Upload interview video recording
 * POST /api/v1/interviews/:interviewId/upload-video
 */
export const uploadVideoController = async (req: Request, res: Response) => {
  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const interviewId = req.params.interviewId as string;
    if (!interviewId) {
      return res.status(400).json({ success: false, error: 'interviewId is required' });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No video file provided' });
    }

    console.log(`📹 Uploading video for interview ${interviewId}, size: ${req.file.size} bytes`);

    const result = await uploadInterviewVideo({
      interviewId,
      candidateId,
      videoBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
    });

    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Upload video error:', err);

    if (err.message === 'Interview not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message === 'Unauthorized access to interview') {
      return res.status(403).json({ success: false, error: err.message });
    }
    if (err.message?.includes('Cannot upload video')) {
      return res.status(400).json({ success: false, error: err.message });
    }

    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

/**
 * Get signed URL for video playback (recruiter only)
 * GET /api/v1/interviews/:interviewId/video-url
 */
export const getVideoUrlController = async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role;

    // Only recruiters/admins can access video URLs
    if (!userRole || !['superadmin', 'company_admin', 'agency_admin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied. Recruiter role required.' });
    }

    const interviewId = req.params.interviewId as string;
    if (!interviewId) {
      return res.status(400).json({ success: false, error: 'interviewId is required' });
    }

    const result = await getInterviewVideoUrl(interviewId);

    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Get video URL error:', err);

    if (err.message === 'Interview not found') {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err.message === 'No video recording available') {
      return res.status(404).json({ success: false, error: err.message });
    }

    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

/**
 * Log a face detection violation (proctoring)
 * POST /api/v1/interviews/:interviewId/log-violation
 */
export const logViolationController = async (req: Request, res: Response) => {
  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const interviewId = req.params.interviewId as string;
    const { type, faceCount } = req.body;

    if (!type || !['NO_FACE', 'MULTIPLE_FACES', 'TAB_SWITCH', 'WINDOW_BLUR', 'PHONE_DETECTED', 'LOOKING_AWAY'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid violation type' });
    }

    await logViolation(interviewId, candidateId, type, faceCount ?? 0);

    return res.json({ success: true });
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

/**
 * Stream video directly from S3 (bypasses CORS issues)
 * GET /api/v1/interviews/:interviewId/video-stream
 * Uses Authorization header from checkAuth middleware
 */
export const streamVideoController = async (req: Request, res: Response) => {
  try {
    // Get user from checkAuth middleware
    const userRole = req.user?.role;

    // Debug logging
    console.log('🎬 Video stream request:', {
      hasReqUser: !!req.user,
      userRole,
      userId: req.user?.user_id,
      interviewId: req.params.interviewId,
    });

    // Only recruiters/admins can access videos
    if (!userRole || !['superadmin', 'company_admin', 'agency_admin'].includes(userRole)) {
      console.error('❌ Access denied - invalid role:', userRole);
      return res.status(403).json({ success: false, error: 'Access denied. Recruiter role required.' });
    }

    const interviewId = req.params.interviewId as string;
    if (!interviewId) {
      return res.status(400).json({ success: false, error: 'interviewId is required' });
    }

    // Get the video key from the interview
    const interview = await prisma.aIInterviewResult.findUnique({
      where: { interview_id: interviewId },
      select: { video_url: true },
    });

    if (!interview) {
      return res.status(404).json({ success: false, error: 'Interview not found' });
    }

    if (!interview.video_url) {
      return res.status(404).json({ success: false, error: 'No video recording available' });
    }

    // Stream the video from S3
    const { body, contentType, contentLength } = await s3GetObjectStream(interview.video_url);

    if (!body) {
      return res.status(404).json({ success: false, error: 'Video file not found in storage' });
    }

    // Set response headers for video streaming
    res.setHeader('Content-Type', contentType || 'video/webm');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Pipe the S3 stream to the response
    // @ts-ignore - body is a Readable stream
    body.pipe(res);
  } catch (err: any) {
    console.error('Stream video error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

/**
 * Google Translate TTS fallback (chunked, max 200 chars per request)
 * POST /api/v1/interviews/tts/fallback
 */
export const synthesizeTTSFallbackController = async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ success: false, error: 'text is required' });
  }

  try {
    // Split into chunks ≤200 chars at sentence/word boundaries
    const chunks: string[] = [];
    const sentences = text.trim().split(/(?<=[.!?,])\s+/);
    let current = '';
    for (const sentence of sentences) {
      if ((current + ' ' + sentence).trim().length > 200) {
        if (current.trim()) chunks.push(current.trim());
        current = sentence;
      } else {
        current = (current + ' ' + sentence).trim();
      }
    }
    if (current.trim()) chunks.push(current.trim());

    const audioBuffers: Buffer[] = [];
    for (const chunk of chunks) {
      const url =
        `https://translate.google.com/translate_tts?ie=UTF-8` +
        `&q=${encodeURIComponent(chunk)}&tl=en&client=tw-ob&ttsspeed=0.9`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://translate.google.com/',
          Accept: 'audio/mpeg, audio/*',
        },
      });
      if (!response.ok) throw new Error(`Google TTS ${response.status}`);
      audioBuffers.push(Buffer.from(await response.arrayBuffer()));
    }

    const audio = Buffer.concat(audioBuffers);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audio.length);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(audio);
  } catch (err: any) {
    console.error('TTS fallback error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Text-to-Speech via Unreal Speech — fallback to browser Web Speech API on error
 * POST /api/v1/interviews/tts
 */
export const synthesizeTTSController = async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ success: false, error: 'text is required' });
  }

  try {
    const response = await fetch('https://api.v8.unrealspeech.com/stream', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.UNREAL_SPEECH_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Text: text.trim(),
        VoiceId: process.env.UNREAL_SPEECH_VOICE_ID || 'Luna',
        Bitrate: '192k',
        Speed: 0,
        Pitch: 1.0,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Unreal Speech error (${response.status}): ${body}`);
    }

    const audio = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audio.length);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(audio);
  } catch (err: any) {
    console.error('TTS error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
