using System;
using Volo.Abp.Application.Dtos;

namespace POS.StockMovements;

public class ProductStockListRequestDto : PagedAndSortedResultRequestDto
{
    public Guid? BranchId { get; set; }
    public string? Filter { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? ProductTypeId { get; set; }
    public bool OnlyAvailable { get; set; } = false;
}
