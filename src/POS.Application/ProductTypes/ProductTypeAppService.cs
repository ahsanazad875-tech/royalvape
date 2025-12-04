using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using POS.Permissions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace POS.ProductTypes
{
    [Authorize(POSPermissions.ProductTypes.Default)]
    public class ProductTypeAppService :
    CrudAppService<ProductType, ProductTypeDto, Guid, PagedAndSortedResultRequestDto, CreateUpdateProductTypeDto>,
    IProductTypeAppService
    {
        public ProductTypeAppService(IRepository<ProductType, Guid> repository)
            : base(repository)
        {
            CreatePolicyName = POSPermissions.ProductTypes.Create;
            UpdatePolicyName = POSPermissions.ProductTypes.Edit;
            DeletePolicyName = POSPermissions.ProductTypes.Delete;
        }
        public override async Task<PagedResultDto<ProductTypeDto>> GetListAsync(PagedAndSortedResultRequestDto input)
        {
            var query = await Repository.GetQueryableAsync();

            var totalCount = query.Count();

            var items = query
                .Include(x => x.Creator)
                .Include(x => x.LastModifier)
                .Skip(input.SkipCount)
                .Take(input.MaxResultCount)
                .ToList();

            var productTypeDtos = new List<ProductTypeDto>();

            foreach (var item in items)
            {
                var dto = ObjectMapper.Map<ProductType, ProductTypeDto>(item);

                dto.CreatorName = item.Creator != null ? item.Creator.UserName : null;
                dto.LastModifiedBy = item.LastModifier != null ? item.LastModifier.UserName : null;

                productTypeDtos.Add(dto);
            }

            return new PagedResultDto<ProductTypeDto>(totalCount, productTypeDtos);
        }
    }
}
