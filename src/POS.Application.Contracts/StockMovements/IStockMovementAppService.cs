using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace POS.StockMovements
{
    public interface IStockMovementAppService :
    ICrudAppService<
        StockMovementHeaderDto,           // The DTO returned
        Guid,                             // Primary key type
        PagedAndSortedResultRequestDto,   // Paging + sorting
        CreateUpdateStockMovementHeaderDto> // Create/Update DTO (includes details)
    {
        // Actions
        Task CancelAsync(Guid id, string? reason = null);
        Task<StockMovementHeaderDto> AddStockAsync(CreateUpdateStockMovementHeaderDto dto);
        Task<StockMovementHeaderDto> CheckoutCartAsync(CreateUpdateStockMovementHeaderDto dto);
        Task<StockMovementHeaderDto> AdjustStockAsync(CreateUpdateStockMovementHeaderDto dto);

        // Reports
        Task<PagedResultDto<ProductMovementDto>> GetProductMovementsAsync(ProductMovementFlatRequestDto input);
        Task<PagedResultDto<StockReportDto>> GetStockReportAsync(ProductStockListRequestDto input);
        Task<PagedResultDto<ProductStockListItemDto>> GetProductStockListAsync(ProductStockListRequestDto input);
        // On-hand helpers (for cart)
        Task<Dictionary<Guid, decimal>> GetOnHandMapAsync(List<Guid> productIds, Guid? branchId = null);
        Task<List<OnHandItemDto>> GetOnHandListAsync(List<Guid> productIds, Guid? branchId = null);

        Task<StockDashboardSummaryDto> GetDashboardSummaryAsync(Guid? branchId = null, DateTime? fromDate = null, DateTime? toDate = null);
        Task<List<DailySalesPointDto>> GetLast7DaysSalesAsync(Guid? branchId = null, DateTime? fromDate = null, DateTime? toDate = null);
        Task<List<StockByProductTypeDto>> GetStockByProductTypeAsync(Guid? branchId = null, DateTime? fromDate = null, DateTime? toDate = null);
    }
}
