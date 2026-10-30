import { redirect } from "next/navigation";

export default function LegacyDashboardActivityLogsPage() {
  redirect("/audit");
}
