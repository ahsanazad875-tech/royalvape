using POS.CommonDtos;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace POS.Branches
{
    public interface IBranchAppService :
    ICrudAppService<
        BranchDto, Guid,
        PagedAndSortedResultRequestDto,
        CreateUpdateBranchDto>
    {
        Task<ListResultDto<LookupDto<Guid>>> GetLookupAsync(LookupRequestDto input);
    }
}
