export type TFinancialSummary = {
    grossSales: number;
    discountTotal: number;
    netSales: number;
    orderCount: number;
    averageOrderValue: number;
    totalExpenses: number;
    deliveryCount: number;
    cogs: number;
    stockTransactionsCount: number;
    totalLoss: number;
    rawIngredientLoss: number;
    preparedFoodLoss: number;
    totalWastedItemsCount: number;
    lossRate: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
};

export type TPnLOverview = {
    revenue: {
        grossSales: number;
        discounts: number;
        netSales: number;
    };
    expenses: {
        procurementDeliveries: number;
        cogs: number;
        totalExpenses: number;
    };
    losses: {
        rawIngredientWaste: number;
        preparedFoodExpirations: number;
        totalLoss: number;
        lossBreakdownByReason: Record<string, number>;
    };
    profitability: {
        grossProfit: number;
        netProfit: number;
        grossProfitMargin: number;
        netProfitMargin: number;
    };
};

export type TDailyFinancialTrend = {
    date: string;
    sales: number;
    count: number;
    expenses: number;
    losses: number;
    netProfit: number;
};

export type TTopWastedItem = {
    itemName: string;
    category: 'PREPARED_FOOD' | 'RAW_INGREDIENT';
    totalQuantity: number;
    unit: string;
    totalCostLoss: number;
};

export type TLossBreakdown = {
    totalFinancialLoss: number;
    preparedFoodLoss: number;
    rawIngredientLoss: number;
    preparedFoodWastedCount: number;
    rawIngredientWastedCount: number;
    totalWastedItemsCount: number;
    reasonBreakdown: Record<string, number>;
    topWastedItems: TTopWastedItem[];
};

export type TTransactionTypeCost = {
    count: number;
    totalQuantity: number;
    totalCost: number;
};

export type TTopConsumedIngredient = {
    ingredientName: string;
    totalQuantity: number;
    unit: string;
    totalCost: number;
};

export type TStockTransactionCostSummary = {
    totalStockTransactionsCount: number;
    totalCogs: number;
    totalProcurement: number;
    totalWastage: number;
    totalCorrections: number;
    transactionsByType: Record<string, TTransactionTypeCost>;
    topConsumedIngredients: TTopConsumedIngredient[];
};

export type TExpenseBreakdown = {
    totalExpenses: number;
    deliveryCount: number;
    cogs: number;
    topSuppliers: { supplierName: string; totalCost: number; batchCount: number }[];
    topIngredients: { ingredientName: string; totalCost: number; totalQuantity: number; unit: string }[];
    stockTransactionsSummary: TStockTransactionCostSummary;
};

export type TTopProduct = {
    name: string;
    quantity: number;
    revenue: number;
};

export type TOrderTypeBreakdown = {
    DINE_IN: { count: number; revenue: number };
    TAKE_OUT: { count: number; revenue: number };
    DELIVERY: { count: number; revenue: number };
};

export type TPaymentBreakdown = {
    CASH: { count: number; revenue: number };
    GCASH: { count: number; revenue: number };
};

export type TSalesOrder = {
    id: string;
    queueNumber: string | null;
    customerName: string;
    orderType: string;
    orderSource: string;
    netTotal: number;
    createdAt: string;
    status: string;
    payments: {
        id: string;
        paymentMethod: string;
        paymentStatus: string;
        amount: number;
        paymentReferenceNumber: string | null;
        paymentProofPhoto: string | null;
    }[];
};

export type TSalesAndFinancialsResponse = {
    summary: TFinancialSummary;
    pnl: TPnLOverview;
    expenses: TExpenseBreakdown;
    losses: TLossBreakdown;
    stockTransactionsSummary?: TStockTransactionCostSummary;
    paymentBreakdown: TPaymentBreakdown;
    orderTypeBreakdown: TOrderTypeBreakdown;
    topProducts: TTopProduct[];
    dailyTrend: TDailyFinancialTrend[];
    orders: TSalesOrder[];
};
