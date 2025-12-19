using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using POS.Permissions;
using POS.Products;
using POS.StockMovement;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Users;

namespace POS.StockMovements
{
    [Authorize(POSPermissions.StockMovements.Default)]
    public class StockMovementAppService :
        CrudAppService<StockMovementHeader, StockMovementHeaderDto, Guid,
            PagedAndSortedResultRequestDto, CreateUpdateStockMovementHeaderDto>,
        IStockMovementAppService
    {
        private readonly IRepository<StockMovementDetail, Guid> _detailRepo;
        private readonly IRepository<Product, Guid> _productRepo;

        public StockMovementAppService(
            IRepository<StockMovementHeader, Guid> headerRepo,
            IRepository<StockMovementDetail, Guid> detailRepo,
            IRepository<Product, Guid> productRepo)
            : base(headerRepo)
        {
            _detailRepo = detailRepo;
            _productRepo = productRepo;

            GetPolicyName = POSPermissions.StockMovements.Default;
            GetListPolicyName = POSPermissions.StockMovements.Default;
            CreatePolicyName = POSPermissions.StockMovements.Create;
            UpdatePolicyName = POSPermissions.StockMovements.Edit;
            DeletePolicyName = POSPermissions.StockMovements.Delete;
        }

        #region Helpers

        private Guid? CurrentBranchId =>
            Guid.TryParse(CurrentUser.FindClaimValue("branch_id"), out var g) ? g : (Guid?)null;

        private Task<bool> IsAdminAsync() =>
            AuthorizationService.IsGrantedAsync(POSPermissions.StockMovements.AllBranches);

        private async Task<Guid> RequireUserBranchAsync()
        {
            var bid = CurrentBranchId;
            if (!bid.HasValue)
                throw new BusinessException("NoBranchAssigned")
                    .WithData("Message", "User does not have a branch assigned.");
            return bid.Value;
        }

        private const decimal DefaultVatRate = 0.15m;

        private static decimal ResolveVatRate(StockMovementType type) =>
            type is StockMovementType.AdjustmentPlus or StockMovementType.AdjustmentMinus
                ? 0m
                : DefaultVatRate;

        private static void EnsureLines(List<CreateUpdateStockMovementDetailDto>? lines)
        {
            if (lines == null || lines.Count == 0)
                throw new BusinessException("NoLines");

            foreach (var l in lines)
            {
                if (l.Quantity <= 0) throw new BusinessException("QtyMustBePositive");
                if (l.UnitPrice is < 0) throw new BusinessException("PriceInvalid");
                if (l.DiscountAmount is < 0) throw new BusinessException("DiscountInvalid");
            }
        }

        private static void CalcAmounts(CreateUpdateStockMovementDetailDto d, decimal vatRate)
        {
            var qty = d.Quantity;
            var unit = d.UnitPrice ?? 0m;
            var disc = d.DiscountAmount ?? 0m;

            var net = Math.Max(0m, qty * unit - disc);
            d.AmountExclVat = decimal.Round(net, 2);
            d.AmountVat = decimal.Round(net * vatRate, 2);
            d.AmountInclVat = decimal.Round(net * (1 + vatRate), 2);
        }

        private static void SumHeader(CreateUpdateStockMovementHeaderDto h)
        {
            var details = h.Details ?? Enumerable.Empty<CreateUpdateStockMovementDetailDto>();
            h.AmountExclVat = decimal.Round(details.Sum(x => x.AmountExclVat ?? 0m), 2);
            h.AmountVat = decimal.Round(details.Sum(x => x.AmountVat ?? 0m), 2);
            h.AmountInclVat = decimal.Round(details.Sum(x => x.AmountInclVat ?? 0m), 2);
        }

        private async Task EnforceBranchRulesAsync(CreateUpdateStockMovementHeaderDto input)
        {
            var isAdmin = await IsAdminAsync();

            if (isAdmin)
            {
                // Admin must explicitly target a branch
                if (input.BranchId == Guid.Empty)
                    throw new BusinessException("BranchRequiredForAdmin");

                // Admin can Purchase or Sale (no adjustments by design)
                //if (input.StockMovementType == StockMovementType.AdjustmentPlus ||
                //    input.StockMovementType == StockMovementType.AdjustmentMinus)
                //    throw new UserFriendlyException("Admins cannot adjust stock; only Purchase or Sale.");
            }
            else
            {
                // Non-admins are forced to their branch always
                input.BranchId = await RequireUserBranchAsync();
            }
        }

        #endregion

        #region CRUD

        public override async Task<StockMovementHeaderDto> CreateAsync(CreateUpdateStockMovementHeaderDto input)
        {
            await CheckCreatePolicyAsync();
            await EnforceBranchRulesAsync(input);

            EnsureLines(input.Details);

            if(input.StockMovementType == StockMovementType.AdjustmentPlus ||
               input.StockMovementType == StockMovementType.AdjustmentMinus)
            {
                var vatRate = ResolveVatRate(input.StockMovementType);
                foreach (var d in input.Details!)
                    CalcAmounts(d, vatRate);
            }

            SumHeader(input);

            var header = ObjectMapper.Map<CreateUpdateStockMovementHeaderDto, StockMovementHeader>(input);

            header.IsCancelled = false;

            header = await Repository.InsertAsync(header, autoSave: true);
            header.StockMovementNo = $"GM-{header.StockMovementSeq}";

            foreach (var d in input.Details!)
            {
                var detail = ObjectMapper.Map<CreateUpdateStockMovementDetailDto, StockMovementDetail>(d);
                detail.StockMovementHeaderId = header.Id;
                await _detailRepo.InsertAsync(detail, autoSave: true);
            }

            return ObjectMapper.Map<StockMovementHeader, StockMovementHeaderDto>(header);
        }

        public override async Task<StockMovementHeaderDto> GetAsync(Guid id)
        {
            var q = (await Repository.GetQueryableAsync())
                .Include(h => h.Branch)
                .Include(h => h.StockMovementDetails)
                    .ThenInclude(d => d.Product);

            var entity = await AsyncExecuter.FirstOrDefaultAsync(q.Where(x => x.Id == id));
            if (entity == null)
                throw new EntityNotFoundException(typeof(StockMovementHeader), id);

            if (!await IsAdminAsync())
            {
                var bid = await RequireUserBranchAsync();
                if (entity.BranchId != bid)
                    throw new UserFriendlyException("You are not allowed to access this record.");
            }

            return ObjectMapper.Map<StockMovementHeader, StockMovementHeaderDto>(entity);
        }

        protected override async Task<IQueryable<StockMovementHeader>> CreateFilteredQueryAsync(PagedAndSortedResultRequestDto input)
        {
            var q = await Repository.GetQueryableAsync();
            if (!await IsAdminAsync())
            {
                var bid = await RequireUserBranchAsync();
                q = q.Where(x => x.BranchId == bid);
            }
            return q;
        }

        public override async Task<StockMovementHeaderDto> UpdateAsync(Guid id, CreateUpdateStockMovementHeaderDto input)
        {
            var existing = await GetEntityByIdAsync(id);
            if (existing.IsCancelled)
                throw new UserFriendlyException("Cancelled movements cannot be updated.");

            await EnforceBranchRulesAsync(input);

            EnsureLines(input.Details);

            var vatRate = ResolveVatRate(input.StockMovementType);
            foreach (var d in input.Details!)
                CalcAmounts(d, vatRate);

            SumHeader(input);

            return await base.UpdateAsync(id, input);
        }

        #endregion

        #region Actions

        [Authorize(POSPermissions.StockMovements.Edit)]
        public virtual async Task CancelAsync(Guid id, string? reason = null)
        {
            var entity = await GetEntityByIdAsync(id);
            if (entity.IsCancelled) return;

            entity.IsCancelled = true;
            if (!string.IsNullOrWhiteSpace(reason))
            {
                entity.Description = string.IsNullOrWhiteSpace(entity.Description)
                    ? $"[CANCELLED] {reason}"
                    : $"{entity.Description} | [CANCELLED] {reason}";
            }

            await Repository.UpdateAsync(entity, autoSave: true);
        }

        [Authorize(POSPermissions.StockMovements.Create)]
        public virtual Task<StockMovementHeaderDto> AddStockAsync(CreateUpdateStockMovementHeaderDto dto)
        {
            dto.StockMovementType = StockMovementType.Purchase;
            return CreateAsync(dto);
        }

        // Admins can sell too, but must specify BranchId (EnforceBranchRules handles it)
        [Authorize(POSPermissions.StockMovements.Create)]
        public virtual async Task<StockMovementHeaderDto> CheckoutCartAsync(CreateUpdateStockMovementHeaderDto dto)
        {
            dto.StockMovementType = StockMovementType.Sale;
            return await CreateAsync(dto);
        }

        [Authorize(POSPermissions.StockMovements.PhysicalInventory)]
        public virtual async Task<StockMovementHeaderDto> AdjustStockAsync(CreateUpdateStockMovementHeaderDto dto)
        {
            if (dto.StockMovementType != StockMovementType.AdjustmentPlus &&
                dto.StockMovementType != StockMovementType.AdjustmentMinus)
                throw new UserFriendlyException("Invalid adjustment type.");

            return await CreateAsync(dto);
        }

        #endregion

        #region Reports & On-hand

        [Authorize(POSPermissions.StockMovements.Default)]
        public virtual async Task<PagedResultDto<ProductMovementDto>> GetProductMovementsAsync(ProductMovementFlatRequestDto input)
        {
            var isAdmin = await IsAdminAsync();
            var effectiveBranchId = isAdmin ? input.BranchId : await RequireUserBranchAsync();

            var details = await _detailRepo.GetQueryableAsync();

            var q = details
                .WhereIf(!input.IncludeCancelled, d => !d.StockMovementHeader.IsCancelled)
                .WhereIf(effectiveBranchId.HasValue && effectiveBranchId.Value != Guid.Empty,
                    d => d.StockMovementHeader.BranchId == effectiveBranchId.Value)
                .WhereIf(input.DateFrom.HasValue,
                    d => d.StockMovementHeader.CreationTime >= input.DateFrom.Value)
                .WhereIf(input.DateTo.HasValue,
                    d => d.StockMovementHeader.CreationTime <= input.DateTo.Value)
                .WhereIf(input.StockMovementType.HasValue,
                    d => d.StockMovementHeader.StockMovementType == input.StockMovementType.Value)
                .WhereIf(input.ProductId.HasValue && input.ProductId.Value != Guid.Empty,
                    d => d.ProductId == input.ProductId.Value)
                .WhereIf(input.ProductTypeId.HasValue && input.ProductTypeId.Value != Guid.Empty,
                    d => d.Product.ProductTypeId == input.ProductTypeId.Value)
                .Select(d => new ProductMovementDto
                {
                    Id = d.Id,
                    HeaderId = d.StockMovementHeaderId,
                    StockMovementNo = d.StockMovementHeader.StockMovementNo,
                    MovementDate = d.StockMovementHeader.CreationTime,
                    CreatedByUserId = d.StockMovementHeader.CreatorId,
                    CreatedBy = d.StockMovementHeader.Creator == null ? "" : d.StockMovementHeader.Creator.Name,
                    BranchId = d.StockMovementHeader.BranchId,
                    BranchName = d.StockMovementHeader.Branch.Name,
                    StockMovementType = d.StockMovementHeader.StockMovementType,
                    ProductId = d.ProductId,
                    ProductName = d.Product.ProductNo + " " + d.Product.ProductName,
                    ProductType = d.Product.ProductType.Type,
                    QuantitySigned =
                        (d.StockMovementHeader.StockMovementType == StockMovementType.Purchase ||
                         d.StockMovementHeader.StockMovementType == StockMovementType.AdjustmentPlus)
                            ? d.Quantity
                            : -d.Quantity,
                    UnitPrice = d.UnitPrice,
                    AmountExclVat = d.AmountExclVat,
                    AmountVat = d.AmountVat,
                    AmountInclVat = d.AmountInclVat,
                    Description = d.StockMovementHeader.Description
                });

            var sorting = string.IsNullOrWhiteSpace(input.Sorting)
                ? "MovementDate DESC, StockMovementNo DESC"
                : input.Sorting;

            q = q.OrderBy(sorting);

            var totalCount = await AsyncExecuter.CountAsync(q);
            var take = input.MaxResultCount > 0 ? input.MaxResultCount : 50;

            var items = await AsyncExecuter.ToListAsync(q.Skip(input.SkipCount).Take(take));
            return new PagedResultDto<ProductMovementDto>(totalCount, items);
        }

        [Authorize(POSPermissions.StockMovements.Default)]
        public virtual async Task<PagedResultDto<StockReportDto>> GetStockReportAsync(ProductStockListRequestDto input)
        {
            var isAdmin = await IsAdminAsync();
            var effectiveBranchId = isAdmin ? input.BranchId : await RequireUserBranchAsync();

            // Headers (base)
            var headers = (await Repository.GetQueryableAsync())
                .AsNoTracking()
                .Where(h => !h.IsCancelled)
                .WhereIf(effectiveBranchId.HasValue && effectiveBranchId.Value != Guid.Empty,
                    h => h.BranchId == effectiveBranchId!.Value);

            // Flatten Header -> Details, project only what we need
            var flat = headers.SelectMany(h => h.StockMovementDetails.Select(d => new
            {
                // Branch
                h.BranchId,
                BranchName = h.Branch.Name,

                // Product
                d.ProductId,
                ProductNo = d.Product.ProductNo,
                ProductTitle = d.Product.ProductName,
                ImageUrl = d.Product.ImageUrl,

                // IMPORTANT: keep your existing DTO property type/name (UoM or UoMEnum)
                UoM = d.Product.UoM,

                BuyingUnitPrice = d.Product.BuyingUnitPrice,
                SellingUnitPrice = d.Product.SellingUnitPrice,

                // Type
                ProductTypeId = d.Product.ProductTypeId,
                ProductType = d.Product.ProductType != null ? d.Product.ProductType.Type : null,

                // Movement
                MovementDate = h.CreationTime,

                SignedQty =
                    (h.StockMovementType == StockMovementType.Purchase ||
                     h.StockMovementType == StockMovementType.AdjustmentPlus)
                        ? d.Quantity
                        : -d.Quantity
            }));

            // Detail-level filters (more efficient than header.Any(...))
            flat = flat
                .WhereIf(input.ProductId.HasValue && input.ProductId.Value != Guid.Empty,
                    x => x.ProductId == input.ProductId!.Value)
                .WhereIf(input.ProductTypeId.HasValue && input.ProductTypeId.Value != Guid.Empty,
                    x => x.ProductTypeId == input.ProductTypeId!.Value);

            // Text filter (SQL translatable)
            if (!string.IsNullOrWhiteSpace(input.Filter))
            {
                var f = input.Filter.Trim();
                var pattern = $"%{f}%";

                flat = flat.Where(x =>
                    (!string.IsNullOrEmpty(x.ProductNo) && EF.Functions.Like(x.ProductNo!, pattern)) ||
                    (!string.IsNullOrEmpty(x.ProductTitle) && EF.Functions.Like(x.ProductTitle!, pattern)));
            }

            // Group and aggregate
            var groupedQuery =
                flat.GroupBy(x => new
                {
                    x.BranchId,
                    x.BranchName,

                    x.ProductId,
                    x.ProductNo,
                    x.ProductTitle,

                    x.ImageUrl,
                    x.UoM,
                    x.BuyingUnitPrice,
                    x.SellingUnitPrice,

                    x.ProductTypeId,
                    x.ProductType
                })
                .Select(g => new StockReportDto
                {
                    BranchId = g.Key.BranchId,
                    BranchName = g.Key.BranchName,

                    ProductId = g.Key.ProductId,
                    ProductName = (g.Key.ProductNo ?? "") + " " + (g.Key.ProductTitle ?? ""),
                    ImageUrl = g.Key.ImageUrl ?? "",

                    ProductTypeId = g.Key.ProductTypeId,
                    ProductType = g.Key.ProductType ?? "",

                    UoM = g.Key.UoM,
                    BuyingUnitPrice = g.Key.BuyingUnitPrice,
                    SellingUnitPrice = g.Key.SellingUnitPrice,

                    OnHand = g.Sum(x => x.SignedQty),
                    LastUpdated = g.Max(x => x.MovementDate)
                });

            if (input.OnlyAvailable)
                groupedQuery = groupedQuery.Where(x => x.OnHand > 0);

            var totalCount = await AsyncExecuter.LongCountAsync(groupedQuery);

            // ABP sorting pattern (no custom sorting parser)
            IQueryable<StockReportDto> ordered =
                string.IsNullOrWhiteSpace(input.Sorting)
                    ? groupedQuery
                        .OrderByDescending(x => x.OnHand)
                        .ThenBy(x => x.ProductName)
                        .ThenBy(x => x.ProductId)
                    : groupedQuery.OrderBy(input.Sorting);

            var take = input.MaxResultCount > 0 ? input.MaxResultCount : 50;

            var items = await AsyncExecuter.ToListAsync(
                ordered.PageBy(input.SkipCount, take)
            );

            return new PagedResultDto<StockReportDto>(totalCount, items);
        }

        [Authorize(POSPermissions.StockMovements.Default)]
        public virtual async Task<PagedResultDto<ProductStockListItemDto>> GetProductStockListAsync(ProductStockListRequestDto input)
        {
            var isAdmin = await IsAdminAsync();
            var effectiveBranchId = isAdmin ? input.BranchId : await RequireUserBranchAsync();

            if (isAdmin && (!effectiveBranchId.HasValue || effectiveBranchId.Value == Guid.Empty))
                throw new BusinessException("BranchRequiredForAdmin");

            // -------------------------
            // 1) Stock aggregation query
            // -------------------------
            var headersQ = (await Repository.GetQueryableAsync())
                .AsNoTracking()
                .Where(h => !h.IsCancelled);

            if (effectiveBranchId.HasValue && effectiveBranchId.Value != Guid.Empty)
                headersQ = headersQ.Where(h => h.BranchId == effectiveBranchId.Value);

            var detailsQ = (await _detailRepo.GetQueryableAsync()).AsNoTracking();

            var stockAgg = await (
                from d in detailsQ
                join h in headersQ on d.StockMovementHeaderId equals h.Id
                group new { h, d } by d.ProductId into g
                select new
                {
                    ProductId = g.Key,
                    OnHand = g.Sum(x =>
                        (x.h.StockMovementType == StockMovementType.Purchase ||
                         x.h.StockMovementType == StockMovementType.AdjustmentPlus)
                            ? (decimal)x.d.Quantity
                            : -(decimal)x.d.Quantity)
                }
            ).ToListAsync();

            var stockMap = stockAgg
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.OnHand));

