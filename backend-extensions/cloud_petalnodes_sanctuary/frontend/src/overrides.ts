import type { OverrideEntry } from 'shared';
import OrigAppIcon from '@/elements/AppIcon.tsx';
import OrigButton from '@/elements/buttons/Button.tsx';
import OrigContentContainerHeader from '@/elements/containers/ContentContainerHeader.tsx';
import OrigCopyright from '@/elements/Copyright.tsx';
import OrigCard from '@/elements/data-display/Card.tsx';
import OrigTitleCard from '@/elements/data-display/TitleCard.tsx';
import OrigContainer from '@/elements/layout/Container.tsx';
import OrigSidebar from '@/elements/navigation/Sidebar.tsx';
import OrigAdminOverview from '@/pages/admin/home/overview/AdminOverview.tsx';
import OrigAuthWrapper from '@/pages/auth/AuthWrapper.tsx';
import OrigDashboardHomeAll from '@/pages/dashboard/home/DashboardHomeAll.tsx';
import OrigDashboardHomeGrouped from '@/pages/dashboard/home/DashboardHomeGrouped.tsx';
import OrigServerItem from '@/pages/dashboard/home/ServerItem.tsx';
import PetalnodesAdminOverview from './overrides/PetalnodesAdminOverview.tsx';
import PetalnodesAppIcon from './overrides/PetalnodesAppIcon.tsx';
import PetalnodesAuthWrapper from './overrides/PetalnodesAuthWrapper.tsx';
import PetalnodesButton from './overrides/PetalnodesButton.tsx';
import PetalnodesCard from './overrides/PetalnodesCard.tsx';
import PetalnodesContainer from './overrides/PetalnodesContainer.tsx';
import PetalnodesContentContainerHeader from './overrides/PetalnodesContentContainerHeader.tsx';
import PetalnodesCopyright from './overrides/PetalnodesCopyright.tsx';
import PetalnodesDashboardHomeAll from './overrides/PetalnodesDashboardHomeAll.tsx';
import PetalnodesDashboardHomeGrouped from './overrides/PetalnodesDashboardHomeGrouped.tsx';
import PetalnodesServerItem from './overrides/PetalnodesServerItem.tsx';
import PetalnodesSidebar from './overrides/PetalnodesSidebar.tsx';
import PetalnodesTitleCard from './overrides/PetalnodesTitleCard.tsx';

function defineOverride<T>(original: T, replacement: NoInfer<T>): OverrideEntry {
  return { original, replacement };
}

export default [
  defineOverride(OrigAppIcon, PetalnodesAppIcon),
  defineOverride(OrigCopyright, PetalnodesCopyright),
  defineOverride(OrigButton, PetalnodesButton),
  defineOverride(OrigCard, PetalnodesCard),
  defineOverride(OrigTitleCard, PetalnodesTitleCard),
  defineOverride(OrigContentContainerHeader, PetalnodesContentContainerHeader),
  defineOverride(OrigContainer, PetalnodesContainer),
  defineOverride(OrigSidebar, PetalnodesSidebar),
  defineOverride(OrigAuthWrapper, PetalnodesAuthWrapper),
  defineOverride(OrigDashboardHomeAll, PetalnodesDashboardHomeAll),
  defineOverride(OrigDashboardHomeGrouped, PetalnodesDashboardHomeGrouped),
  defineOverride(OrigServerItem, PetalnodesServerItem),
  defineOverride(OrigAdminOverview, PetalnodesAdminOverview),
];
