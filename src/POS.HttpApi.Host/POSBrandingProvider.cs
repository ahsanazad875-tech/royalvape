using Microsoft.Extensions.Localization;
using POS.Localization;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Ui.Branding;

namespace POS;

[Dependency(ReplaceServices = true)]
public class POSBrandingProvider : DefaultBrandingProvider
{
    private IStringLocalizer<POSResource> _localizer;

    public POSBrandingProvider(IStringLocalizer<POSResource> localizer)
    {
        _localizer = localizer;
    }

    public override string AppName => _localizer["AppName"];
}
