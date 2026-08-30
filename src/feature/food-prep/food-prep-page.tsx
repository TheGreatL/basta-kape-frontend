import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx';
import { Sparkles, Layers } from 'lucide-react';

import FoodPrepHeader from './components/food-prep-header.tsx';
import DisplaySummaryCards from './components/display-summary-cards.tsx';
import DisplayStockGrid from './components/display-stock-grid.tsx';
import PreparedBatchesTable from './components/prepared-batches-table.tsx';
import BakeBatchDialog from './components/bake-batch-dialog.tsx';
import DisposeBatchDialog from './components/dispose-batch-dialog.tsx';

import { getDisplayStockSummary, getPreparedBatches } from '#/api/food-prep.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { useDebounce } from '#/hooks/use-debounce.ts';
import type { IDisplayStockItemSummary, IPreparedItemBatch, PreparedBatchStatus } from './food-prep.types';

export default function FoodPrepPage() {
    const [activeTab, setActiveTab] = React.useState<string>('display-shelf');

    // Dialog state for recording bake / preparation batch
    const [bakeDialogOpen, setBakeDialogOpen] = React.useState(false);
    const [selectedItemForBake, setSelectedItemForBake] = React.useState<IDisplayStockItemSummary | null>(null);

    // Dialog state for disposing / write-off
    const [disposeDialogOpen, setDisposeDialogOpen] = React.useState(false);
    const [selectedBatchForDispose, setSelectedBatchForDispose] = React.useState<IPreparedItemBatch | null>(null);

    // Batches table filter & pagination states
    const [batchesPage, setBatchesPage] = React.useState(1);
    const [batchesLimit, setBatchesLimit] = React.useState(10);
    const [batchesSearch, setBatchesSearch] = React.useState('');
    const debouncedBatchesSearch = useDebounce(batchesSearch, 400);
    const [batchesStatus, setBatchesStatus] = React.useState<PreparedBatchStatus | ''>('');
    const [expiringSoonFilter, setExpiringSoonFilter] = React.useState(false);
    const [selectedVariantFilter, setSelectedVariantFilter] = React.useState<string>('');

    // 1. Query: Display Stock Summary (Refetches every 30s to keep countdowns fresh)
    const {
        data: summaryData,
        isLoading: isSummaryLoading,
        refetch: refetchSummary
    } = useQuery({
        queryKey: [QUERY_KEY.FOOD_PREP.SUMMARY],
        queryFn: getDisplayStockSummary,
        refetchInterval: 30000
    });

    // 2. Query: Prepared Batches List
    const {
        data: batchesData,
        isLoading: isBatchesLoading,
        refetch: refetchBatches
    } = useQuery({
        queryKey: [
            QUERY_KEY.FOOD_PREP.BATCHES_LIST,
            {
                page: batchesPage,
                limit: batchesLimit,
                status: batchesStatus || undefined,
                productVariantId: selectedVariantFilter || undefined,
                expiringWithinMinutes: expiringSoonFilter ? 120 : undefined,
                search: debouncedBatchesSearch || undefined
            }
        ],
        queryFn: () =>
            getPreparedBatches({
                page: batchesPage,
                limit: batchesLimit,
                status: batchesStatus || undefined,
                productVariantId: selectedVariantFilter || undefined,
                expiringWithinMinutes: expiringSoonFilter ? 120 : undefined,
                search: debouncedBatchesSearch || undefined
            }),
        refetchInterval: 30000
    });

    const handleOpenBakeDialog = (item?: IDisplayStockItemSummary) => {
        setSelectedItemForBake(item || null);
        setBakeDialogOpen(true);
    };

    const handleOpenDisposeDialog = (batch: IPreparedItemBatch) => {
        setSelectedBatchForDispose(batch);
        setDisposeDialogOpen(true);
    };

    const handleViewItemBatches = (item: IDisplayStockItemSummary) => {
        setSelectedVariantFilter(item.productVariantId);
        setActiveTab('batches-log');
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
            {/* Page Header */}
            <FoodPrepHeader onOpenBakeDialog={() => handleOpenBakeDialog()} />

            {/* Display Shelf Summary Metric Cards */}
            <DisplaySummaryCards summary={summaryData} isLoading={isSummaryLoading} />

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
                <TabsList className="bg-muted/40 p-1 rounded-xl w-full sm:w-auto border border-border/40 flex flex-wrap">
                    <TabsTrigger value="display-shelf" className="flex items-center gap-1.5 py-2 px-4 rounded-lg text-xs font-semibold">
                        <Sparkles className="size-4" /> 1. Display Shelf & Expiry Tracker
                    </TabsTrigger>
                    <TabsTrigger value="batches-log" className="flex items-center gap-1.5 py-2 px-4 rounded-lg text-xs font-semibold">
                        <Layers className="size-4" /> 2. Bake & Prep Batches Log
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Live Display Shelf Grid */}
                <TabsContent value="display-shelf" className="focus-visible:outline-none space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-foreground">Active Display Inventory</h3>
                            <p className="text-xs text-muted-foreground">
                                Real-time ready-to-serve pastries, snacks, and prepared goods currently available for POS checkout.
                            </p>
                        </div>
                    </div>

                    <DisplayStockGrid
                        items={summaryData?.items || []}
                        isLoading={isSummaryLoading}
                        onBakeItem={(item) => handleOpenBakeDialog(item)}
                        onViewItemBatches={handleViewItemBatches}
                    />
                </TabsContent>

                {/* Tab 2: Batch History & Log */}
                <TabsContent value="batches-log" className="focus-visible:outline-none space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-foreground">Prepared Batch Logs & Disposal</h3>
                            <p className="text-xs text-muted-foreground">
                                Individual baking and prep batch tracking with countdowns, notes, and spoilage write-off actions.
                            </p>
                        </div>
                        {selectedVariantFilter && (
                            <button onClick={() => setSelectedVariantFilter('')} className="text-xs text-primary font-bold hover:underline">
                                Clear item filter
                            </button>
                        )}
                    </div>

                    <PreparedBatchesTable
                        batchesData={batchesData}
                        isLoading={isBatchesLoading}
                        page={batchesPage}
                        setPage={setBatchesPage}
                        limit={batchesLimit}
                        setLimit={setBatchesLimit}
                        search={batchesSearch}
                        setSearch={setBatchesSearch}
                        status={batchesStatus}
                        setStatus={setBatchesStatus}
                        expiringSoonFilter={expiringSoonFilter}
                        setExpiringSoonFilter={setExpiringSoonFilter}
                        onDisposeBatch={handleOpenDisposeDialog}
                        onRefresh={() => {
                            refetchSummary();
                            refetchBatches();
                        }}
                    />
                </TabsContent>
            </Tabs>

            {/* Dialog: Record New Batch */}
            <BakeBatchDialog open={bakeDialogOpen} onOpenChange={setBakeDialogOpen} preselectedItem={selectedItemForBake} />

            {/* Dialog: Dispose Batch Units */}
            <DisposeBatchDialog open={disposeDialogOpen} onOpenChange={setDisposeDialogOpen} batch={selectedBatchForDispose} />
        </div>
    );
}
