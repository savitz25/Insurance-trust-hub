import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  moduleRendersAppointment,
  moduleRendersCredential,
  type FloridaProfileModules,
} from '@/lib/national/fl-profile-modules';

export function FloridaProfileModulesSection({
  modules,
}: {
  modules: FloridaProfileModules;
}) {
  const showCred = moduleRendersCredential(modules);
  const showApt = moduleRendersAppointment(modules);
  if (!showCred && !showApt) return null;

  return (
    <section aria-labelledby="florida-profile-modules-heading" className="space-y-4">
      <div>
        <h2 id="florida-profile-modules-heading" className="text-xl font-semibold">
          Florida research evidence
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Exact Florida DFS records attached to this already-public profile. Missing modules
          are omitted — they are not a clean record, zero complaints, or “no appointments.”
        </p>
      </div>

      {showCred ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Florida credential record found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {modules.credentials.map((c, i) => (
              <div key={`${c.licenseNumber}-${i}`}>
                <p>
                  <span className="font-medium">Class:</span> {c.licenseClass || 'Not stated in source'}
                </p>
                <p>
                  <span className="font-medium">Jurisdiction:</span> {c.jurisdiction}
                  {c.licenseNumber ? (
                    <>
                      {' '}
                      · <span className="font-medium">License</span> {c.licenseNumber}
                    </>
                  ) : null}
                </p>
                {c.regulatoryStatus ? (
                  <p>
                    <span className="font-medium">Status:</span> {c.regulatoryStatus}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Source status is unknown on this row. Unknown is not displayed as active or
                    inactive.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Source: {c.sourceDataset || 'Florida DFS'}
                  {c.sourceObservedAt
                    ? ` · as of ${c.sourceObservedAt.slice(0, 10)}`
                    : ' · source clock unavailable on this observation'}
                </p>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              A Florida credential is not an appointment, line of authority, or quality rating.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {showApt && modules.appointments ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Florida appointment evidence found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {modules.appointments.observationCount} source-faithful Florida appointment
              observation{modules.appointments.observationCount === 1 ? '' : 's'}
              {modules.appointments.currentCount
                ? ` · ${modules.appointments.currentCount} current`
                : ''}
              {modules.appointments.historicalCount
                ? ` · ${modules.appointments.historicalCount} historical`
                : ''}
              .
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {modules.appointments.limitation}
            </p>
            <p className="text-xs text-muted-foreground">
              Appointment evidence is not employment, quality, county authorization, or a named
              legal insurer.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
