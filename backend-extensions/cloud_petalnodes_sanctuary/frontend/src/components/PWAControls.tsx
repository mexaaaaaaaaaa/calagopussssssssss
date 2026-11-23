import React from 'react';
import { Download, Smartphone, WifiOff } from 'lucide-react';
import { Button } from './Button';
import { ModalDialog } from './Overlays';
import { useOnlineStatus, usePWAInstall } from '../utils/pwa';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = React.useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <Button
        variant="soft"
        size="sm"
        leftIcon={<Download className="h-3.5 w-3.5" />}
        onClick={() => void install()}
        aria-label="Install Petalnodes App"
      >
        <span className="hidden sm:inline">Install App</span>
      </Button>
    );
  }

  if (isIOS) {
    return (
      <>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Smartphone className="h-3.5 w-3.5" />}
          onClick={() => setShowIOSGuide(true)}
          aria-label="Install Petalnodes on iOS"
        >
          <span className="hidden sm:inline">Install iOS</span>
        </Button>

        <ModalDialog
          opened={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          title="Install Petalnodes on iPhone / iPad"
          description="Add Petalnodes to your iOS home screen for a full-screen panel experience."
          size="sm"
        >
          <div className="space-y-4 text-sm text-[var(--calagopus-text-secondary)]">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Tap the <strong className="text-[var(--calagopus-text)]">Share</strong> button in the
                Safari navigation bar.
              </li>
              <li>
                Scroll down and select{' '}
                <strong className="text-[var(--calagopus-text)]">Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong className="text-[var(--calagopus-text)]">Add</strong> to launch
                Petalnodes from your home screen.
              </li>
            </ol>
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setShowIOSGuide(false)}>
                Done
              </Button>
            </div>
          </div>
        </ModalDialog>
      </>
    );
  }

  return null;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-[var(--calagopus-warning-border)] bg-[var(--calagopus-warning-bg)] px-3 py-2 text-[12px] font-medium text-[var(--calagopus-warning-text)] shadow-md"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Offline Mode · Static UI cached (live panel actions require connection)</span>
    </div>
  );
}
