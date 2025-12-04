using System.Threading.Tasks;

namespace POS.Data;

public interface IPOSDbSchemaMigrator
{
    Task MigrateAsync();
}
