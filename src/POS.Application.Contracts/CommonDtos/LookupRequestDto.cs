using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;

namespace POS.CommonDtos
{
    public class LookupRequestDto : PagedAndSortedResultRequestDto
    {
        public string? Filter { get; set; }
    }
}
