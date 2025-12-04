using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;

namespace POS.StockMovements
{
    public class ProductMovementFlatRequestDto : PagedAndSortedResultRequestDto
    {
        public Guid? BranchId { get; set; }
        public Guid? ProductId { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public Guid? ProductTypeId { get; set; }
        public StockMovementType? StockMovementType { get; set; }
        public bool IncludeCancelled { get; set; } = false;
    }
    public class ProductMovementDto : EntityDto<Guid>
    {
        public Guid HeaderId { get; set; }
        public string? StockMovementNo { get; set; }
        public DateTime MovementDate { get; set; }
        public Guid? CreatedByUserId { get; set; }
        public string? CreatedBy { get; set; }
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = default!;
        public StockMovementType StockMovementType { get; set; }
        public Guid ProductId { get; set; }
        public string? ProductName { get; set; }
        public string? ProductType { get; set; }
        public decimal QuantitySigned { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? AmountExclVat { get; set; }
        public decimal? AmountVat { get; set; }
        public decimal? AmountInclVat { get; set; }
        public string? Description { get; set; }
    }
}
