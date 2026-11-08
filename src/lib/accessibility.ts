// Step-free wording for a station. It says only what TfL told us: the step-free option the journey was
// planned with, and the lifts, stairs and so on TfL lists for the interchange. TfL doesn't publish a
// station-by-station answer to "step-free to the platform or onto the train", so we never infer one.
import type { StepFreeLevel } from "@/lib/transport/types";

export function stepFreeNote(level: StepFreeLevel | undefined, features: string[]): string {
  if (level === "train") {
    return "Step-free all the way onto the train. TfL planned this journey with that option.";
  }
  if (level === "platform") {
    return "Step-free to the platform. TfL planned this journey with that option, and doesn’t say whether there is a step or gap onto the train.";
  }
  if (features.length > 0) {
    return `Not planned as step-free. TfL lists: ${features.join(", ")}.`;
  }
  return "TfL gives no step-free details here. Choose a step-free option on the routes page to plan for one.";
}

export const STEP_FREE_LABEL: Record<StepFreeLevel, string> = {
  platform: "Step-free to platform",
  train: "Step-free to train",
};
