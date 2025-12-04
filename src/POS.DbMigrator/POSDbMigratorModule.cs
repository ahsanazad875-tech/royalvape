using POS.EntityFrameworkCore;
using Volo.Abp.Autofac;
using Volo.Abp.Modularity;

namespace POS.DbMigrator;

[DependsOn(
    typeof(AbpAutofacModule),
    typeof(POSEntityFrameworkCoreModule),
    typeof(POSApplicationContractsModule)
)]
public class POSDbMigratorModule : AbpModule
{
}
