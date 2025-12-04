using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Domain.Entities.Auditing;
using Volo.Abp.Identity;

namespace POS.Branches
{
    public class Branch : FullAuditedAggregateRoot<Guid>
    {
        public string Code { get; set; } = default!;
        public string Name { get; set; } = default!;
        public decimal VatPerc { get; set; }
        public bool IsActive { get; set; }
        public virtual IdentityUser? Creator { get; set; }
        public virtual IdentityUser? LastModifier { get; set; }
    }
}
