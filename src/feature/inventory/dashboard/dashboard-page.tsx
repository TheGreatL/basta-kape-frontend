import { LayoutDashboard } from 'lucide-react';
import OverviewCardsWidget from './components/overview-cards';
import ExpiringSoonWidget from './components/expiring-soon';
import WasteBreakdownWidget from './components/waste-breakdown';
import RecentDeliveriesWidget from './components/recent-deliveries';
import RecentAdjustmentsWidget from './components/recent-adjustments';

export default function InventoryDashboardPage() {
    return (
        <div className="flex flex-col gap-6 pb-12">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <LayoutDashboard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground leading-tight">Inventory Dashboard</h1>
                        <p className="text-xs text-muted-foreground">
                            Consolidated tracking of raw materials stock levels, intake batch lifetimes, and waste metrics.
                        </p>
                    </div>
                </div>
            </div>

            {/* Top Stat Overview Cards */}
            <OverviewCardsWidget />

            {/* Main Widget Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {/* Column 1: Expirations and Waste */}
                <div className="space-y-6">
                    <ExpiringSoonWidget />
                    <WasteBreakdownWidget />
                </div>

                {/* Column 2: Recent Deliveries */}
                <div>
                    <RecentDeliveriesWidget />
                </div>

                {/* Column 3: Recent Adjustments */}
                <div>
                    <RecentAdjustmentsWidget />
                </div>
            </div>
        </div>
    );
}
