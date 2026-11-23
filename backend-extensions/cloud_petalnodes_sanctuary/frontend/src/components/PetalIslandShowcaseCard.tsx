import React from 'react';
import { Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { Button, IconButton } from './Button';
import { IslandStaticFallback } from './IslandStaticFallback';
import { Card, StatusBadge } from './Surface';
import type { QualityTier } from './voxelIslandBuilder';

const LazyPetalIslandScene = React.lazy(() => import('./PetalIslandScene'));

export interface PetalIslandShowcaseCardProps {
  onNavigate?: (path: string) => void;
  primaryServerPath?: string;
  primaryServerName?: string;
}

export function PetalIslandShowcaseCard({
  onNavigate,
  primaryServerPath,
  primaryServerName,
}: PetalIslandShowcaseCardProps) {
  const [paused, setPaused] = React.useState(false);
  const [resetSignal, setResetSignal] = React.useState(0);
  const [tier, setTier] = React.useState<QualityTier>('medium');

  return (
    <Card
      title="Petalnodes Sanctuary"
      description="Interactive cherry-blossom voxel world preview — drag gently to orbit."
      headerAction={
        <div className="flex items-center gap-1.5">
          <StatusBadge
            tone={tier === 'static' ? 'neutral' : 'pink'}
            label={tier === 'static' ? 'Static View' : 'Interactive 3D'}
          />
          <IconButton
            aria-label={paused ? 'Resume island animation' : 'Pause island animation'}
            variant="secondary"
            size="sm"
            disabled={tier === 'static'}
            icon={paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            onClick={() => setPaused((prev) => !prev)}
          />
          <IconButton
            aria-label="Reset camera view"
            variant="secondary"
            size="sm"
            disabled={tier === 'static'}
            icon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={() => setResetSignal((prev) => prev + 1)}
          />
        </div>
      }
    >
      <div className="space-y-3">
        <div className="h-[220px] sm:h-[250px] w-full">
          <React.Suspense fallback={<IslandStaticFallback reason="Loading Petalnodes sanctuary..." />}>
            <LazyPetalIslandScene
              paused={paused}
              resetSignal={resetSignal}
              onTierChange={setTier}
            />
          </React.Suspense>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--calagopus-text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[var(--calagopus-primary-text)]" aria-hidden="true" />
            Original procedural voxel textures &middot; Pauses automatically when scrolled off-screen
          </span>
          {onNavigate && primaryServerPath ? (
            <Button
              variant="soft"
              size="sm"
              onClick={() => onNavigate(primaryServerPath)}
            >
              {primaryServerName ? `Open ${primaryServerName}` : 'Open Server Console'}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