            // -------------------------
            // 2) Products query (filters)
            // -------------------------
            var productsQ = (await _productRepo.GetQueryableAsync()).AsNoTracking();

            if (!string.IsNullOrWhiteSpace(input.Filter))
            {
                var f = input.Filter.Trim().ToLower();

                productsQ = productsQ.Where(p =>
                    (p.ProductNo != null && p.ProductNo.ToLower().Contains(f)) ||
                    (p.ProductName != null && p.ProductName.ToLower().Contains(f)));
            }

            if (input.ProductId.HasValue && input.ProductId.Value != Guid.Empty)
                productsQ = productsQ.Where(p => p.Id == input.ProductId.Value);

            if (input.ProductTypeId.HasValue && input.ProductTypeId.Value != Guid.Empty)
                productsQ = productsQ.Where(p => p.ProductTypeId == input.ProductTypeId.Value);

            var products = await productsQ
                .Select(p => new
                {
                    p.Id,
                    p.ProductNo,
                    p.ProductName,
                    p.ProductTypeId,
                    ProductType = p.ProductType != null ? (p.ProductType.TypeDesc ?? "") : "",
                    p.ImageUrl,
                    p.UoM,
                    p.BuyingUnitPrice,
                    p.SellingUnitPrice
                })
                .ToListAsync();

