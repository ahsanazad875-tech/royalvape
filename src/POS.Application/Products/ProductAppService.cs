using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using POS.Permissions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
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
        public async Task<PagedResultDto<ProductDto>> GetProductListAsync(ProductListRequestDto input)
        {
            var query = await Repository.GetQueryableAsync();

            query = query
                .WhereIf(input.ProductId.HasValue && input.ProductId.Value != Guid.Empty,
                    x => x.Id == input.ProductId.Value)
                .WhereIf(input.ProductTypeId.HasValue && input.ProductTypeId.Value != Guid.Empty,
                    x => x.ProductTypeId == input.ProductTypeId.Value);

            if (!string.IsNullOrWhiteSpace(input.Filter))
            {
                var f = input.Filter.Trim().ToLower();
                query = query.Where(x => x.ProductName.ToLower().Contains(f));
            }

            var totalCount = await AsyncExecuter.CountAsync(query);

            var sorting = string.IsNullOrWhiteSpace(input.Sorting)
                ? $"{nameof(Product.ProductName)} ASC"
                : input.Sorting;

            var take = input.MaxResultCount > 0 ? input.MaxResultCount : 50;

            var items = await AsyncExecuter.ToListAsync(
                query
                    .Include(x => x.Creator)
                    .Include(x => x.LastModifier)
                    .Include(x => x.ProductType)
                    .OrderBy(sorting)
                    .Skip(input.SkipCount)
                    .Take(take)
            );

            var productDtos = new List<ProductDto>(items.Count);

            foreach (var item in items)
            {
                var dto = ObjectMapper.Map<Product, ProductDto>(item);

                dto.CreatorName = item.Creator?.UserName;
                dto.ModifiedBy = item.LastModifier?.UserName;
                dto.ProductTypeName = item.ProductType?.Type ?? "";

                productDtos.Add(dto);
            }

            return new PagedResultDto<ProductDto>(totalCount, productDtos);
        }
    }
}
