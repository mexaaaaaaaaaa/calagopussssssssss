import React from 'react';
import {
  Activity,
  Archive,
  Clock,
  Cpu,
  Database,
  FileText,
  Folder,
  Gamepad2,
  Globe,
  Key,
  Layers,
  LayoutGrid,
  Network,
  Puzzle,
  Server,
  Settings,
  Shield,
  SlidersHorizontal,
  Terminal,
  TerminalSquare,
  User,
  Users,
  Wrench,
} from 'lucide-react';
import type { NavIconName } from '../navigation/calagopusRoutes';

const ICON_MAP: Record<NavIconName, React.ComponentType<{ className?: string }>> = {
  server: Server,
  terminal: Terminal,
  folder: Folder,
  database: Database,
  clock: Clock,
  users: Users,
  archive: Archive,
  network: Network,
  sliders: SlidersHorizontal,
  settings: Settings,
  activity: Activity,
  user: User,
  shield: Shield,
  key: Key,
  'terminal-key': TerminalSquare,
  layout: LayoutGrid,
  globe: Globe,
  cpu: Cpu,
  layers: Layers,
  puzzle: Puzzle,
  'file-text': FileText,
  gamepad: Gamepad2,
  wrench: Wrench,
};

export interface NavIconProps {
  name: NavIconName;
  className?: string;
}

export function NavIcon({ name, className = 'h-4 w-4 shrink-0' }: NavIconProps) {
  const Icon = ICON_MAP[name] ?? Server;
  return <Icon className={className} aria-hidden="true" />;
}
