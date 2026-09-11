import DashboardLayout from './DashboardLayout';
import { SUPERADMIN_NAV_GROUPS } from '../ui/Sidebar';

export default function SuperAdminLayout({
  children,
  branchSelector,
  searchSlot,
  actionSlot,
  userProfile,
}) {
  return (
    <DashboardLayout
      navGroups={SUPERADMIN_NAV_GROUPS}
      branchSelector={branchSelector}
      searchSlot={searchSlot}
      actionSlot={actionSlot}
      userProfile={userProfile}
    >
      {children}
    </DashboardLayout>
  );
}
