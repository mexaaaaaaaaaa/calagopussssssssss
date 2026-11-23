import React from 'react';
import { Save } from 'lucide-react';
import type { CalagopusServerDetail } from '../api/calagopusCore';
import type { CalagopusStartupConfig } from '../api/calagopusModules';
import { Button } from '../components/Button';
import { SelectDropdown, TextInput } from '../components/FormControls';
import { showToast } from '../components/Overlays';
import { Card, PageHeader, StatusBadge } from '../components/Surface';

export interface ServerStartupPageProps {
  server: CalagopusServerDetail;
  startup: CalagopusStartupConfig;
  onUpdateDockerImage: (dockerImage: string) => Promise<void> | void;
  onUpdateVariable: (envKey: string, value: string) => Promise<void> | void;
}

export function ServerStartupPage({
  server,
  startup,
  onUpdateDockerImage,
  onUpdateVariable,
}: ServerStartupPageProps) {
  const [draftValues, setDraftValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(startup.variables.map((v) => [v.envKey, v.value])),
  );

  React.useEffect(() => {
    setDraftValues(Object.fromEntries(startup.variables.map((v) => [v.envKey, v.value])));
  }, [startup]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Startup Configuration"
        description={`Inspect launch arguments, select container runtime image, and edit environment variables for ${server.name}.`}
        metadata={[server.eggName, server.javaOrRuntime]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Startup Command"
          description="Resolved dynamically by Calagopus from the variables configured below."
        >
          <pre className="overflow-x-auto rounded-lg border border-[var(--calagopus-border)] bg-[#17151E] p-3.5 font-mono text-[12px] text-[#FFF8FA]">
            {startup.startupCommand}
          </pre>
        </Card>

        <Card
          title="Docker Image"
          description="Select the container image tag used on next server boot."
        >
          <SelectDropdown
            label="Container Runtime"
            value={startup.dockerImage}
            onChange={async (val) => {
              if (!val) return;
              try {
                await Promise.resolve(onUpdateDockerImage(val));
                showToast({
                  title: 'Docker image updated',
                  message: 'Restart the server to apply the updated runtime image.',
                  tone: 'success',
                });
              } catch {
                // Error surfaced by caller
              }
            }}
            data={[...startup.availableImages]}
          />
        </Card>
      </div>

      <Card
        title="Environment Variables"
        description="Egg variables injected into your server runtime environment."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {startup.variables.map((variable) => {
            const currentVal = draftValues[variable.envKey] ?? variable.value;
            const isDirty = currentVal !== variable.value;

            return (
              <form
                key={variable.envKey}
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!variable.isEditable) return;
                  try {
                    await Promise.resolve(onUpdateVariable(variable.envKey, currentVal.trim()));
                    showToast({
                      title: 'Variable saved',
                      message: `${variable.envKey} updated.`,
                      tone: 'success',
                    });
                  } catch {
                    // Error surfaced by caller
                  }
                }}
                className="rounded-xl border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--calagopus-text)]">{variable.name}</p>
                    <p className="font-mono text-[11px] text-[var(--calagopus-primary-text)]">{variable.envKey}</p>
                  </div>
                  <StatusBadge
                    tone={variable.isEditable ? 'neutral' : 'warning'}
                    label={variable.isEditable ? 'Editable' : 'Read-only'}
                    showIcon={false}
                  />
                </div>

                <p className="text-[12px] text-[var(--calagopus-text-secondary)] leading-relaxed">{variable.description}</p>

                <div className="flex items-end gap-2">
                  <TextInput
                    aria-label={variable.name}
                    value={currentVal}
                    disabled={!variable.isEditable}
                    onChange={(e) =>
                      setDraftValues((prev) => ({
                        ...prev,
                        [variable.envKey]: e.currentTarget.value,
                      }))
                    }
                  />
                  {variable.isEditable ? (
                    <Button
                      type="submit"
                      variant={isDirty ? 'primary' : 'secondary'}
                      size="md"
                      disabled={!isDirty || !currentVal.trim()}
                      leftIcon={<Save className="h-3.5 w-3.5" />}
                    >
                      Save
                    </Button>
                  ) : null}
                </div>
              </form>
            );
          })}
        </div>
      </Card>

      <Card
        title="JVM & Runtime Flag Presets"
        description="Recommended Aikar G1GC flags for Paper/Purpur Minecraft 1.21 servers (copy to Egg startup override if allowed by host)."
      >
        <pre className="overflow-x-auto rounded-lg border border-[var(--calagopus-border)] bg-[#17151E] p-3.5 font-mono text-[11.5px] text-[#FCE7EF]">
          -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -XX:InitiatingHeapOccupancyPercent=15
        </pre>
      </Card>
    </div>
  );
}

