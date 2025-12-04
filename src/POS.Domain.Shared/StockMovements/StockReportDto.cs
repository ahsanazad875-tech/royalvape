using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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
        public decimal OnHand { get; set; }
    }
    public class OnHandItemDto
    {
        public Guid ProductId { get; set; }
        public decimal OnHand { get; set; }
    }
}
