using Volo.Abp.Modularity;

namespace POS;

[DependsOn(
    typeof(POSDomainModule),
    typeof(POSTestBaseModule)
)]
public class POSDomainTestModule : AbpModule
{

}
