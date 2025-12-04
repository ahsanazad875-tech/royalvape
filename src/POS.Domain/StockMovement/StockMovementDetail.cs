using POS.Products;
using POS.ProductTypes;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Domain.Entities.Auditing;

namespace POS.StockMovement
{
    public class StockMovementDetail : FullAuditedEntity<Guid>
    {
        public Guid StockMovementHeaderId { get; set; }
        public StockMovementHeader StockMovementHeader { get; set; } = default!;
        public Guid ProductId { get; set; }
        public Product Product { get; set; } = default!;
        public decimal Quantity { get; set; }
        public decimal? UnitPrice { get; set; }
        public UoMEnum UoM { get; set; }
        public decimal? DiscountAmount { get; set; }
        public decimal? AmountExclVat { get; set; }
        public decimal? AmountVat { get; set; }
        public decimal? AmountInclVat { get; set; }
    }
}
