using POS.Localization;
using Volo.Abp.Application.Services;

namespace POS;

/* Inherit your application services from this class.
 */
public abstract class POSAppService : ApplicationService
{
    protected POSAppService()
    {
        LocalizationResource = typeof(POSResource);
    }
}
