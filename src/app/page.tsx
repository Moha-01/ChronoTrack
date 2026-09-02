import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/common/page-header';
import { EmployeeList } from '@/components/employees/employee-list';

export default function HomePage() {
  return (
    <AppShell width="narrow" showSettings>
      <PageHeader
        title="Zeiterfassung"
        description="Wählen Sie einen Mitarbeiter, um dessen Monatsnachweis zu bearbeiten."
      />
      <EmployeeList />
    </AppShell>
  );
}