            // -------------------------
            // 3) Join + filter + sort + page (in-memory)
            // -------------------------
            var all = products.Select(p =>
            {
                stockMap.TryGetValue(p.Id, out var onHand);

                return new ProductStockListItemDto
                {
                    Id = p.Id,
                    ProductNo = p.ProductNo ?? "",
                    ProductId = p.Id, // if you keep this property in DTO; otherwise remove it from DTO
                    ProductName = p.ProductName ?? "",
                    ProductTypeId = p.ProductTypeId,
                    ProductType = p.ProductType ?? "",
                    UoM = p.UoM,
                    BuyingUnitPrice = p.BuyingUnitPrice,
                    SellingUnitPrice = p.SellingUnitPrice,
                    ImageUrl = p.ImageUrl,
                    OnHand = onHand
                };
            });

            if (input.OnlyAvailable)
                all = all.Where(x => x.OnHand > 0);

            all = all
                .OrderByDescending(x => x.OnHand)
                .ThenBy(x => x.ProductName)
                .ThenBy(x => x.Id);

            var totalCount = all.Count();

            var take = input.MaxResultCount > 0 ? input.MaxResultCount : 50;
            var items = all
                .Skip(input.SkipCount)
                .Take(take)
                .ToList();

            return new PagedResultDto<ProductStockListItemDto>(totalCount, items);
        }

        [Authorize(POSPermissions.StockMovements.Default)]
        public virtual async Task<Dictionary<Guid, decimal>> GetOnHandMapAsync(List<Guid> productIds, Guid? branchId = null)
        {
            var list = await GetOnHandListAsync(productIds, branchId);
            return list.ToDictionary(x => x.ProductId, x => x.OnHand);
        }

        [Authorize(POSPermissions.StockMovements.Default)]
        public virtual async Task<List<OnHandItemDto>> GetOnHandListAsync(List<Guid> productIds, Guid? branchId = null)
        {
            if (productIds == null || productIds.Count == 0)
                return new List<OnHandItemDto>();

            var isAdmin = await IsAdminAsync();
            var effectiveBranchId = isAdmin ? branchId : await RequireUserBranchAsync();

            var baseQuery = (await Repository.GetQueryableAsync())
                .Where(h => !h.IsCancelled);

            if (effectiveBranchId.HasValue && effectiveBranchId.Value != Guid.Empty)
                baseQuery = baseQuery.Where(h => h.BranchId == effectiveBranchId.Value);

            var q = from h in baseQuery
                    from d in h.StockMovementDetails
                    where productIds.Contains(d.ProductId)
                    select new
                    {
                        d.ProductId,
                        SignedQty =
                            (h.StockMovementType == StockMovementType.Purchase ||
                             h.StockMovementType == StockMovementType.AdjustmentPlus)
                                ? d.Quantity
                                : -d.Quantity
                    };

            var grouped = await AsyncExecuter.ToListAsync(
                q.GroupBy(x => x.ProductId)
                 .Select(g => new OnHandItemDto
                 {
                     ProductId = g.Key,
                     OnHand = g.Sum(x => x.SignedQty)
                 })
            );

            // Ensure zeros for any requested product with no movements
            var requested = productIds.ToHashSet();
            foreach (var pid in requested)
                if (!grouped.Any(x => x.ProductId == pid))
                    grouped.Add(new OnHandItemDto { ProductId = pid, OnHand = 0 });

            return grouped;
        }

        #endregion

        #region Dashboard

        private const decimal LowStockThreshold = 1m; // you can tweak this

        private (DateTime Start, DateTime EndExclusive) NormalizeDateRange(DateTime? fromDate, DateTime? toDate)
        {
            // Inclusive date range: [Start 00:00, (ToDate + 1) 00:00)
            var start = (fromDate ?? Clock.Now).Date;
            var endDate = (toDate ?? start).Date;
            var endExclusive = endDate.AddDays(1);

            if (endExclusive <= start)
                endExclusive = start.AddDays(1);

            return (start, endExclusive);
        }

        [Authorize(POSPermissions.StockMovements.Default)]
        public virtual async Task<StockDashboardSummaryDto> GetDashboardSummaryAsync(
            Guid? branchId = null,
            DateTime? fromDate = null,
            DateTime? toDate = null)
        {
            var isAdmin = await IsAdminAsync();
            var effectiveBranchId = isAdmin ? branchId : await RequireUserBranchAsync();

            var today = Clock.Now.Date;
            var (start, endExclusive) = NormalizeDateRange(fromDate ?? today, toDate ?? today);

            var qHeaders = (await Repository.GetQueryableAsync())
                .Where(h => !h.IsCancelled);

            if (effectiveBranchId.HasValue && effectiveBranchId.Value != Guid.Empty)
                qHeaders = qHeaders.Where(h => h.BranchId == effectiveBranchId.Value);

            // ------------------------------------------------------------
            // Period Sales + Profit (based on sold products' BuyingUnitPrice)
            // Selling: SUM(Sale detail AmountInclVat)
            // Buying : SUM(SoldQty * Product.BuyingUnitPrice)
            //
            // IMPORTANT: Replace Product.BuyingUnitPrice with your actual field name.
            // ------------------------------------------------------------
            var salesByProductQuery =
                from h in qHeaders
                where h.StockMovementType == StockMovementType.Sale
                      && h.CreationTime >= start
                      && h.CreationTime < endExclusive
                from d in h.StockMovementDetails
                group d by d.ProductId
                into g
                select new
                {
                    ProductId = g.Key,
                    SoldQty = g.Sum(x => x.Quantity),

                    // selling amounts come directly from stored amounts
                    SalesInclVat = g.Sum(x => x.AmountInclVat ?? 0m),
                    SalesExclVat = g.Sum(x => x.AmountExclVat ?? 0m),

                    // buying unit price from product
                    BuyingUnitPrice = g.Max(x => x.Product.BuyingUnitPrice) // <-- rename if needed
                };

            var salesByProduct = await AsyncExecuter.ToListAsync(salesByProductQuery);

            decimal periodSalesInclVat = 0m;
            decimal periodSalesExclVat = 0m;
            decimal totalBuyingAmount = 0m;

            foreach (var x in salesByProduct)
            {
                periodSalesInclVat += x.SalesInclVat;
                periodSalesExclVat += x.SalesExclVat;

                totalBuyingAmount += x.SoldQty * x.BuyingUnitPrice;
            }

            // Profit based on incl-vat selling amounts (as you requested)
            var periodProfitInclVat = periodSalesInclVat - totalBuyingAmount;

            // Profit excl-vat (if you have AmountExclVat on details; otherwise it will be 0 and we fallback)
            var periodProfitExclVat = periodSalesExclVat > 0m
                ? (periodSalesExclVat - totalBuyingAmount)
                : periodProfitInclVat;

            // Backward-compat (if your UI still reads TodaySales)
            var todaySales = periodSalesInclVat;

            // ------------------------------------------------------------
            // Stock snapshot AS-OF toDate (cumulative up to endExclusive)
            // (kept as your weighted-average amount allocation; no UnitPrice * Qty)
            // ------------------------------------------------------------
            var qHeadersAsOf = qHeaders.Where(h => h.CreationTime < endExclusive);

            var stockAggQuery =
                from h in qHeadersAsOf
                from d in h.StockMovementDetails
                group new { h, d } by d.ProductId
                into g
                select new
                {
                    ProductId = g.Key,

                    OnHand = g.Sum(x =>
                        (x.h.StockMovementType == StockMovementType.Purchase ||
                         x.h.StockMovementType == StockMovementType.AdjustmentPlus)
                            ? x.d.Quantity
                            : -x.d.Quantity),

                    TotalInQty = g.Sum(x =>
                        (x.h.StockMovementType == StockMovementType.Purchase ||
                         x.h.StockMovementType == StockMovementType.AdjustmentPlus)
                            ? x.d.Quantity
                            : 0m),

                    TotalInCostAmount = g.Sum(x =>
                        (x.h.StockMovementType == StockMovementType.Purchase ||
                         x.h.StockMovementType == StockMovementType.AdjustmentPlus)
                            ? (x.d.AmountExclVat ?? x.d.AmountInclVat ?? 0m)
                            : 0m)
                };

            var stockAggList = await AsyncExecuter.ToListAsync(stockAggQuery);

            decimal stockValue = 0m;
            var activeProducts = 0;
            var lowStockItems = 0;

            foreach (var x in stockAggList)
            {
                if (x.OnHand > 0m)
                {
                    activeProducts++;

                    if (x.OnHand <= LowStockThreshold)
                        lowStockItems++;

                    if (x.TotalInQty > 0m)
                    {
                        stockValue += x.TotalInCostAmount * x.OnHand / x.TotalInQty;
                    }
                }
            }

            return new StockDashboardSummaryDto
            {
                FromDate = start,
                ToDate = endExclusive.AddDays(-1),

                PeriodSalesInclVat = decimal.Round(periodSalesInclVat, 0),
                PeriodProfitInclVat = decimal.Round(periodProfitExclVat, 0),

                StockValue = decimal.Round(stockValue, 0),
                ActiveProducts = activeProducts,
                LowStockItems = lowStockItems
            };
        }

        [Authorize(POSPermissions.StockMovements.Default)]
        public virtual async Task<List<DailySalesPointDto>> GetLast7DaysSalesAsync(
            Guid? branchId = null,
            DateTime? fromDate = null,
            DateTime? toDate = null)
        {
            var isAdmin = await IsAdminAsync();
            var effectiveBranchId = isAdmin ? branchId : await RequireUserBranchAsync();

            // Default: last 7 days (including today)
            var today = Clock.Now.Date;
            var defaultFrom = today.AddDays(-6);
            var defaultTo = today;

            var (start, endExclusive) = NormalizeDateRange(fromDate ?? defaultFrom, toDate ?? defaultTo);

            var qHeaders = (await Repository.GetQueryableAsync())
                .Where(h => !h.IsCancelled && h.StockMovementType == StockMovementType.Sale);

            if (effectiveBranchId.HasValue && effectiveBranchId.Value != Guid.Empty)
                qHeaders = qHeaders.Where(h => h.BranchId == effectiveBranchId.Value);

            // Daily sales based on header AmountInclVat (simple + fast + matches your KPI)
            var groupedQuery =
                qHeaders
                    .Where(h => h.CreationTime >= start && h.CreationTime < endExclusive)
                    .GroupBy(h => h.CreationTime.Date)
                    .Select(g => new DailySalesPointDto
                    {
                        Date = g.Key,
                        Amount = g.Sum(x => x.AmountInclVat ?? 0m)
                    });

            var grouped = await AsyncExecuter.ToListAsync(groupedQuery);
            var map = grouped.ToDictionary(x => x.Date.Date, x => x.Amount);

            // Ensure continuity (every date in range exists)
            var days = (endExclusive.Date - start.Date).Days;
            var result = new List<DailySalesPointDto>(days);

            for (var i = 0; i < days; i++)
            {
                var d = start.AddDays(i);
                map.TryGetValue(d, out var amount);

                result.Add(new DailySalesPointDto
                {
                    Date = d,
                    Amount = amount
                });
            }

            return result.OrderBy(x => x.Date).ToList();
        }

        [Authorize(POSPermissions.StockMovements.Default)]
        public virtual async Task<List<StockByProductTypeDto>> GetStockByProductTypeAsync(
            Guid? branchId = null,
            DateTime? fromDate = null,
            DateTime? toDate = null)
        {
            var isAdmin = await IsAdminAsync();
            var effectiveBranchId = isAdmin ? branchId : await RequireUserBranchAsync();

            // Snapshot "as-of toDate" (lower bound accepted but not applied for snapshot semantics)
            var asOfDate = (toDate ?? Clock.Now.Date).Date;
            var endExclusive = asOfDate.AddDays(1);

            var qHeaders = (await Repository.GetQueryableAsync())
                .Where(h => !h.IsCancelled && h.CreationTime < endExclusive);

            if (effectiveBranchId.HasValue && effectiveBranchId.Value != Guid.Empty)
                qHeaders = qHeaders.Where(h => h.BranchId == effectiveBranchId.Value);

            var query =
                from h in qHeaders
                from d in h.StockMovementDetails
                group new { h, d } by new
                {
                    d.Product.ProductTypeId,
                    TypeDesc = d.Product.ProductType.TypeDesc
                }
                into g
                select new StockByProductTypeDto
                {
                    ProductTypeId = g.Key.ProductTypeId,
                    ProductType = g.Key.TypeDesc ?? string.Empty,
                    OnHand = g.Sum(x =>
                        (x.h.StockMovementType == StockMovementType.Purchase ||
                         x.h.StockMovementType == StockMovementType.AdjustmentPlus)
                            ? x.d.Quantity
                            : -x.d.Quantity)
                };

            var list = await AsyncExecuter.ToListAsync(query);

            return list
                .Where(x => x.OnHand > 0)
                .OrderByDescending(x => x.OnHand)
                .ToList();
        }
        #endregion

    }
}
