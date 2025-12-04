# ======================
# BUILD STAGE
# ======================
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution
COPY . .

# Install ABP CLI globally
RUN dotnet tool install -g Volo.Abp.Cli
ENV PATH="$PATH:/root/.dotnet/tools"

# Install ABP static libraries
RUN abp install-libs

# (Optional) Bundle ABP resources (only needed if using Razor pages)
RUN abp bundle

# Restore & publish backend
RUN dotnet restore ./src/POS.HttpApi.Host/POS.HttpApi.Host.csproj
RUN dotnet publish ./src/POS.HttpApi.Host/POS.HttpApi.Host.csproj -c Release -o /app/publish

# ======================
# RUNTIME STAGE
# ======================
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish ./

# Render sets PORT automatically
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "POS.HttpApi.Host.dll"]