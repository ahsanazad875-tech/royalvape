using System;

namespace POS.StockMovements;

public class StockDashboardSummaryDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public decimal PeriodSalesInclVat { get; set; }
    public decimal PeriodProfitInclVat { get; set; }
    public decimal StockValue { get; set; }
    public int ActiveProducts { get; set; }
    public int LowStockItems { get; set; }
}

public class DailySalesPointDto
{
    public DateTime Date { get; set; }
    public decimal Amount { get; set; }
}

public class StockByProductTypeDto
{
    public Guid ProductTypeId { get; set; }
    public string ProductType { get; set; } = string.Empty;
    public decimal OnHand { get; set; }
}
