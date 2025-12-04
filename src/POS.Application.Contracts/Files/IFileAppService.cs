using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Volo.Abp.Content;

namespace POS.Files
{
    public interface IFileAppService
    {
        Task<string> UploadForProductAsync(Guid productId, IRemoteStreamContent file);
        Task<string> UploadTempAsync(IRemoteStreamContent file);
        Task<bool> DeleteProductImageAsync(Guid productId);
    }
}
