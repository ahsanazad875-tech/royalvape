using POS.Localization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.Localization;
using Volo.Abp.MultiTenancy;

namespace POS.Permissions;

public class POSPermissionDefinitionProvider : PermissionDefinitionProvider
{
    public override void Define(IPermissionDefinitionContext context)
    {
        var myGroup = context.AddGroup(POSPermissions.GroupName);

        //Define your own permissions here. Example:
        //myGroup.AddPermission(POSPermissions.MyPermission1, L("Permission:MyPermission1"));
        var prod = myGroup.AddPermission(POSPermissions.Products.Default, L("Permission:Products"));
        prod.AddChild(POSPermissions.Products.Create, L("Permission:Create"));
        prod.AddChild(POSPermissions.Products.Edit, L("Permission:Edit"));
        prod.AddChild(POSPermissions.Products.Delete, L("Permission:Delete"));

        var ptype = myGroup.AddPermission(POSPermissions.ProductTypes.Default, L("Permission:ProductTypes"));
        ptype.AddChild(POSPermissions.ProductTypes.Create, L("Permission:Create"));
        ptype.AddChild(POSPermissions.ProductTypes.Edit, L("Permission:Edit"));
        ptype.AddChild(POSPermissions.ProductTypes.Delete, L("Permission:Delete"));

        var branch = myGroup.AddPermission(POSPermissions.Branches.Default, L("Permission:Branches"));
        branch.AddChild(POSPermissions.Branches.Create, L("Permission:Create"));
        branch.AddChild(POSPermissions.Branches.Edit, L("Permission:Edit"));
        branch.AddChild(POSPermissions.Branches.Delete, L("Permission:Delete"));

        var sm = myGroup.AddPermission(POSPermissions.StockMovements.Default, L("Permission:StockMovements"));
        sm.AddChild(POSPermissions.StockMovements.Create, L("Permission:Create"));
        sm.AddChild(POSPermissions.StockMovements.Edit, L("Permission:Edit"));
        sm.AddChild(POSPermissions.StockMovements.Delete, L("Permission:Delete"));
        sm.AddChild(POSPermissions.StockMovements.AllBranches, L("Permission:StockMovements.AllBranches"));

        var dashboard = myGroup.AddPermission(POSPermissions.Dashboard.Default, L("Permission:Dashboard"));
    }

    private static LocalizableString L(string name)
    {
        return LocalizableString.Create<POSResource>(name);
    }
}
