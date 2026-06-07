import * as React from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { LogOut, User as UserIcon, Settings, Home } from 'lucide-react';

import { SidebarTrigger } from '#/components/ui/sidebar.tsx';
import { useAuthStore } from '#/store/auth-store.ts';
import { Avatar, AvatarFallback } from '#/components/ui/avatar.tsx';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '#/components/ui/dropdown-menu.tsx';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '#/components/ui/breadcrumb.tsx';
import { Button } from '#/components/ui/button.tsx';

export default function AdminHeader() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    const breadcrumbs = React.useMemo(() => {
        const segments = location.pathname.split('/').filter(Boolean);
        return segments.map((seg, idx) => {
            const path = '/' + segments.slice(0, idx + 1).join('/');
            let label = seg;

            if (seg.toLowerCase() === 'admin') {
                label = 'Dashboard';
            } else {
                // Capitalize and replace hyphens with spaces
                label = seg
                    .split('-')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            }

            return { label, path };
        });
    }, [location.pathname]);

    const initials = React.useMemo(() => {
        if (!user) return 'AD';
        if (user.firstName && user.lastName) {
            return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
        }
        return user.email.slice(0, 2).toUpperCase();
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate({ to: '/login' as any });
    };

    return (
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur-md px-4 lg:h-16 lg:px-6 transition-all duration-200">
            {/* Left Side: Sidebar Trigger + Breadcrumbs */}
            <div className="flex items-center gap-4">
                <SidebarTrigger className="-ml-2 hover:bg-muted/60 transition-colors" />

                {/* Dynamic Breadcrumbs */}
                <Breadcrumb className="hidden sm:inline-block">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink
                                className="cursor-pointer flex items-center gap-1 text-xs"
                                onClick={() => navigate({ to: '/admin' as any })}
                            >
                                <Home className="size-3.5" />
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        {breadcrumbs.map((bc, idx) => {
                            const isLast = idx === breadcrumbs.length - 1;
                            return (
                                <React.Fragment key={bc.path}>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        {isLast ? (
                                            <BreadcrumbPage className="text-xs font-semibold text-foreground">{bc.label}</BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink className="cursor-pointer text-xs" onClick={() => navigate({ to: bc.path as any })}>
                                                {bc.label}
                                            </BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>
                                </React.Fragment>
                            );
                        })}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Right Side: Profile Dropdown */}
            <div className="flex items-center gap-4">
                {user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="relative size-8 rounded-full border border-border/50 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring select-none"
                            >
                                <Avatar size="sm">
                                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">{initials}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-semibold leading-none text-foreground">
                                        {user.firstName} {user.lastName}
                                    </p>
                                    <p className="text-xs leading-none text-muted-foreground font-medium truncate">{user.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="cursor-pointer text-xs font-medium"
                                onClick={() => navigate({ to: '/admin/profile' as any })}
                            >
                                <UserIcon className="mr-2 size-3.5 text-muted-foreground" />
                                View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="cursor-pointer text-xs font-medium"
                                onClick={() => navigate({ to: '/admin/store-settings' as any })}
                            >
                                <Settings className="mr-2 size-3.5 text-muted-foreground" />
                                Store Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="cursor-pointer text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={handleLogout}
                            >
                                <LogOut className="mr-2 size-3.5" />
                                Log Out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    );
}
