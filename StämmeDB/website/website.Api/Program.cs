using System.Text.Json.Serialization;
using website.Infrastructure;
using website.Infrastructure.Database;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Die Connection-String-Konfiguration 'DefaultConnection' fehlt.");

builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddProblemDetails();
builder.Services.AddInfrastructure(connectionString);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseExceptionHandler();
app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapControllers();

await using (var scope = app.Services.CreateAsyncScope())
{
    var initializer = scope.ServiceProvider
        .GetRequiredService<DatabaseInitializer>();
    await initializer.InitializeAsync();
}

await app.RunAsync();
