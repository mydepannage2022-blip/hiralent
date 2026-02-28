/**Telemetry:

TelemetryEventType (QUESTION_VIEW, FLAG_TOGGLE, ANSWER_CHANGED, CODE_RUN, NAVIGATE, AUTO_SUBMIT, …)

TelemetryEventInput */
export type TelemetryEventType =
  | "QUESTION_VIEW"
  | "NAVIGATE"
  | "FLAG_TOGGLE"
  | "ANSWER_CHANGED"
  | "CODE_RUN"
  | "CODE_SUBMIT"
  | "AUTO_SAVE"
  | "AUTO_SUBMIT"
  | "FOCUS_BLUR"
  | "COPY_PASTE"
  | "FULLSCREEN_EXIT"
  | "TAB_HIDDEN"
  | "ERROR";

export type TelemetryEventInput = {
  type: TelemetryEventType;
  ts?: string; // ISO optional (server will default now)
  question_id?: string;
  metadata?: Record<string, any>;
};
