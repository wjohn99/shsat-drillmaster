import type { WorksheetAssignment } from "@/types/assignment";

export type WorksheetsLocationState = {
  openTutorBuild?: boolean;
  openStudentBuild?: boolean;
  autoStartAssignment?: WorksheetAssignment;
};
