"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionType = exports.DifficultyLevel = exports.AssessmentStatus = exports.AssessmentType = void 0;
// Enums (should match Prisma schema)
var AssessmentType;
(function (AssessmentType) {
    AssessmentType["QUICK_CHECK"] = "QUICK_CHECK";
    AssessmentType["COMPREHENSIVE"] = "COMPREHENSIVE";
    AssessmentType["CERTIFICATION"] = "CERTIFICATION";
    AssessmentType["COMPANY_SPECIFIC"] = "COMPANY_SPECIFIC";
})(AssessmentType || (exports.AssessmentType = AssessmentType = {}));
var AssessmentStatus;
(function (AssessmentStatus) {
    AssessmentStatus["PENDING"] = "PENDING";
    AssessmentStatus["IN_PROGRESS"] = "IN_PROGRESS";
    AssessmentStatus["COMPLETED"] = "COMPLETED";
    AssessmentStatus["EXPIRED"] = "EXPIRED";
    AssessmentStatus["CANCELLED"] = "CANCELLED";
})(AssessmentStatus || (exports.AssessmentStatus = AssessmentStatus = {}));
var DifficultyLevel;
(function (DifficultyLevel) {
    DifficultyLevel["BEGINNER"] = "BEGINNER";
    DifficultyLevel["INTERMEDIATE"] = "INTERMEDIATE";
    DifficultyLevel["ADVANCED"] = "ADVANCED";
    DifficultyLevel["EXPERT"] = "EXPERT";
})(DifficultyLevel || (exports.DifficultyLevel = DifficultyLevel = {}));
var QuestionType;
(function (QuestionType) {
    QuestionType["MCQ"] = "MCQ";
    QuestionType["CODING"] = "CODING";
    QuestionType["ESSAY"] = "ESSAY";
    QuestionType["TRUE_FALSE"] = "TRUE_FALSE";
    QuestionType["SCENARIO"] = "SCENARIO";
})(QuestionType || (exports.QuestionType = QuestionType = {}));
