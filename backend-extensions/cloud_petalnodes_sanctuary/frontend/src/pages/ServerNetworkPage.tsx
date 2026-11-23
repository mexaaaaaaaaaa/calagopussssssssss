import React from 'react';
import { Copy, Network, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import type { CalagopusServerDetail } from '../api/calagopusCore';
import type { CalagopusAllocationRecord } from '../api/calagopusModules';
import { Button } from '../components/Button';
import { DataTable, type TableColumn } from '../components/DataTable';
import { EmptyState } from '../components/FeedbackStates';
import { TextInput } from '../components/FormControls';
import { ConfirmDialog, ModalDialog, showToast } from '../components/Overlays';
import { Card, PageHeader, StatusBadge } from '../components/Surface';

export interface ServerNetworkPageProps {
  server: CalagopusServerDetail;
  allocations: readonly CalagopusAllocationRecord[];
  onSetPrimary: (allocationId: string) => Promise<void> | void;
  onUpdateNotes: (allocationId: string, notes: string) => Promise<void> | void;
  onAllocatePort: () => Promise<void> | void;
  onRemoveAllocation: (allocationId: string) => Promise<void> | void;
  compact?: boolean;
  confirmDestructive?: boolean;
}

export function ServerNetworkPage({
  server,
  allocations,
  onSetPrimary,
  onUpdateNotes,
  onAllocatePort,
  onRemoveAllocation,
  compact = false,
  confirmDestructive = true,
}: ServerNetworkPageProps) {
  const [editingAlloc, setEditingAlloc] = React.useState<CalagopusAllocationRecord | null>(null);
  const [notesValue, setNotesValue] = React.useState('');
  const [removeTarget, setRemoveTarget] = React.useState<CalagopusAllocationRecord | null>(null);

  const columns: readonly TableColumn<CalagopusAllocationRecord>[] = [
    {
      key: 'ip',
      header: 'Endpoint',
      render: (a) => (
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[13px] font-medium text-[var(--calagopus-text)] tabular-nums">
              {a.alias ? `${a.alias}:${a.port}` : `${a.ip}:${a.port}`}
            </p>
            <p className="font-mono text-[12px] text-[var(--calagopus-text-secondary)] tabular-nums">
              {a.ip}:{a.port}
            </p>
          </div>
          <button
            type="button"
            aria-label={`Copy ${a.ip}:${a.port}`}
            onClick={() => {
              const target = a.alias ? `${a.alias}:${a.port}` : `${a.ip}:${a.port}`;
              void navigator.clipboard?.writeText(target);
              showToast({ title: 'Address copied', message: target, tone: 'success' });
            }}
            className="blush-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)] cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (a) => (
        <span className="text-[13px] text-[var(--calagopus-text-secondary)]">{a.notes || 'No notes set'}</span>
      ),
    },
    {
      key: 'isPrimary',
      header: 'Role',
      render: (a) =>
        a.isPrimary ? (
          <StatusBadge tone="pink" label="Primary" showIcon={false} />
        ) : (
          <StatusBadge tone="neutral" label="Secondary" showIcon={false} />
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Network & Allocations"
        description={`Manage IPv4 endpoints, ports, and primary routing for ${server.name}.`}
        metadata={[`${allocations.length} allocations assigned`, `Node ${server.node}`]}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={async () => {
              try {
                await Promise.resolve(onAllocatePort());
                showToast({
                  title: 'Port allocated',
                  message: `Assigned an additional port on ${server.node}.`,
                  tone: 'success',
                });
              } catch {
                // Error surfaced by caller
              }
            }}
          >
            Create Allocation
          </Button>
        }
      />

      <Card
        title="Assigned Ports"
        description="The primary allocation is bound to your container startup address."
      >
        <DataTable
          caption="Server Network Allocations"
          columns={columns}
          rows={allocations}
          compact={compact}
          renderActions={(a) => (
            <div className="inline-flex items-center gap-1.5">
              {!a.isPrimary ? (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Star className="h-3.5 w-3.5" />}
                  onClick={async () => {
                    try {
                      await Promise.resolve(onSetPrimary(a.id));
                      showToast({
                        title: 'Primary allocation updated',
                        message: `${a.ip}:${a.port} is now primary.`,
                        tone: 'success',
                      });
                    } catch {
                      // Error surfaced by caller
                    }
                  }}
                >
                  Make Primary
                </Button>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditingAlloc(a);
                  setNotesValue(a.notes);
                }}
              >
                Notes
              </Button>
              {!a.isPrimary ? (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove port ${a.port}`}
                  leftIcon={<Trash2 className="h-3.5 w-3.5 text-[var(--calagopus-danger-text)]" />}
                  onClick={async () => {
                    if (confirmDestructive) {
                      setRemoveTarget(a);
                    } else {
                      try {
                        await Promise.resolve(onRemoveAllocation(a.id));
                        showToast({
                          title: 'Allocation removed',
                          message: `Released ${a.ip}:${a.port}.`,
                          tone: 'success',
                        });
                      } catch {
                        // Error surfaced by caller
                      }
                    }
                  }}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          )}
          emptyState={
            <EmptyState
              icon={<Network className="h-5 w-5" />}
              title="No allocations assigned"
              description="Allocate an available node port to expose this container."
              actionLabel="Create Allocation"
              onAction={onAllocatePort}
            />
          }
        />
      </Card>

      <ModalDialog
        opened={editingAlloc !== null}
        onClose={() => setEditingAlloc(null)}
        title="Edit Allocation Notes"
        description={editingAlloc ? `${editingAlloc.ip}:${editingAlloc.port}` : undefined}
        size="sm"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editingAlloc) return;
            try {
              await Promise.resolve(onUpdateNotes(editingAlloc.id, notesValue.trim()));
              showToast({ title: 'Notes saved', tone: 'success' });
              setEditingAlloc(null);
            } catch {
              // Error surfaced by caller
            }
          }}
          className="space-y-4"
        >
          <TextInput
            label="Allocation Notes"
            placeholder="e.g. Voice chat UDP listener"
            value={notesValue}
            onChange={(e) => setNotesValue(e.currentTarget.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setEditingAlloc(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Notes
            </Button>
          </div>
        </form>
      </ModalDialog>

      <ConfirmDialog
        opened={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={async () => {
          if (removeTarget) {
            try {
              await Promise.resolve(onRemoveAllocation(removeTarget.id));
              showToast({
                title: 'Allocation removed',
                message: `Released ${removeTarget.ip}:${removeTarget.port}.`,
                tone: 'success',
              });
            } catch {
              // Error surfaced by caller
            }
          }
          setRemoveTarget(null);
        }}
        title="Remove Port Allocation"
        message={`Release secondary port ${removeTarget?.ip}:${removeTarget?.port} from ${server.name}?`}
        confirmLabel="Release Port"
        destructive
      />
    </div>
  );
}
