using Microsoft.AspNetCore.Authorization;
using POS.CommonDtos;
using POS.Permissions;
using System;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace POS.Branches
{
    [Authorize(POSPermissions.Branches.Default)]
    public class BranchAppService :
    CrudAppService<Branch, BranchDto, Guid, PagedAndSortedResultRequestDto, CreateUpdateBranchDto>,
    IBranchAppService
    {
        public BranchAppService(IRepository<Branch, Guid> repository)
            : base(repository)
        {
            CreatePolicyName = POSPermissions.Branches.Create;
            UpdatePolicyName = POSPermissions.Branches.Edit;
            DeletePolicyName = POSPermissions.Branches.Delete;
        }
        public async Task<ListResultDto<LookupDto<Guid>>> GetLookupAsync(LookupRequestDto input)
        {
            var filter = input.Filter?.Trim();

            var queryable = await Repository.GetQueryableAsync();

            var query =
                queryable
                .Where(x => x.IsActive) // optional: only active
                .WhereIf(!string.IsNullOrWhiteSpace(filter),
                    x => x.Name.Contains(filter) || x.Code.Contains(filter))
                .OrderBy(x => x.Name)
                .Select(x => new LookupDto<Guid>
                {
                    Id = x.Id,
                    DisplayName = x.Name + " (" + x.Code + ")"
                })
                .Take(20);

            var items = await AsyncExecuter.ToListAsync(query);
            return new ListResultDto<LookupDto<Guid>>(items);
        }
    }
}
