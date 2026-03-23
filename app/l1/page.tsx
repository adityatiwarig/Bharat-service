import { OfficerDashboard } from '@/components/officer-dashboard';
import { requireOfficerUser } from '@/lib/server/auth';
import { getOfficerDashboardSummary } from '@/lib/server/dashboard';

export default async function L1DashboardPage() {
  const user = await requireOfficerUser(['L1']);
  const summary = await getOfficerDashboardSummary(user);

  return (
    <OfficerDashboard
      title="L1 Dashboard"
      level="L1"
      summary={summary}
      userName={user.name}
      departmentName={user.officer_department_name}
      wardId={user.officer_ward_id}
    />
  );
}
