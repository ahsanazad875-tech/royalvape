using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using POS.Permissions;
using POS.ProductTypes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace POS.Products
{
    [Authorize(POSPermissions.Products.Default)]
    public class ProductAppService :
    CrudAppService<Product, ProductDto, Guid, PagedAndSortedResultRequestDto, CreateUpdateProductDto>,
    IProductAppService
    {
        public ProductAppService(IRepository<Product, Guid> repository)
            : base(repository)
        {
            CreatePolicyName = POSPermissions.Products.Create;
            UpdatePolicyName = POSPermissions.Products.Edit;
            DeletePolicyName = POSPermissions.Products.Delete;
        }
        public override async Task<ProductDto> CreateAsync(CreateUpdateProductDto input)
        {
            await CheckCreatePolicyAsync();

            var entity = ObjectMapper.Map<CreateUpdateProductDto, Product>(input);

            // only generate if not provided
            if (string.IsNullOrWhiteSpace(entity.ProductNo))
            {
                // ABP auto-scopes to current tenant (if you use multi-tenancy)
                var count = await Repository.GetCountAsync();
                var next = count + 1;
                entity.ProductNo = $"P-{next}";            // or $"P-{next:D5}" for zero padding
            }

            entity = await Repository.InsertAsync(entity, autoSave: true);
            return ObjectMapper.Map<Product, ProductDto>(entity);
        }
        protected override async Task<IQueryable<Product>> CreateFilteredQueryAsync(PagedAndSortedResultRequestDto input)
        {
            return await Repository.WithDetailsAsync(p => p.ProductType);
        }
        public override async Task<PagedResultDto<ProductDto>> GetListAsync(PagedAndSortedResultRequestDto input)
        {
            var query = await Repository.GetQueryableAsync();

            var totalCount = query.Count();

            var items = query
                .Include(x => x.Creator)
                .Include(x => x.LastModifier)
                .Include(x => x.ProductType)
                .Skip(input.SkipCount)
                .Take(input.MaxResultCount)
                .ToList();

            var productDtos = new List<ProductDto>();

            foreach (var item in items)
            {
                var dto = ObjectMapper.Map<Product, ProductDto>(item);

                dto.CreatorName = item.Creator != null ? item.Creator.UserName : null;
                dto.ModifiedBy = item.LastModifier != null ? item.LastModifier.UserName : null;
                dto.ProductTypeName = item.ProductType?.Type ?? "";

                productDtos.Add(dto);
            }

            return new PagedResultDto<ProductDto>(totalCount, productDtos);
        }
    }
}
