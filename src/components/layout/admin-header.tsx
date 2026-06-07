import { SidebarTrigger } from '#/components/ui/sidebar.tsx';
import { BUSINESS_DETAIL } from '#/constants/business-details.ts';

export default function AdminHeader() {
    return (
        <header className="sticky top-0 z-10 flex h-14 py-6 items-center gap-4 border-b bg-background px-4 lg:h-16 lg:px-6">
            <SidebarTrigger className="-ml-2" />
            <div className="flex flex-1 items-center font-semibold">{BUSINESS_DETAIL.NAME} Admin</div>
        </header>
    );
}
