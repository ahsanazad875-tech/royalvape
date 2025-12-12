using POS.Products;
using System;

namespace POS.StockMovements
{
    public class StockReportDto
    {
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = default!;
        public Guid ProductId { get; set; }
        public string ProductName { get; set; } = default!;
        public Guid? ProductTypeId { get; set; }
        public string? ProductType { get; set; }
        public UoMEnum UoM { get; set; }
        public decimal BuyingUnitPrice { get; set; }
        public decimal SellingUnitPrice { get; set; }
        public string? ImageUrl { get; set; }
        public DateTime LastUpdated { get; set; }
        public decimal OnHand { get; set; }
    }
    public class OnHandItemDto
    {
        public Guid ProductId { get; set; }
        public decimal OnHand { get; set; }
    }
}
