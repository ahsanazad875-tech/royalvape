using POS.Localization;
using Volo.Abp.AspNetCore.Mvc;

namespace POS.Controllers;

/* Inherit your controllers from this class.
 */
public abstract class POSController : AbpControllerBase
{
    protected POSController()
    {
        LocalizationResource = typeof(POSResource);
    }
}
