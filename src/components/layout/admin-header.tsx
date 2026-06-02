import { SidebarTrigger } from '#/components/ui/sidebar.tsx';

export default function AdminHeader() {
    return (
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-16 lg:px-6">
            <SidebarTrigger className="-ml-2" />
            <div className="flex flex-1 items-center font-semibold">Basta Kape Admin</div>
        </header>
    );
}
