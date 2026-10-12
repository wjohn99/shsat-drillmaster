import { TutorDashboard } from "./TutorDashboard";
import { StudentDashboard } from "./StudentDashboard";
import { ParentDashboard } from "./ParentDashboard";
import { useAuth } from "@/contexts/AuthContext";

export function DashboardRouter() {
  const { profile } = useAuth();

  if (!profile) {
    return null;
  }

  if (profile.role === "tutor") {
    return <TutorDashboard />;
  }

  if (profile.role === "parent") {
    return <ParentDashboard />;
  }

  return <StudentDashboard />;
}
