namespace POS.StockMovements
{
    public enum StockMovementType
    {
        Purchase = 1,   // increases stock
        Sale = 2,       // decreases stock
        AdjustmentPlus = 5,
        AdjustmentMinus = 6
    }
}
