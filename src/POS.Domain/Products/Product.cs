using POS.ProductTypes;
using POS.StockMovement;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Domain.Entities.Auditing;
using Volo.Abp.Identity;

namespace POS.Products
{
    public class Product : FullAuditedAggregateRoot<Guid>
    {
        public Product() {
            StockMovementDetails = new List<StockMovementDetail>();
        }
        public string? ProductNo { get; set; }
        public string? ProductName { get; set; }
        public string? ProductDesc { get; set; }
        public string? ImageUrl { get; set; }
        public decimal BuyingUnitPrice { get; set; }
        public decimal SellingUnitPrice { get; set; }
        public UoMEnum UoM { get; set; }
        public Guid ProductTypeId { get; set; }
        public ProductType ProductType { get; set; } = default!;
        public List<StockMovementDetail> StockMovementDetails { get; set; }
        public virtual IdentityUser? Creator { get; set; }
        public virtual IdentityUser? LastModifier { get; set; }
    }
}
