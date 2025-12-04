using Volo.Abp.Modularity;

namespace POS;

[DependsOn(
    typeof(POSApplicationModule),
    typeof(POSDomainTestModule)
)]
public class POSApplicationTestModule : AbpModule
{

}
