using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace POS.Products
{
    public interface IProductAppService :
    ICrudAppService<
        ProductDto,                 // TGetOutputDto
        Guid,                       // TKey
        PagedAndSortedResultRequestDto, // TPagedAndSortedResultRequestDto
        CreateUpdateProductDto>     // TCreateUpdateDto
    { }
}
