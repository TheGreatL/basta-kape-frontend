import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { TrendingUp, Calendar as CalendarIcon, X } from 'lucide-react';
import { format, subDays, parse } from 'date-fns';

import { Route } from '#/routes/admin/sales.tsx';
import { cn } from '#/lib/utils.ts';
import { Button } from '#/components/ui/button.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover.tsx';
import { Calendar } from '#/components/ui/calendar.tsx';

import SalesSummaryWidget from './components/sales-summary-widget';
import SalesTrendWidget from './components/sales-trend-widget';
import FinancialPnLWidget from './components/financial-pnl-widget';
import LossBreakdownWidget from './components/loss-breakdown-widget';
import ExpenseBreakdownWidget from './components/expense-breakdown-widget';
import InventoryStockCostingWidget from './components/inventory-stock-costing-widget';
import TopProductsWidget from './components/top-products-widget';
import OrderTypeWidget from './components/order-type-widget';
import PaymentBreakdownWidget from './components/payment-breakdown-widget';
import OrderBreakdownTableWidget from './components/order-breakdown-table-widget';

export default function SalesPage() {
    const navigate = useNavigate({ from: '/admin/sales' });
    const { dateFrom, dateTo } = Route.useSearch();

    const defaultDateTo = React.useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
    const defaultDateFrom = React.useMemo(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'), []);

    const activeDateFrom = dateFrom || defaultDateFrom;
    const activeDateTo = dateTo || defaultDateTo;

    const [startDate, setStartDate] = React.useState(activeDateFrom);
    const [endDate, setEndDate] = React.useState(activeDateTo);

    const setSearchParams = (updates: Record<string, any>) => {
        navigate({
            search: (prev: any) => ({ ...prev, ...updates })
        });
    };

    React.useEffect(() => {
        setStartDate(activeDateFrom);
        setEndDate(activeDateTo);
    }, [activeDateFrom, activeDateTo]);

    const handleApplyCustomDates = () => {
        setSearchParams({ dateFrom: startDate, dateTo: endDate });
    };

    const handlePresetRange = (days: number) => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const pastStr = format(subDays(new Date(), days), 'yyyy-MM-dd');
        setSearchParams({ dateFrom: pastStr, dateTo: todayStr });
    };

    const handleResetDefault = () => {
        setSearchParams({ dateFrom: defaultDateFrom, dateTo: defaultDateTo });
        setStartDate(defaultDateFrom);
        setEndDate(defaultDateTo);
    };

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const sevenDaysStr = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    const thirtyDaysStr = format(subDays(new Date(), 30), 'yyyy-MM-dd');

    const isToday = activeDateFrom === todayStr && activeDateTo === todayStr;
    const is7Days = activeDateFrom === sevenDaysStr && activeDateTo === todayStr;
    const is30Days = activeDateFrom === thirtyDaysStr && activeDateTo === todayStr;

    return (
        <div className="flex flex-col gap-6 pb-12">
            {/* Header / Filter Toolbar */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground leading-tight">Sales & Financials</h1>
                        <p className="text-xs text-muted-foreground">
                            Track your sales earnings, stock purchases, wasted items, and take-home profit.
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                        <Button
                            variant={isToday ? 'default' : 'outline'}
                            size="sm"
                            className="h-9 text-xs rounded-lg font-semibold"
                            onClick={() => handlePresetRange(0)}
                        >
                            Today
                        </Button>
                        <Button
                            variant={is7Days ? 'default' : 'outline'}
                            size="sm"
                            className="h-9 text-xs rounded-lg font-semibold"
                            onClick={() => handlePresetRange(7)}
                        >
                            7 Days
                        </Button>
                        <Button
                            variant={is30Days ? 'default' : 'outline'}
                            size="sm"
                            className="h-9 text-xs rounded-lg font-semibold"
                            onClick={() => handlePresetRange(30)}
                        >
                            30 Days
                        </Button>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'h-9 justify-start text-left font-normal text-xs bg-background/50 border-border/60 rounded-xl px-3 min-w-[125px]',
                                        !startDate && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                    {startDate ? format(parse(startDate, 'yyyy-MM-dd', new Date()), 'LLL dd, yyyy') : <span>Start date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={startDate ? parse(startDate, 'yyyy-MM-dd', new Date()) : undefined}
                                    onSelect={(date) => {
                                        setStartDate(date ? format(date, 'yyyy-MM-dd') : '');
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
                                        'h-9 justify-start text-left font-normal text-xs bg-background/50 border-border/60 rounded-xl px-3 min-w-[125px]',
                                        !endDate && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                    {endDate ? format(parse(endDate, 'yyyy-MM-dd', new Date()), 'LLL dd, yyyy') : <span>End date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={endDate ? parse(endDate, 'yyyy-MM-dd', new Date()) : undefined}
                                    onSelect={(date) => {
                                        setEndDate(date ? format(date, 'yyyy-MM-dd') : '');
                                    }}
                                />
                            </PopoverContent>
                        </Popover>

                        <Button
                            size="sm"
                            onClick={handleApplyCustomDates}
                            disabled={!startDate || !endDate}
                            className="h-9 text-xs font-bold rounded-xl px-3 shadow-3xs"
                        >
                            Apply
                        </Button>
                    </div>

                    {!is30Days && (
                        <Button variant="ghost" onClick={handleResetDefault} className="h-9 text-xs px-2 gap-1">
                            <X className="size-3.5" /> Reset (30 Days)
                        </Button>
                    )}
                </div>
            </div>

            {/* 1. Top Financial KPI Cards */}
            <SalesSummaryWidget dateFrom={activeDateFrom} dateTo={activeDateTo} />

            {/* 2. Main Financial Performance (Trend & P&L Statement) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SalesTrendWidget dateFrom={activeDateFrom} dateTo={activeDateTo} />
                </div>
                <div className="lg:col-span-1">
                    <FinancialPnLWidget dateFrom={activeDateFrom} dateTo={activeDateTo} />
                </div>
            </div>

            {/* 3. Outflow Details (Wastage Losses & Procurement Expenses) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LossBreakdownWidget dateFrom={activeDateFrom} dateTo={activeDateTo} />
                <ExpenseBreakdownWidget dateFrom={activeDateFrom} dateTo={activeDateTo} />
            </div>

            {/* 4. Complete Inventory Stock Transactions & Cost Valuation */}
            <InventoryStockCostingWidget dateFrom={activeDateFrom} dateTo={activeDateTo} />

            {/* 5. Operational Inflow Breakdown Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <TopProductsWidget dateFrom={activeDateFrom} dateTo={activeDateTo} />
                <OrderTypeWidget dateFrom={activeDateFrom} dateTo={activeDateTo} />
                <PaymentBreakdownWidget dateFrom={activeDateFrom} dateTo={activeDateTo} />
            </div>

            {/* 6. Detailed Orders Transaction Table */}
            <OrderBreakdownTableWidget dateFrom={activeDateFrom} dateTo={activeDateTo} />
        </div>
    );
}
