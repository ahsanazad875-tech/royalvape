using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;

namespace POS.ProductTypes
{
    public class ProductTypeDto : FullAuditedEntityDto<Guid>
    {
        public string? Type { get; set; }
        public string? TypeDesc { get; set; }
        public string? CreatorName { get; set; }
        public string? LastModifiedBy { get; set; }
    }

    public class CreateUpdateProductTypeDto
    {
        [Required]
        [StringLength(64)]
        public string Type { get; set; } = default!;

        [StringLength(200)]
        public string? TypeDesc { get; set; }
    }
}
