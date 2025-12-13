using POS.Products;
using System;
using Volo.Abp.Application.Dtos;

namespace POS.StockMovements;

public class ProductStockListItemDto : EntityDto<Guid>
{
    public string ProductNo { get; set; } = string.Empty;
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public Guid? ProductTypeId { get; set; }
    public string ProductType { get; set; } = string.Empty;
    public UoMEnum UoM { get; set; }
    public decimal BuyingUnitPrice { get; set; }
    public decimal SellingUnitPrice { get; set; }
    public string? ImageUrl { get; set; }
    public decimal OnHand { get; set; }
}