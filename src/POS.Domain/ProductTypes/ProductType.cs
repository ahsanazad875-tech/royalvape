using POS.Products;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Domain.Entities.Auditing;
using Volo.Abp.Identity;

namespace POS.ProductTypes
{
    public class ProductType : FullAuditedAggregateRoot<Guid>
    {
        public ProductType() { 
            Products = new List<Product>();
        }
        public string? Type { get; set; }
        public string? TypeDesc { get; set; }
        public List<Product> Products { get; set; }
        public virtual IdentityUser? Creator { get; set; }
        public virtual IdentityUser? LastModifier { get; set; }
    }
}
