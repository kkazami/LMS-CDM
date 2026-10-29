import type {
  BreakEvenCalculationResult,
  BusinessPlanData,
  FinancialPlanCalculationResult,
  FinancialWarning,
  SalesItemCalculationResult,
} from "./types";

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function safeNonNegative(n: unknown): number {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num) || num < 0) return 0;
  return round2(num);
}

export function formatPhpCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const sign = safe < 0 ? "-" : "";
  const abs = Math.abs(safe);
  return `${sign}PHP ${abs.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function calculateFinancialPlan(
  financialPlan: BusinessPlanData["financialPlan"]
): FinancialPlanCalculationResult {
  const warnings: FinancialWarning[] = [];

  // 1. Startup Capital Requirements (Sum of all startup expenses)
  let startupCapexTotal = 0;
  let startupPreOperatingTotal = 0;
  let startupWorkingCapitalReserve = 0;

  for (const row of financialPlan.startupCosts ?? []) {
    const rawAmt = typeof row.amount === "number" ? row.amount : Number(row.amount);
    if (!Number.isFinite(rawAmt) || rawAmt < 0) {
      warnings.push({
        code: "NEGATIVE_STARTUP_COST",
        severity: "ERROR",
        message: `Startup cost "${row.description || "Unnamed row"}" has an invalid or negative amount.`,
      });
      continue;
    }
    if (row.category === "CAPEX") {
      startupCapexTotal += rawAmt;
    } else if (row.category === "WORKING_CAPITAL") {
      startupWorkingCapitalReserve += rawAmt;
    } else {
      startupPreOperatingTotal += rawAmt;
    }
  }

  startupCapexTotal = round2(startupCapexTotal);
  startupPreOperatingTotal = round2(startupPreOperatingTotal);
  startupWorkingCapitalReserve = round2(startupWorkingCapitalReserve);
  const totalStartupCosts = round2(
    startupCapexTotal + startupPreOperatingTotal + startupWorkingCapitalReserve
  );

  // 2. Owner Contributions & Funding Sources (Never counted as Sales Revenue)
  let ownerEquityTotal = 0;
  let grantsAndLoansTotal = 0;

  for (const row of financialPlan.fundingSources ?? []) {
    const rawAmt = typeof row.amount === "number" ? row.amount : Number(row.amount);
    if (!Number.isFinite(rawAmt) || rawAmt < 0) {
      warnings.push({
        code: "NEGATIVE_FUNDING_SOURCE",
        severity: "ERROR",
        message: `Funding source "${row.description || "Unnamed row"}" has an invalid or negative amount.`,
      });
      continue;
    }
    if (row.sourceType === "OWNER_EQUITY") {
      ownerEquityTotal += rawAmt;
    } else {
      grantsAndLoansTotal += rawAmt;
    }
  }

  ownerEquityTotal = round2(ownerEquityTotal);
  grantsAndLoansTotal = round2(grantsAndLoansTotal);
  const totalFundingSources = round2(ownerEquityTotal + grantsAndLoansTotal);
  const fundingSurplusOrGap = round2(totalFundingSources - totalStartupCosts);

  if (totalStartupCosts > 0 && totalFundingSources < totalStartupCosts) {
    warnings.push({
      code: "STARTUP_FUNDING_GAP",
      severity: "WARNING",
      message: `Planned funding sources (${formatPhpCurrency(totalFundingSources)}) are less than Total Startup Costs (${formatPhpCurrency(totalStartupCosts)}). Increase owner contributions or reduce startup expenses.`,
    });
  }

  // 3. Sales Forecast & Cost of Goods Sold (COGS)
  // Sales Revenue = Quantity Sold * Selling Price
  const salesItemResults: SalesItemCalculationResult[] = [];
  let totalMonthlyUnits = 0;
  let monthlySalesRevenue = 0;
  let monthlyCogs = 0;

  for (const item of financialPlan.salesForecast ?? []) {
    const qtyRaw = typeof item.monthlyQuantity === "number" ? item.monthlyQuantity : Number(item.monthlyQuantity);
    const priceRaw = typeof item.sellingPricePerUnit === "number" ? item.sellingPricePerUnit : Number(item.sellingPricePerUnit);
    const costRaw = typeof item.unitVariableCost === "number" ? item.unitVariableCost : Number(item.unitVariableCost);

    if (
      !Number.isFinite(qtyRaw) ||
      !Number.isFinite(priceRaw) ||
      !Number.isFinite(costRaw) ||
      qtyRaw < 0 ||
      priceRaw < 0 ||
      costRaw < 0
    ) {
      warnings.push({
        code: "INVALID_SALES_ROW",
        severity: "ERROR",
        message: `Sales forecast row "${item.productOrServiceName || "Unnamed item"}" contains negative or invalid values.`,
      });
      continue;
    }

    const qty = round2(qtyRaw);
    const price = round2(priceRaw);
    const cost = round2(costRaw);
    const unitMargin = round2(price - cost);
    const rev = round2(qty * price);
    const cogs = round2(qty * cost);
    const gross = round2(rev - cogs);

    if (price > 0 && unitMargin <= 0) {
      warnings.push({
        code: "NON_POSITIVE_CONTRIBUTION_MARGIN",
        severity: "WARNING",
        message: `Product "${item.productOrServiceName || "Unnamed item"}" has a unit selling price (${formatPhpCurrency(price)}) less than or equal to its variable unit cost (${formatPhpCurrency(cost)}).`,
      });
    }

    salesItemResults.push({
      id: item.id,
      name: item.productOrServiceName,
      monthlyQuantity: qty,
      sellingPricePerUnit: price,
      unitVariableCost: cost,
      unitContributionMargin: unitMargin,
      monthlyRevenue: rev,
      monthlyCogs: cogs,
      monthlyGrossProfit: gross,
    });

    totalMonthlyUnits += qty;
    monthlySalesRevenue += rev;
    monthlyCogs += cogs;
  }

  totalMonthlyUnits = round2(totalMonthlyUnits);
  monthlySalesRevenue = round2(monthlySalesRevenue);
  monthlyCogs = round2(monthlyCogs);
  const annualSalesRevenue = round2(monthlySalesRevenue * 12);
  const annualCogs = round2(monthlyCogs * 12);

  // 4. Gross Profit = Revenue - Cost of Goods Sold
  const monthlyGrossProfit = round2(monthlySalesRevenue - monthlyCogs);
  const annualGrossProfit = round2(annualSalesRevenue - annualCogs);
  const grossMarginPercent =
    monthlySalesRevenue > 0 ? round2((monthlyGrossProfit / monthlySalesRevenue) * 100) : 0;

  // 5. Operating Expenses (Strictly separated from Startup CAPEX)
  let monthlyFixedOperatingExpenses = 0;
  let monthlyVariableOperatingExpenses = 0;

  const capexDescriptions = new Set(
    (financialPlan.startupCosts ?? [])
      .filter((r) => r.category === "CAPEX" && r.description.trim().length > 3)
      .map((r) => r.description.trim().toLowerCase())
  );

  for (const row of financialPlan.operatingExpenses ?? []) {
    const rawAmt = typeof row.monthlyAmount === "number" ? row.monthlyAmount : Number(row.monthlyAmount);
    if (!Number.isFinite(rawAmt) || rawAmt < 0) {
      warnings.push({
        code: "NEGATIVE_OPEX",
        severity: "ERROR",
        message: `Operating expense "${row.description || "Unnamed expense"}" has an invalid or negative amount.`,
      });
      continue;
    }

    const normalizedDesc = row.description.trim().toLowerCase();
    if (normalizedDesc && capexDescriptions.has(normalizedDesc)) {
      warnings.push({
        code: "DOUBLE_COUNTED_CAPEX",
        severity: "WARNING",
        message: `"${row.description}" is listed in both Startup Capital Equipment (CAPEX) and Monthly Operating Expenses. Do not expense one-time equipment purchases in full every month.`,
      });
    }

    if (row.costBehavior === "VARIABLE") {
      monthlyVariableOperatingExpenses += rawAmt;
    } else {
      monthlyFixedOperatingExpenses += rawAmt;
    }
  }

  const depreciation = safeNonNegative(financialPlan.estimatedMonthlyDepreciation);
  monthlyFixedOperatingExpenses = round2(monthlyFixedOperatingExpenses + depreciation);
  monthlyVariableOperatingExpenses = round2(monthlyVariableOperatingExpenses);

  const monthlyOperatingExpenses = round2(
    monthlyFixedOperatingExpenses + monthlyVariableOperatingExpenses
  );
  const annualOperatingExpenses = round2(monthlyOperatingExpenses * 12);

  // 6. Operating Profit = Gross Profit - Operating Expenses
  const monthlyOperatingProfit = round2(monthlyGrossProfit - monthlyOperatingExpenses);
  const annualOperatingProfit = round2(annualGrossProfit - annualOperatingExpenses);

  // 7. Net Profit = Total Revenue - Total Expenses (including non-operating items and taxes)
  const nonOp = safeNonNegative(financialPlan.monthlyNonOperatingExpense);
  const tax = safeNonNegative(financialPlan.estimatedMonthlyTaxExpense);
  const monthlyNonOperatingAndTax = round2(nonOp + tax);
  const annualNonOperatingAndTax = round2(monthlyNonOperatingAndTax * 12);

  const monthlyNetProfit = round2(monthlyOperatingProfit - monthlyNonOperatingAndTax);
  const annualNetProfit = round2(annualOperatingProfit - annualNonOperatingAndTax);
  const netMarginPercent =
    monthlySalesRevenue > 0 ? round2((monthlyNetProfit / monthlySalesRevenue) * 100) : 0;

  if (monthlySalesRevenue > 0 && monthlyNetProfit < 0) {
    warnings.push({
      code: "NEGATIVE_NET_PROFIT",
      severity: "WARNING",
      message: `Projected monthly Net Profit is negative (${formatPhpCurrency(monthlyNetProfit)}). Review your unit pricing, sales volume, or monthly operating expenses.`,
    });
  }

  // 8. Cash Flow Projection vs Accounting Profit
  // Opening cash balance = Total Funding Sources - Upfront Startup Cash Outlays (CAPEX + Pre-Op)
  const openingCashBalance = round2(
    totalFundingSources - (startupCapexTotal + startupPreOperatingTotal)
  );
  // Operating cash flow adds back non-cash depreciation expense
  const monthlyOperatingCashFlow = round2(monthlyNetProfit + depreciation);
  const projectedFirstMonthEndingCash = round2(openingCashBalance + monthlyOperatingCashFlow);
  const projectedYearOneEndingCash = round2(openingCashBalance + monthlyOperatingCashFlow * 12);

  // 9. Break-Even Analysis
  // Break-even Units = Fixed Costs / (Selling Price per Unit - Variable Cost per Unit)
  const totalUnitVariableCostsPlusVarOpex = round2(
    monthlyCogs + monthlyVariableOperatingExpenses
  );
  const weightedSellingPricePerUnit =
    totalMonthlyUnits > 0 ? round2(monthlySalesRevenue / totalMonthlyUnits) : 0;
  const weightedVariableCostPerUnit =
    totalMonthlyUnits > 0 ? round2(totalUnitVariableCostsPlusVarOpex / totalMonthlyUnits) : 0;
  const weightedContributionMarginPerUnit = round2(
    weightedSellingPricePerUnit - weightedVariableCostPerUnit
  );

  let breakEven: BreakEvenCalculationResult;
  if (totalMonthlyUnits <= 0 || weightedSellingPricePerUnit <= 0) {
    breakEven = {
      isCalculable: false,
      fixedCostsMonthly: monthlyFixedOperatingExpenses,
      weightedSellingPricePerUnit,
      weightedVariableCostPerUnit,
      weightedContributionMarginPerUnit,
      breakEvenUnits: null,
      breakEvenRevenue: null,
      explanation:
        "Enter at least one product/service with a positive monthly quantity and selling price to compute Break-Even Units.",
    };
  } else if (weightedContributionMarginPerUnit <= 0) {
    warnings.push({
      code: "NON_POSITIVE_CONTRIBUTION_MARGIN",
      severity: "WARNING",
      message:
        "Break-even cannot be reached because the unit contribution margin (Selling Price minus Variable Cost) is zero or negative.",
    });
    breakEven = {
      isCalculable: false,
      fixedCostsMonthly: monthlyFixedOperatingExpenses,
      weightedSellingPricePerUnit,
      weightedVariableCostPerUnit,
      weightedContributionMarginPerUnit,
      breakEvenUnits: null,
      breakEvenRevenue: null,
      explanation:
        weightedContributionMarginPerUnit === 0
          ? "Contribution margin per unit is PHP 0.00 (Selling Price equals Variable Cost). Break-even cannot be reached because each unit contributes nothing toward Fixed Costs."
          : `Contribution margin per unit is negative (${formatPhpCurrency(weightedContributionMarginPerUnit)}). Variable cost exceeds selling price, so selling more units increases losses.`,
    };
  } else {
    const exactUnits = monthlyFixedOperatingExpenses / weightedContributionMarginPerUnit;
    const roundedUnits = Math.ceil(exactUnits);
    const breakEvenRev = round2(exactUnits * weightedSellingPricePerUnit);
    breakEven = {
      isCalculable: true,
      fixedCostsMonthly: monthlyFixedOperatingExpenses,
      weightedSellingPricePerUnit,
      weightedVariableCostPerUnit,
      weightedContributionMarginPerUnit,
      breakEvenUnits: roundedUnits,
      breakEvenRevenue: breakEvenRev,
      explanation: `With Fixed Costs of ${formatPhpCurrency(monthlyFixedOperatingExpenses)}/month and a unit contribution margin of ${formatPhpCurrency(weightedContributionMarginPerUnit)}, the business must sell at least ${roundedUnits.toLocaleString("en-PH")} units (${formatPhpCurrency(breakEvenRev)} in monthly sales) to break even.`,
    };
  }

  return {
    startupCapexTotal,
    startupPreOperatingTotal,
    startupWorkingCapitalReserve,
    totalStartupCosts,
    ownerEquityTotal,
    grantsAndLoansTotal,
    totalFundingSources,
    fundingSurplusOrGap,
    salesItemResults,
    totalMonthlyUnits,
    monthlySalesRevenue,
    annualSalesRevenue,
    monthlyCogs,
    annualCogs,
    monthlyGrossProfit,
    annualGrossProfit,
    grossMarginPercent,
    monthlyFixedOperatingExpenses,
    monthlyVariableOperatingExpenses,
    monthlyOperatingExpenses,
    annualOperatingExpenses,
    monthlyOperatingProfit,
    annualOperatingProfit,
    monthlyNonOperatingAndTax,
    annualNonOperatingAndTax,
    monthlyNetProfit,
    annualNetProfit,
    netMarginPercent,
    openingCashBalance,
    monthlyOperatingCashFlow,
    projectedFirstMonthEndingCash,
    projectedYearOneEndingCash,
    breakEven,
    warnings,
  };
}
