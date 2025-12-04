using Volo.Abp.Modularity;

namespace POS;

public abstract class POSApplicationTestBase<TStartupModule> : POSTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{

}
