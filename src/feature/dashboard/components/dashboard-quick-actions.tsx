import { Link } from '@tanstack/react-router';
import { Coffee, Clock, ShoppingBag, TrendingUp, Users, Menu as MenuIcon } from 'lucide-react';
import { Button } from '#/components/ui/button.tsx';

interface DashboardQuickActionsProps {
    canReadPOS: boolean;
    canReadOrderQueue: boolean;
    canReadMenu: boolean;
    canReadInventory: boolean;
    canReadSales: boolean;
    canReadUsers: boolean;
}

export function DashboardQuickActions({
    canReadPOS,
    canReadOrderQueue,
    canReadMenu,
    canReadInventory,
    canReadSales,
    canReadUsers
}: DashboardQuickActionsProps) {
    return (
        <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">Quick Shortcuts</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {canReadPOS && (
                    <Link to="/admin/pos">
                        <Button
                            variant="outline"
                            className="w-full text-xs font-bold gap-2 hover:bg-muted py-5 rounded-2xl border-border/50 cursor-pointer"
                        >
                            <Coffee className="size-4 text-primary" /> POS
                        </Button>
                    </Link>
                )}
                {canReadOrderQueue && (
                    <Link to="/admin/order-queue">
                        <Button
                            variant="outline"
                            className="w-full text-xs font-bold gap-2 hover:bg-muted py-5 rounded-2xl border-border/50 cursor-pointer"
                        >
                            <Clock className="size-4 text-primary" /> Order Queue
                        </Button>
                    </Link>
                )}
                {canReadMenu && (
                    <Link to="/admin/menu" search={{} as any}>
                        <Button
                            variant="outline"
                            className="w-full text-xs font-bold gap-2 hover:bg-muted py-5 rounded-2xl border-border/50 cursor-pointer"
                        >
                            <MenuIcon className="size-4 text-primary" /> Menu
                        </Button>
                    </Link>
                )}
                {canReadInventory && (
                    <Link to="/admin/inventory">
                        <Button
                            variant="outline"
                            className="w-full text-xs font-bold gap-2 hover:bg-muted py-5 rounded-2xl border-border/50 cursor-pointer"
                        >
                            <ShoppingBag className="size-4 text-primary" /> Inventory
                        </Button>
                    </Link>
                )}
                {canReadSales && (
                    <Link to="/admin/sales">
                        <Button
                            variant="outline"
                            className="w-full text-xs font-bold gap-2 hover:bg-muted py-5 rounded-2xl border-border/50 cursor-pointer"
                        >
                            <TrendingUp className="size-4 text-primary" /> Sales Performance
                        </Button>
                    </Link>
                )}
                {canReadUsers && (
                    <Link to="/admin/users">
                        <Button
                            variant="outline"
                            className="w-full text-xs font-bold gap-2 hover:bg-muted py-5 rounded-2xl border-border/50 cursor-pointer"
                        >
                            <Users className="size-4 text-primary" /> Users
                        </Button>
                    </Link>
                )}
            </div>
        </div>
    );
}
