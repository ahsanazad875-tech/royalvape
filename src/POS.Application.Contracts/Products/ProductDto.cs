using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;

namespace POS.Products
{
    public class ProductDto : FullAuditedEntityDto<Guid>
    {
        public string? ProductNo { get; set; }
        public string? ProductName { get; set; }
        public string? ProductDesc { get; set; }
        public string? ImageUrl { get; set; }
        public decimal BuyingUnitPrice { get; set; }
        public decimal SellingUnitPrice { get; set; }
        public UoMEnum UoM { get; set; }

        public Guid ProductTypeId { get; set; }
        public string? ProductTypeName { get; set; }
        public string? CreatorName { get; set; }
        public string? ModifiedBy { get; set; }
    }

    public class CreateUpdateProductDto
    {
        [StringLength(100)]
        public string? ProductNo { get; set; }

        [Required]
        [StringLength(150)]
        public string ProductName { get; set; } = default!;

        [StringLength(300)]
        public string? ProductDesc { get; set; }
        [StringLength(512)]
        public string? ImageUrl { get; set; }
        public decimal BuyingUnitPrice { get; set; }
        public decimal SellingUnitPrice { get; set; }

        public UoMEnum UoM { get; set; }

        [Required]
        public Guid ProductTypeId { get; set; }
    }
}
