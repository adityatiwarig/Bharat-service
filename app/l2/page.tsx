import { OfficerDashboard } from '@/components/officer-dashboard';
import { requireOfficerUser } from '@/lib/server/auth';
import { getOfficerDashboardSummary } from '@/lib/server/dashboard';

export default async function L2DashboardPage() {
  const user = await requireOfficerUser(['L2']);
  const summary = await getOfficerDashboardSummary(user);

  return (
    <OfficerDashboard
      title="L2 Dashboard"
      level="L2"
      summary={summary}
      userName={user.name}
      departmentName={user.officer_department_name}
      wardId={user.officer_ward_id}
    />
  );
}
