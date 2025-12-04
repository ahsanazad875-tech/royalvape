# ======================
# BUILD STAGE
# ======================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy everything
COPY . .

# Install ABP CLI with a specific working version
RUN dotnet tool install -g Volo.Abp.Cli --version 8.3.3
ENV PATH="$PATH:/root/.dotnet/tools"

# Restore solution BEFORE ABP commands
RUN dotnet restore

# Install ABP static libs (wwwroot/libs)
RUN abp install-libs

# Bundle ABP (scripts, styles, minification)
RUN abp bundle

# Publish targeting NET 9/10 (your project decides)
RUN dotnet publish ./src/POS.HttpApi.Host/POS.HttpApi.Host.csproj -c Release -o /app/publish


# ======================
# RUNTIME STAGE
# ======================
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish ./

# Render requires binding PORT environment variable
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "POS.HttpApi.Host.dll"]