using Xunit;

namespace POS.EntityFrameworkCore;

[CollectionDefinition(POSTestConsts.CollectionDefinitionName)]
public class POSEntityFrameworkCoreCollection : ICollectionFixture<POSEntityFrameworkCoreFixture>
{

}
