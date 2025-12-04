using Volo.Abp.Modularity;

namespace POS;

/* Inherit from this class for your domain layer tests. */
public abstract class POSDomainTestBase<TStartupModule> : POSTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{

}
