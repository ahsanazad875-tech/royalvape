using POS.Branches;
using System;
using System.Globalization;
using System.Linq;
using System.Security.Claims;
using System.Security.Principal;
using System.Threading.Tasks;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Identity;
using Volo.Abp.Security.Claims;

namespace POS.Security
{
    public class BranchClaimsPrincipalContributor :
        IAbpClaimsPrincipalContributor, ITransientDependency
    {
        private readonly IIdentityUserRepository _userRepository;
        private readonly IRepository<Branch, Guid> _branchRepository;

        public BranchClaimsPrincipalContributor(IIdentityUserRepository userRepository, IRepository<Branch, Guid> branchRepository)
        {
            _userRepository = userRepository;
            _branchRepository = branchRepository;
        }

        public async Task ContributeAsync(AbpClaimsPrincipalContributorContext context)
        {
            var principal = context.ClaimsPrincipal;
            if (principal is null)
                return;

            var userId = principal.FindUserId(); // Guid?
            if (userId == null)
                return;

            var user = await _userRepository.FindAsync(userId.Value);
            if (user == null)
                return;

            var branchId = user.GetProperty<Guid?>("BranchId");
            if (!branchId.HasValue)
                return;

            var identity = principal.Identities.FirstOrDefault();
            if (identity == null)
                return;

            if (!identity.HasClaim(c => c.Type == "branch_id"))
            {
                identity.AddClaim(new Claim("branch_id", branchId.Value.ToString()));
            }

            // load branch and add vat_perc
            var branch = await _branchRepository.FindAsync(branchId.Value);
            if (branch == null)
                return;

            var vatPerc = branch.VatPerc/100; // decimal on Branch

            if (!identity.HasClaim(c => c.Type == "vat_perc"))
            {
                identity.AddClaim(
                    new Claim("vat_perc",
                        vatPerc.ToString(CultureInfo.InvariantCulture))
                );
            }
        }
    }
}
