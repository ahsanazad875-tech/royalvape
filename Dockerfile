# ======================
# BUILD STAGE
# ======================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY . .

# Install ABP CLI (requires .NET 8 SDK)
RUN dotnet tool install -g Volo.Abp.Cli
ENV PATH="$PATH:/root/.dotnet/tools"

RUN abp install-libs
RUN abp bundle


# Publish targeting .NET 9 or .NET 10
RUN dotnet publish ./src/POS.HttpApi.Host/POS.HttpApi.Host.csproj -c Release -o /app/publish


# ======================
# RUNTIME STAGE
# ======================
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish ./

ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "POS.HttpApi.Host.dll"]