# ======================
# BUILD STAGE
# ======================
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy everything including pre-installed libs
COPY . .

# Restore and publish
RUN dotnet restore
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