using Microsoft.EntityFrameworkCore;
using POS.Branches;
using POS.Products;
using POS.ProductTypes;
using POS.StockMovement;
using System;
using Volo.Abp.AuditLogging.EntityFrameworkCore;
using Volo.Abp.BackgroundJobs.EntityFrameworkCore;
using Volo.Abp.BlobStoring.Database.EntityFrameworkCore;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore.Modeling;
using Volo.Abp.FeatureManagement.EntityFrameworkCore;
using Volo.Abp.Identity;
using Volo.Abp.Identity.EntityFrameworkCore;
using Volo.Abp.OpenIddict.EntityFrameworkCore;
using Volo.Abp.PermissionManagement.EntityFrameworkCore;
using Volo.Abp.SettingManagement.EntityFrameworkCore;
using Volo.Abp.TenantManagement;
using Volo.Abp.TenantManagement.EntityFrameworkCore;

namespace POS.EntityFrameworkCore;

[ReplaceDbContext(typeof(IIdentityDbContext))]
[ReplaceDbContext(typeof(ITenantManagementDbContext))]
[ConnectionStringName("Default")]
public class POSDbContext :
    AbpDbContext<POSDbContext>,
    ITenantManagementDbContext,
    IIdentityDbContext
{
    /* Add DbSet properties for your Aggregate Roots / Entities here. */
    public DbSet<Product> Products { get; set; }
    public DbSet<ProductType> ProductTypes { get; set; }
    public DbSet<Branch> Branches { get; set; }
    public DbSet<StockMovementHeader> StockMovementHeaders { get; set; }
    public DbSet<StockMovementDetail> StockMovementDetails { get; set; }

    #region Entities from the modules

    /* Notice: We only implemented IIdentityProDbContext and ISaasDbContext
     * and replaced them for this DbContext. This allows you to perform JOIN
     * queries for the entities of these modules over the repositories easily. You
     * typically don't need that for other modules. But, if you need, you can
     * implement the DbContext interface of the needed module and use ReplaceDbContext
     * attribute just like IIdentityProDbContext and ISaasDbContext.
     *
     * More info: Replacing a DbContext of a module ensures that the related module
     * uses this DbContext on runtime. Otherwise, it will use its own DbContext class.
     */

    // Identity
    public DbSet<IdentityUser> Users { get; set; }
    public DbSet<IdentityRole> Roles { get; set; }
    public DbSet<IdentityClaimType> ClaimTypes { get; set; }
    public DbSet<OrganizationUnit> OrganizationUnits { get; set; }
    public DbSet<IdentitySecurityLog> SecurityLogs { get; set; }
    public DbSet<IdentityLinkUser> LinkUsers { get; set; }
    public DbSet<IdentityUserDelegation> UserDelegations { get; set; }
    public DbSet<IdentitySession> Sessions { get; set; }

    // Tenant Management
    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<TenantConnectionString> TenantConnectionStrings { get; set; }

    #endregion

    public POSDbContext(DbContextOptions<POSDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        /* Include modules to your migration db context */

        builder.ConfigurePermissionManagement();
        builder.ConfigureSettingManagement();
        builder.ConfigureBackgroundJobs();
        builder.ConfigureAuditLogging();
        builder.ConfigureFeatureManagement();
        builder.ConfigureIdentity();
        builder.ConfigureOpenIddict();
        builder.ConfigureTenantManagement();
        builder.ConfigureBlobStoring();
        /* Configure your own tables/entities inside here */

        // ProductType
        builder.Entity<ProductType>(b =>
        {
            b.ToTable(POSConsts.DbTablePrefix + "ProductTypes", POSConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Type).IsRequired().HasMaxLength(64);
            b.Property(x => x.TypeDesc).HasMaxLength(200);
            b.HasIndex(x => x.Type).IsUnique(); // if you want uniqueness
        });

        // Product
        builder.Entity<Product>(b =>
        {
            b.ToTable(POSConsts.DbTablePrefix + "Products", POSConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.ProductNo).HasMaxLength(100);
            b.Property(x => x.ProductName).HasMaxLength(150);
            b.Property(x => x.ProductDesc).HasMaxLength(300);
            b.Property(x => x.ImageUrl).HasMaxLength(512);
            b.Property(x => x.BuyingUnitPrice).HasPrecision(18, 6);
            b.Property(x => x.SellingUnitPrice).HasPrecision(18, 6);
            b.HasIndex(x => x.ProductNo).IsUnique();
            b.HasOne(x => x.ProductType)
             .WithMany(x => x.Products)
             .HasForeignKey(x => x.ProductTypeId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Branch>(b =>
        {
            b.ToTable(POSConsts.DbTablePrefix + "Branches", POSConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Code).IsRequired().HasMaxLength(32);
            b.Property(x => x.Name).IsRequired().HasMaxLength(128);
            b.Property(x => x.VatPerc).HasPrecision(5, 2).HasDefaultValue(0);
            b.HasIndex(x => x.Code).IsUnique();
        });

        // StockMovementHeader
        builder.Entity<StockMovementHeader>(b =>
        {
            b.ToTable(POSConsts.DbTablePrefix + "StockMovementHeaders", POSConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.StockMovementNo).HasMaxLength(100);
            b.Property(x => x.StockMovementType).IsRequired();
            b.Property(x => x.BusinessPartnerName).HasMaxLength(150);
            b.Property(x => x.Description).HasMaxLength(300);
            b.Property(x => x.AmountExclVat).HasPrecision(18, 6);
            b.Property(x => x.AmountVat).HasPrecision(18, 6);
            b.Property(x => x.AmountInclVat).HasPrecision(18, 6);
            b.HasIndex(x => x.StockMovementNo).IsUnique();
            b.HasOne(x => x.Branch)
                .WithMany()
                .HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.Restrict);
            b.HasIndex(x => x.BranchId);
        });

        // StockMovementDetail
        builder.Entity<StockMovementDetail>(b =>
        {
            b.ToTable(POSConsts.DbTablePrefix + "StockMovementDetails", POSConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Quantity).IsRequired().HasColumnType("decimal(18,6)");
            b.Property(x => x.UnitPrice).HasPrecision(18, 6);
            b.Property(x => x.DiscountAmount).HasPrecision(18, 6);
            b.Property(x => x.AmountExclVat).HasPrecision(18, 6);
            b.Property(x => x.AmountVat).HasPrecision(18, 6);
            b.Property(x => x.AmountInclVat).HasPrecision(18, 6);
            b.Property(x => x.UoM).HasMaxLength(32);

            b.HasOne(x => x.StockMovementHeader)
             .WithMany(x => x.StockMovementDetails)
             .HasForeignKey(x => x.StockMovementHeaderId)
             .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Product)
             .WithMany(x => x.StockMovementDetails)
             .HasForeignKey(x => x.ProductId)
             .OnDelete(DeleteBehavior.Restrict);

        });
    }
}
