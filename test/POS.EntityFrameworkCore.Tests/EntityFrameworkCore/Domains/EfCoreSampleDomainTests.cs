using POS.Samples;
using Xunit;

namespace POS.EntityFrameworkCore.Domains;

[Collection(POSTestConsts.CollectionDefinitionName)]
public class EfCoreSampleDomainTests : SampleDomainTests<POSEntityFrameworkCoreTestModule>
{

}
