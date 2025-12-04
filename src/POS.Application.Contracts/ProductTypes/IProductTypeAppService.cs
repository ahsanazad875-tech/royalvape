using POS.Products;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace POS.ProductTypes
{
    public interface IProductTypeAppService :
    ICrudAppService<
        ProductTypeDto,                 // TGetOutputDto
        Guid,                       // TKey
        PagedAndSortedResultRequestDto, // TPagedAndSortedResultRequestDto
        CreateUpdateProductTypeDto>     // TCreateUpdateDto
    { }
}
