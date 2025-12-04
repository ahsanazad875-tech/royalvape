using POS.Products;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;

namespace POS.StockMovements
{
    public class StockMovementDetailDto : FullAuditedEntityDto<Guid>
    {
        public Guid StockMovementHeaderId { get; set; }

        public Guid ProductId { get; set; }
        public string? ProductName { get; set; } // convenience (optional)
        public UoMEnum UoM { get; set; }

        public decimal Quantity { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? DiscountAmount { get; set; }
        public decimal? AmountExclVat { get; set; }
        public decimal? AmountVat { get; set; }
        public decimal? AmountInclVat { get; set; }
    }

    public class StockMovementHeaderDto : FullAuditedEntityDto<Guid>
    {
        public string? StockMovementNo { get; set; }
        public StockMovementType StockMovementType { get; set; }
        public string? BusinessPartnerName { get; set; }
        public string? Description { get; set; }

        public decimal? AmountExclVat { get; set; }
        public decimal? AmountVat { get; set; }
        public decimal? AmountInclVat { get; set; }
        public string? Branch { get; set; }
        public bool IsCancelled { get; set; }
        public List<StockMovementDetailDto> Details { get; set; } = new();
    }

    public class CreateUpdateStockMovementDetailDto
    {
        [Required]
        public Guid ProductId { get; set; }
        public UoMEnum UoM { get; set; }

        public decimal Quantity { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? DiscountAmount { get; set; }
        public decimal? AmountExclVat { get; set; }
        public decimal? AmountVat { get; set; }
        public decimal? AmountInclVat { get; set; }
    }

    public class CreateUpdateStockMovementHeaderDto
    {
        public string? StockMovementNo { get; set; }

        [Required]
        public StockMovementType StockMovementType { get; set; } = default!;

        [StringLength(150)]
        public string? BusinessPartnerName { get; set; }

        [StringLength(300)]
        public string? Description { get; set; }

        public decimal? AmountExclVat { get; set; }
        public decimal? AmountVat { get; set; }
        public decimal? AmountInclVat { get; set; }
        public Guid BranchId { get; set; }
        public bool IsCancelled { get; set; }
        // Child lines included when creating/updating a header
        public List<CreateUpdateStockMovementDetailDto> Details { get; set; } = new();
    }
}
