using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;           // 👈 IHostEnvironment
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Application.Services;
using Volo.Abp.Content;

namespace POS.Files
{
    public class FileAppService : ApplicationService, IFileAppService
    {
        private readonly IHostEnvironment _env;                // 👈 change type
        private readonly IConfiguration _config;
        private readonly ILogger<FileAppService> _logger;

        public FileAppService(
            IHostEnvironment env,                              // 👈 inject
            IConfiguration config,
            ILogger<FileAppService> logger)
        {
            _env = env;
            _config = config;
            _logger = logger;
        }

        private string ProductFolderSetting()
        => _config["Upload:ProductImagesFolder"] ?? "uploads/products";

        private long MaxSizeBytes()
            => long.TryParse(_config["Upload:MaxImageSizeBytes"], out var v) ? v : 2_097_152; // 2MB

        private static readonly string[] AllowedContentTypes = { "image/jpeg", "image/png", "image/webp" };
        private static readonly string[] AllowedExts = { ".jpg", ".jpeg", ".png", ".webp" };

        private string PhysicalRoot() => Path.Combine(_env.ContentRootPath, "wwwroot"); // absolute path to wwwroot

        private static string SafeExt(string? fileName)
            => string.IsNullOrWhiteSpace(fileName) ? ".bin" : Path.GetExtension(fileName).ToLowerInvariant();

        private static string ToUrl(string folderRel, string fileName)
            => "/" + Path.Combine(folderRel, fileName).Replace("\\", "/");

        private void ValidateFile(IRemoteStreamContent file)
        {
            if (file.ContentLength.HasValue && file.ContentLength.Value > MaxSizeBytes())
                throw new BusinessException("Upload:TooLarge").WithData("MaxBytes", MaxSizeBytes());

            if (!file.ContentType.IsNullOrWhiteSpace() &&
                !AllowedContentTypes.Contains(file.ContentType!, StringComparer.OrdinalIgnoreCase))
                throw new BusinessException("Upload:BadContentType")
                    .WithData("Allowed", string.Join(",", AllowedContentTypes));

            var ext = SafeExt(file.FileName);
            if (!AllowedExts.Contains(ext, StringComparer.OrdinalIgnoreCase))
                throw new BusinessException("Upload:BadExtension")
                    .WithData("Allowed", string.Join(",", AllowedExts));
        }

        // ---- Upload for a specific product (1 image per product; filename = {productId}{ext}) ----
        public async Task<string> UploadForProductAsync(Guid productId, IRemoteStreamContent file)
        {
            Check.NotNull(file, nameof(file));
            ValidateFile(file);

            var folderRel = ProductFolderSetting().TrimStart('/');  // e.g., "uploads/products"
            var dir = Path.Combine(PhysicalRoot(), folderRel);
            Directory.CreateDirectory(dir);

            var ext = SafeExt(file.FileName);
            var fileName = $"{productId:D}{ext}".ToLowerInvariant();
            var path = Path.Combine(dir, fileName);

            await using (var src = file.GetStream())
            await using (var dst = File.Create(path))
                await src.CopyToAsync(dst);

            _logger.LogInformation("Saved product image at {Path}", path);
            return ToUrl(folderRel, fileName);
        }

        // ---- Temp upload (random filename) for create-before-save scenario ----
        public async Task<string> UploadTempAsync(IRemoteStreamContent file)
        {
            Check.NotNull(file, nameof(file));
            ValidateFile(file);

            var folderRel = ProductFolderSetting().TrimStart('/');
            var dir = Path.Combine(PhysicalRoot(), folderRel);
            Directory.CreateDirectory(dir);

            var ext = SafeExt(file.FileName);
            var fileName = $"{Guid.NewGuid():N}{ext}".ToLowerInvariant();
            var path = Path.Combine(dir, fileName);

            await using (var src = file.GetStream())
            await using (var dst = File.Create(path))
                await src.CopyToAsync(dst);

            _logger.LogInformation("Saved temp image at {Path}", path);
            return ToUrl(folderRel, fileName);
        }

        // ---- Delete product image(s) by productId (any extension) ----
        public Task<bool> DeleteProductImageAsync(Guid productId)
        {
            var folderRel = ProductFolderSetting().TrimStart('/');
            var dir = Path.Combine(PhysicalRoot(), folderRel);

            if (!Directory.Exists(dir))
                return Task.FromResult(false);

            var pattern = productId.ToString("D") + ".*";
            var files = Directory.GetFiles(dir, pattern, SearchOption.TopDirectoryOnly);

            if (files.Length == 0)
                return Task.FromResult(false);

            foreach (var f in files)
            {
                try
                {
                    File.Delete(f);
                    _logger.LogInformation("Deleted product image {Path}", f);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed deleting product image {Path}", f);
                }
            }

            return Task.FromResult(true);
        }
    }
}
