import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
    History,
    Search,
    X,
    Calendar as CalendarIcon,
    CreditCard,
    Smartphone,
    XCircle,
    Clock,
    Eye,
    Upload,
    ImageIcon,
    User,
    PhilippinePeso
} from 'lucide-react';
import { format, parse } from 'date-fns';
import { toast } from 'sonner';

import { Route } from '#/routes/admin/transactions.tsx';
import { getTransactions, updateTransactionReceipt, uploadImageFile } from '#/api/transactions.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import DataTable from '#/components/data-table/data-table.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { cn } from '#/lib/utils.ts';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover.tsx';
import { Calendar } from '#/components/ui/calendar.tsx';
import { CopyButton } from '#/components/ui/copy-button.tsx';

import type { ITransaction } from '#/api/transactions.api.ts';
import { getFileUrl } from '#/utils/helper';

export default function TransactionsPage() {
    const navigate = useNavigate({ from: '/admin/transactions' });
    const queryClient = useQueryClient();
    const { page, pageSize, search, paymentMethod, paymentStatus, dateFrom, dateTo } = Route.useSearch();

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [localSearch, setLocalSearch] = React.useState(search || '');
    const debouncedSearch = useDebounce(localSearch, 400);

    const [selectedTx, setSelectedTx] = React.useState<ITransaction | null>(null);
    const [isUploadPending, setIsUploadPending] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const setSearchParams = (updates: Record<string, any>) => {
        navigate({
            search: (prev: any) => ({ ...prev, ...updates })
        });
    };

    React.useEffect(() => {
        setLocalSearch(search || '');
    }, [search]);

    React.useEffect(() => {
        if (debouncedSearch !== (search || '')) {
            setSearchParams({ search: debouncedSearch, page: 1 });
        }
    }, [debouncedSearch]);

    // Query: Transactions List
    const { data: txData, isLoading: isTxLoading } = useQuery({
        queryKey: [QUERY_KEY.TRANSACTIONS.TRANSACTIONS_LIST, { page, pageSize, search, paymentMethod, paymentStatus, dateFrom, dateTo }],
        queryFn: () =>
            getTransactions({
                page,
                limit: pageSize,
                search,
                paymentMethod: paymentMethod || undefined,
                paymentStatus: paymentStatus || undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined
            })
    });

    // Mutation: Update Receipt Details
    const updateReceiptMutation = useMutation({
        mutationFn: ({ paymentId, payload }: { paymentId: string; payload: any }) => updateTransactionReceipt(paymentId, payload),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.TRANSACTIONS.TRANSACTIONS_LIST] });
            setSelectedTx(data);
            toast.success('Receipt details updated successfully');
        },
        onError: (err) => {
            toast.error('Failed to update receipt details', {
                description: getErrorMessage(err)
            });
        }
    });

    const handleClearFilters = () => {
        setLocalSearch('');
        setSearchParams({
            page: 1,
            search: '',
            paymentMethod: '',
            paymentStatus: '',
            dateFrom: '',
            dateTo: ''
        });
    };

    const handleFileUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedTx) return;

        setIsUploadPending(true);
        try {
            // 1. Upload to storage
            const uploadRes = await uploadImageFile(file);

            // 2. Save reference to payment
            await updateReceiptMutation.mutateAsync({
                paymentId: selectedTx.id,
                payload: { paymentProofPhoto: uploadRes.url }
            });
        } catch (err) {
            toast.error('File upload failed', {
                description: getErrorMessage(err)
            });
        } finally {
            setIsUploadPending(false);
        }
    };

    const getPaymentMethodIcon = (method: string) => {
        switch (method) {
            case 'CASH':
                return <PhilippinePeso className="size-4 text-emerald-600" />;
            case 'GCASH':
            case 'PAYMAYA':
                return <Smartphone className="size-4 text-blue-600" />;
            default:
                return <CreditCard className="size-4 text-purple-600" />;
        }
    };

    const getPaymentStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'PAID':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40';
            case 'PENDING':
                return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40';
            case 'FAILED':
                return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const columns = React.useMemo<ColumnDef<ITransaction>[]>(
        () => [
            {
                accessorKey: 'createdAt',
                header: 'Transaction Date',
                cell: ({ row }) => (
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <CalendarIcon className="size-3.5" />
                        {format(new Date(row.original.createdAt), 'MMM dd, yyyy hh:mm a')}
                    </span>
                )
            },
            {
                accessorKey: 'order.queueNumber',
                header: 'Order Queue #',
                cell: ({ row }) => (
                    <div className="flex items-center gap-1">
                        <span className="font-mono text-sm font-bold text-foreground">{row.original.order.queueNumber || 'N/A'}</span>
                        {row.original.order.queueNumber && (
                            <CopyButton
                                value={row.original.order.queueNumber}
                                description={`Queue number #${row.original.order.queueNumber} copied`}
                            />
                        )}
                    </div>
                )
            },
            {
                accessorKey: 'order.customerName',
                header: 'Customer',
                cell: ({ row }) => <span className="text-xs font-bold text-foreground/85">{row.original.order.customerName || 'Walk-in'}</span>
            },
            {
                accessorKey: 'paymentMethod',
                header: 'Method',
                cell: ({ row }) => (
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                        {getPaymentMethodIcon(row.original.paymentMethod)}
                        <span className="text-xs capitalize">{row.original.paymentMethod.toLowerCase()}</span>
                    </div>
                )
            },
            {
                accessorKey: 'paymentStatus',
                header: 'Status',
                cell: ({ row }) => (
                    <Badge
                        variant="outline"
                        className={`text-xs font-semibold py-0.5 px-2 capitalize ${getPaymentStatusBadgeClass(row.original.paymentStatus)}`}
                    >
                        {row.original.paymentStatus.toLowerCase()}
                    </Badge>
                )
            },
            {
                accessorKey: 'amount',
                header: 'Amount Paid',
                cell: ({ row }) => (
                    <span className="font-bold text-foreground">₱{row.original.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                )
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => setSelectedTx(row.original)}
                    >
                        <Eye className="size-4" />
                        <span className="sr-only">Inspect Details</span>
                    </Button>
                )
            }
        ],
        []
    );

    return (
        <div className="flex flex-col gap-6 min-h-screen">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <History className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground leading-tight">Transactions Audit Log</h1>
                        <p className="text-xs text-muted-foreground">
                            Browse daily cashier sales transactions, GCash reference validations, and payment receipts.
                        </p>
                    </div>
                </div>
            </div>

            {/* Datatable */}
            <div className="space-y-4">
                <DataTable
                    columns={columns}
                    data={txData?.data || []}
                    pageCount={txData?.meta.pageCount || 1}
                    pageIndex={page - 1}
                    pageSize={pageSize}
                    onPaginationChange={(idx, size) => setSearchParams({ page: idx + 1, pageSize: size })}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    isLoading={isTxLoading}
                    showColumnVisibilityToggle={true}
                    filterContent={
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <div className="relative w-full sm:w-[220px]">
                                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search reference or queue #..."
                                    value={localSearch}
                                    onChange={(e) => setLocalSearch(e.target.value)}
                                    className="h-9 pl-8.5 bg-background/50 text-xs"
                                />
                            </div>

                            <Select
                                value={paymentMethod || 'all'}
                                onValueChange={(val) => setSearchParams({ paymentMethod: val === 'all' ? '' : val, page: 1 })}
                            >
                                <SelectTrigger className="h-9 min-w-[130px] bg-background/50 text-xs capitalize">
                                    <SelectValue placeholder="All Methods" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">
                                        All Methods
                                    </SelectItem>
                                    <SelectItem value="CASH" className="text-xs">
                                        Cash
                                    </SelectItem>
                                    <SelectItem value="GCASH" className="text-xs">
                                        GCash
                                    </SelectItem>
                                    <SelectItem value="PAYMAYA" className="text-xs">
                                        PayMaya
                                    </SelectItem>
                                    <SelectItem value="CREDIT_CARD" className="text-xs">
                                        Credit Card
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={paymentStatus || 'all'}
                                onValueChange={(val) => setSearchParams({ paymentStatus: val === 'all' ? '' : val, page: 1 })}
                            >
                                <SelectTrigger className="h-9 min-w-[130px] bg-background/50 text-xs capitalize">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">
                                        All Statuses
                                    </SelectItem>
                                    <SelectItem value="PAID" className="text-xs">
                                        Paid
                                    </SelectItem>
                                    <SelectItem value="PENDING" className="text-xs">
                                        Pending
                                    </SelectItem>
                                    <SelectItem value="FAILED" className="text-xs">
                                        Failed
                                    </SelectItem>
                                    <SelectItem value="REFUNDED" className="text-xs">
                                        Refunded
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex items-center gap-1.5">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                'h-9 justify-start text-left font-normal text-xs bg-background/50 border-border/60 rounded-xl px-3 min-w-[130px]',
                                                !dateFrom && 'text-muted-foreground'
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                            {dateFrom ? format(parse(dateFrom, 'yyyy-MM-dd', new Date()), 'LLL dd, yyyy') : <span>Start date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={dateFrom ? parse(dateFrom, 'yyyy-MM-dd', new Date()) : undefined}
                                            onSelect={(date) => {
                                                setSearchParams({
                                                    dateFrom: date ? format(date, 'yyyy-MM-dd') : '',
                                                    page: 1
                                                });
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>

                                <span className="text-muted-foreground text-xs font-semibold">to</span>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                'h-9 justify-start text-left font-normal text-xs bg-background/50 border-border/60 rounded-xl px-3 min-w-[130px]',
                                                !dateTo && 'text-muted-foreground'
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                            {dateTo ? format(parse(dateTo, 'yyyy-MM-dd', new Date()), 'LLL dd, yyyy') : <span>End date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={dateTo ? parse(dateTo, 'yyyy-MM-dd', new Date()) : undefined}
                                            onSelect={(date) => {
                                                setSearchParams({
                                                    dateTo: date ? format(date, 'yyyy-MM-dd') : '',
                                                    page: 1
                                                });
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {(search || paymentMethod || paymentStatus || dateFrom || dateTo) && (
                                <Button variant="ghost" onClick={handleClearFilters} className="h-9 text-xs px-2.5 gap-1.5">
                                    <X className="size-3.5" /> Clear Filters
                                </Button>
                            )}
                        </div>
                    }
                />
            </div>

            {/* Transaction Inspection Dialog */}
            <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
                <DialogContent className="max-w-md w-full rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-foreground flex items-center gap-2">
                            <History className="size-5 text-primary" />
                            Transaction Details
                        </DialogTitle>
                        <DialogDescription className="text-xs">Review transaction receipts, customer payment reference, and logs.</DialogDescription>
                    </DialogHeader>

                    {selectedTx && (
                        <div className="space-y-4 pt-2">
                            {/* Order Details Header */}
                            <div className="p-3 bg-muted/30 border border-border/40 rounded-xl flex justify-between items-center">
                                <div className="space-y-0.5">
                                    <span className="text-xs uppercase font-semibold text-muted-foreground">Order Queue Number</span>
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="font-mono font-bold text-sm text-foreground">{selectedTx.order.queueNumber || 'N/A'}</h4>
                                        {selectedTx.order.queueNumber && (
                                            <CopyButton
                                                value={selectedTx.order.queueNumber}
                                                description={`Queue number #${selectedTx.order.queueNumber} copied`}
                                            />
                                        )}
                                    </div>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={`text-xs font-bold py-0.5 capitalize ${getPaymentStatusBadgeClass(selectedTx.paymentStatus)}`}
                                >
                                    {selectedTx.paymentStatus.toLowerCase()}
                                </Badge>
                            </div>

                            {/* Billing details */}
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center py-1 border-b border-border/30">
                                    <span className="text-muted-foreground font-medium">Customer Name</span>
                                    <span className="font-bold text-foreground flex items-center gap-1.5">
                                        <User className="size-3.5 text-muted-foreground" />
                                        {selectedTx.order.customerName || 'Walk-in Customer'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-border/30">
                                    <span className="text-muted-foreground font-medium">Payment Method</span>
                                    <span className="font-bold text-foreground capitalize">{selectedTx.paymentMethod.toLowerCase()}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-border/30">
                                    <span className="text-muted-foreground font-medium">Total Amount Due</span>
                                    <span className="font-bold text-foreground">
                                        ₱{selectedTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>

                                {/* CASH billing */}
                                {selectedTx.paymentMethod === 'CASH' && (
                                    <>
                                        <div className="flex justify-between items-center py-1 border-b border-border/30">
                                            <span className="text-muted-foreground font-medium">Amount Tendered</span>
                                            <span className="font-bold text-foreground">
                                                ₱{selectedTx.amountTendered?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-border/30">
                                            <span className="text-muted-foreground font-medium">Cash Change</span>
                                            <span className="font-bold text-emerald-600 font-mono">
                                                ₱{selectedTx.amountChange?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                                            </span>
                                        </div>
                                    </>
                                )}

                                {/* Digital payment Reference */}
                                {selectedTx.paymentMethod !== 'CASH' && (
                                    <div className="space-y-2 pt-1 border-b border-border/30 pb-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground font-medium">GCash / Reference Number</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-foreground font-mono">
                                                    {selectedTx.gcashReferenceNumber || 'None'}
                                                </span>
                                                {selectedTx.gcashReferenceNumber && (
                                                    <CopyButton value={selectedTx.gcashReferenceNumber} description={`Reference number copied`} />
                                                )}
                                            </div>
                                        </div>

                                        {/* Reference input field if missing */}
                                        {!selectedTx.gcashReferenceNumber && (
                                            <div className="flex gap-2 items-center mt-1">
                                                <Input
                                                    id="refNumInput"
                                                    placeholder="Input Reference Number"
                                                    className="h-8 text-xs bg-background/50 rounded-lg flex-1"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const val = (e.target as HTMLInputElement).value.trim();
                                                            if (val) {
                                                                updateReceiptMutation.mutate({
                                                                    paymentId: selectedTx.id,
                                                                    payload: { gcashReferenceNumber: val }
                                                                });
                                                            }
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    size="sm"
                                                    className="h-8 text-xs rounded-lg font-bold"
                                                    onClick={() => {
                                                        const el = document.getElementById('refNumInput') as HTMLInputElement;
                                                        const val = el.value.trim();
                                                        if (val) {
                                                            updateReceiptMutation.mutate({
                                                                paymentId: selectedTx.id,
                                                                payload: { gcashReferenceNumber: val }
                                                            });
                                                        }
                                                    }}
                                                >
                                                    Save
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Digital Proof / Receipt Image */}
                            {selectedTx.paymentMethod !== 'CASH' && (
                                <div className="space-y-2 pt-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                            <ImageIcon className="size-3.5 text-muted-foreground" />
                                            Proof of Payment Receipt
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleFileUploadClick}
                                            disabled={isUploadPending || updateReceiptMutation.isPending}
                                            className="h-8 text-xs font-bold rounded-lg border-border/70 hover:bg-muted"
                                        >
                                            <Upload className="size-3 mr-1" />
                                            {selectedTx.paymentProofPhoto ? 'Replace Receipt' : 'Upload Receipt'}
                                        </Button>
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                    </div>

                                    {/* Receipt preview box */}
                                    <div className="border border-border/50 rounded-xl overflow-hidden min-h-[160px] flex items-center justify-center bg-muted/20 relative">
                                        {isUploadPending ? (
                                            <div className="flex flex-col items-center gap-1.5">
                                                <Clock className="size-6 text-primary animate-spin" />
                                                <span className="text-xs text-muted-foreground font-semibold">Uploading Receipt...</span>
                                            </div>
                                        ) : selectedTx.paymentProofPhoto ? (
                                            <img
                                                src={getFileUrl(selectedTx.paymentProofPhoto)}
                                                alt="Payment Proof Screenshot"
                                                className="w-full max-h-[260px] object-contain cursor-pointer"
                                                onClick={() => window.open(getFileUrl(selectedTx.paymentProofPhoto), '_blank')}
                                            />
                                        ) : (
                                            <div className="text-center p-4">
                                                <XCircle className="size-7 text-rose-500 mx-auto mb-1.5 opacity-60" />
                                                <span className="text-xs text-muted-foreground font-semibold block">No Uploaded Screenshot Yet</span>
                                                <span className="text-xs text-muted-foreground/80 block mt-0.5">
                                                    Please upload the GCash screenshot receipt.
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Actions / Close */}
                            <div className="pt-2 border-t border-border/40 flex justify-end">
                                <Button variant="secondary" onClick={() => setSelectedTx(null)} className="h-9 w-24 rounded-lg text-xs font-bold">
                                    Close details
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
