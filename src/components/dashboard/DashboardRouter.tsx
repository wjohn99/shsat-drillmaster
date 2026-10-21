import { TutorDashboard } from "./TutorDashboard";
import { StudentDashboard } from "./StudentDashboard";
import { ParentDashboard } from "./ParentDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useViewAsStudent } from "@/contexts/ViewAsStudentContext";

export function DashboardRouter() {
  const { profile } = useAuth();
  const { viewAs } = useViewAsStudent();

  if (!profile) {
    return null;
  }

  if ((profile.role === "tutor" || profile.role === "demo") && viewAs) {
    return <StudentDashboard viewAs={viewAs} />;
  }

  if (profile.role === "tutor" || profile.role === "demo") {
    return <TutorDashboard />;
  }

  if (profile.role === "parent") {
    return <ParentDashboard />;
  }

  return <StudentDashboard />;
}
