using System.Threading.Tasks;
using Volo.Abp.DependencyInjection;

namespace POS.Data;

/* This is used if database provider does't define
 * IPOSDbSchemaMigrator implementation.
 */
public class NullPOSDbSchemaMigrator : IPOSDbSchemaMigrator, ITransientDependency
{
    public Task MigrateAsync()
    {
        return Task.CompletedTask;
    }
}
