using Volo.Abp.Settings;

namespace POS.Settings;

public class POSSettingDefinitionProvider : SettingDefinitionProvider
{
    public override void Define(ISettingDefinitionContext context)
    {
        //Define your own settings here. Example:
        //context.Add(new SettingDefinition(POSSettings.MySetting1));
    }
}
