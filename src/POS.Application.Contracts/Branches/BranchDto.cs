using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;

namespace POS.Branches
{
    public class BranchDto : FullAuditedEntityDto<Guid>
    {
        public string Code { get; set; } = default!;
        public string Name { get; set; } = default!;
        public decimal VatPerc { get; set; }
        public bool IsActive { get; set; }
    }
    public class CreateUpdateBranchDto
    {
        [Required]
        [StringLength(32)]
        public string Code { get; set; } = default!;

        [Required]
        [StringLength(128)]
        public string Name { get; set; } = default!;
        [Range(0, 100)]
        public decimal VatPerc { get; set; }
        [Required]
        public bool IsActive { get; set; }
    }
}
