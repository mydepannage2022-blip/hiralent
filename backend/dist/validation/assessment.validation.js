"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitAnswerSchema = exports.startAssessmentSchema = void 0;
const zod_1 = require("zod");
const assessment_types_1 = require("../types/assessment.types");
// Schema for starting an assessment
exports.startAssessmentSchema = zod_1.z.object({
    skillCategory: zod_1.z.string().min(2),
    assessmentType: zod_1.z.nativeEnum(assessment_types_1.AssessmentType),
    difficulty: zod_1.z.nativeEnum(assessment_types_1.DifficultyLevel),
});
// Schema for submitting an answer
exports.submitAnswerSchema = zod_1.z.object({
    questionId: zod_1.z.string().min(1),
    answer: zod_1.z.string().min(1),
    timeTaken: zod_1.z.number().int().min(1),
});
