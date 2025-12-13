using System;
using Volo.Abp.Application.Dtos;

namespace POS.Products;

public class ProductListRequestDto : PagedAndSortedResultRequestDto
{
    public Guid? ProductId { get; set; }
    public Guid? ProductTypeId { get; set; }
    public string? Filter { get; set; }
}
