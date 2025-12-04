using POS.Samples;
using Xunit;

namespace POS.EntityFrameworkCore.Applications;

[Collection(POSTestConsts.CollectionDefinitionName)]
public class EfCoreSampleAppServiceTests : SampleAppServiceTests<POSEntityFrameworkCoreTestModule>
{

}
