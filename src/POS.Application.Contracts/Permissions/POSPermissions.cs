namespace POS.Permissions;

public static class POSPermissions
{
    public const string GroupName = "POS";
    //Add your own permission names. Example:
    //public const string MyPermission1 = GroupName + ".MyPermission1";
    public static class Products
    {
        public const string Default = GroupName + ".Products";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }

    public static class ProductTypes
    {
        public const string Default = GroupName + ".ProductTypes";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }
    public static class Branches
    {
        public const string Default = GroupName + ".Branches";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
    }
    public static class StockMovements
    {
        public const string Default = GroupName + ".StockMovements";
        public const string Create = Default + ".Create";
        public const string Edit = Default + ".Edit";
        public const string Delete = Default + ".Delete";
        public const string AllBranches = Default + ".AllBranches";
        public const string PhysicalInventory = Default + ".PhysicalInventory";
    }
    public static class Dashboard 
    {
        public const string Default = GroupName + ".Dashboard";
    }
}
