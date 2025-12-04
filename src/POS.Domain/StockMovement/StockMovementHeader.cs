using POS.Branches;
using POS.StockMovements;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Domain.Entities.Auditing;
using Volo.Abp.Identity;

namespace POS.StockMovement
{
    public class StockMovementHeader : FullAuditedAggregateRoot<Guid>
    {
        public StockMovementHeader() {
            StockMovementDetails = new List<StockMovementDetail>();
        }
        public string? StockMovementNo { get; set; }
        public StockMovementType StockMovementType { get; set; }
        public string? BusinessPartnerName { get; set; }
        public string? Description { get; set; }
        public decimal? AmountExclVat { get; set; }
        public decimal? AmountVat { get; set; }
        public decimal? AmountInclVat { get; set; }
        public Guid BranchId { get; set; }
        public Branch Branch { get; set; } = null!;
        public bool IsCancelled { get; set; }
        public List<StockMovementDetail> StockMovementDetails { get; set; }
        public virtual IdentityUser? Creator { get; set; }
        public virtual IdentityUser? LastModifier { get; set; }
    }
}
