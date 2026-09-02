import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/common/page-header';
import { ExportCard } from '@/components/data/export-card';
import { ImportCard } from '@/components/data/import-card';
import { LegacyBackupCard } from '@/components/data/legacy-backup-card';
import { DemoDataCard } from '@/components/data/demo-data-card';
import { DangerZone } from '@/components/data/danger-zone';
import { SecurityCard } from '@/components/auth/security-card';

export const metadata: Metadata = {
  title: 'Daten & Einstellungen',
};

export default function SettingsPage() {
  return (
    <AppShell width="narrow" backHref="/" showSettings={false}>
      <PageHeader
        title="Daten & Einstellungen"
        description="Sichern, übertragen und verwalten Sie Ihre Zeiterfassung."
      />

      <div className="space-y-6">
        <section aria-labelledby="security-heading" className="space-y-4">
          <h2 id="security-heading" className="text-sm font-medium text-muted-foreground">
            Sicherheit
          </h2>
          <SecurityCard />
        </section>

        <section aria-labelledby="data-heading" className="space-y-4">
          <h2 id="data-heading" className="text-sm font-medium text-muted-foreground">
            Sicherung
          </h2>
          {/* Die Daten liegen ausschließlich in diesem Browser. Safari räumt
              den Speicher nach längerer Inaktivität auf -- deshalb steht der
              Hinweis hier prominent und nicht im Kleingedruckten. */}
          <p className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
            Ihre Daten werden ausschließlich in diesem Browser gespeichert und nirgendwo
            hochgeladen. Wenn Sie den Browserspeicher leeren oder das Gerät wechseln, sind sie
            ohne Sicherung verloren.
          </p>
          <ExportCard />
          <ImportCard />
          <LegacyBackupCard />
        </section>

        <section aria-labelledby="misc-heading" className="space-y-4">
          <h2 id="misc-heading" className="text-sm font-medium text-muted-foreground">
            Weiteres
          </h2>
          <DemoDataCard />
          <DangerZone />
        </section>
      </div>
    </AppShell>
  );
}
