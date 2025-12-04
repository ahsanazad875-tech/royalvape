using Microsoft.Extensions.DependencyInjection;
using System.Globalization;
using System.Security.Claims;
using System.Threading.Tasks;
using Volo.Abp.AspNetCore.Mvc.ApplicationConfigurations;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Security.Claims;

namespace POS;

public class PosApplicationConfigurationContributor :
    IApplicationConfigurationContributor, ITransientDependency
{
    public Task ContributeAsync(ApplicationConfigurationContributorContext context)
    {
        // get principal accessor from DI via the context
        var principalAccessor = context.ServiceProvider.GetRequiredService<ICurrentPrincipalAccessor>();
        var principal = principalAccessor.Principal as ClaimsPrincipal;
        if (principal == null)
        {
            return Task.CompletedTask;
        }

        // this claim is already set in BranchClaimsPrincipalContributor
        var vatClaim = principal.FindFirst("vat_perc")?.Value;
        if (string.IsNullOrWhiteSpace(vatClaim))
        {
            return Task.CompletedTask;
        }

        var vat = decimal.Parse(vatClaim, CultureInfo.InvariantCulture);

        // expose it under a custom "pos" section
        context.ApplicationConfiguration.SetProperty("pos", new
        {
            VatPerc = vat
        });

        return Task.CompletedTask;
    }
}
