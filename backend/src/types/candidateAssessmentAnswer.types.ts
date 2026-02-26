/**Answer payload types:

SaveAnswerInput (MCQ + CODING)

AnswerState (draft/final)

MCQAnswerPayload

CodingAnswerPayload */
export type AnswerState = "DRAFT" | "FINAL";

export type MCQAnswerPayload = {
  selectedOptionIds: string[]; // support multi/single
};

export type CodingAnswerPayload = {
  language: string;
  code: string;
  // optional: last run info
  lastRun?: {
    status?: string;
    runtimeMs?: number;
    memoryKb?: number;
    stdout?: string;
    stderr?: string;
  };
};

export type SaveAnswerInput = {
  payload: MCQAnswerPayload | CodingAnswerPayload;
  isFinal?: boolean;
  isFlagged?: boolean;
};
