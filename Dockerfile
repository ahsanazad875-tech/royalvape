# ======================
# BUILD STAGE
# ======================
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy all files
COPY . .

# Restore tools (needed for ABP CLI)
RUN dotnet tool restore

# Install ABP static libraries
RUN abp install-libs

# Bundle ABP styles/scripts (generates wwwroot/libs)
RUN abp bundle

# Restore & publish the HttpApi.Host project
RUN dotnet restore ./src/POS.HttpApi.Host/POS.HttpApi.Host.csproj
RUN dotnet publish ./src/POS.HttpApi.Host/POS.HttpApi.Host.csproj -c Release -o /app/publish

# ======================
# RUNTIME STAGE
# ======================
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish ./

# Render sets PORT env var, bind Kestrel to that
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "POS.HttpApi.Host.dll"]