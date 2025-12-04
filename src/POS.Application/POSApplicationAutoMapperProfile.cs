using AutoMapper;
using POS.Branches;
using POS.Products;
using POS.ProductTypes;
using POS.StockMovement;
using POS.StockMovements;

namespace POS;

public class POSApplicationAutoMapperProfile : Profile
{
    public POSApplicationAutoMapperProfile()
    {
        /* You can configure your AutoMapper mapping configuration here.
         * Alternatively, you can split your mapping configurations
         * into multiple profile classes for a better organization. */

        // ProductType
        CreateMap<ProductType, ProductTypeDto>();
        CreateMap<CreateUpdateProductTypeDto, ProductType>();

        // Product
        CreateMap<Product, ProductDto>()
            .ForMember(d => d.ProductTypeName, m => m.MapFrom(s => s.ProductType.Type));
        CreateMap<CreateUpdateProductDto, Product>();

        CreateMap<Branch, BranchDto>();
        CreateMap<CreateUpdateBranchDto, Branch>();
        // Stock Movement
        CreateMap<StockMovementHeader, StockMovementHeaderDto>()
            .ForMember(d => d.Details, m => m.MapFrom(s => s.StockMovementDetails));
        CreateMap<CreateUpdateStockMovementHeaderDto, StockMovementHeader>();

        CreateMap<StockMovementDetail, StockMovementDetailDto>()
            .ForMember(d => d.ProductName, m => m.MapFrom(s => s.Product.ProductName));
        CreateMap<CreateUpdateStockMovementDetailDto, StockMovementDetail>();
    }
}
