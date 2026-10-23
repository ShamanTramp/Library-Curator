using System.Reflection;
using System.Runtime.Loader;
using System.Text;
using Jellyfin.Plugin.LibraryCurator.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;

namespace Jellyfin.Plugin.LibraryCurator.Services;

/// <summary>Registers the bundled renderer with JavaScript Injector when it is installed.</summary>
public sealed class JavaScriptInjectorBridge(ILogger<JavaScriptInjectorBridge> logger) : IHostedService
{
    private readonly CancellationTokenSource _stopping = new();
    private Task? _registrationTask;

    /// <summary>Gets whether JavaScript Injector accepted this plugin's script.</summary>
    public bool Registered { get; private set; }

    /// <inheritdoc />
    public Task StartAsync(CancellationToken cancellationToken)
    {
        _registrationTask = RegisterWhenAvailableAsync(_stopping.Token);
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public async Task StopAsync(CancellationToken cancellationToken)
    {
        await _stopping.CancelAsync().ConfigureAwait(false);
        if (_registrationTask is not null)
        {
            try
            {
                await _registrationTask.WaitAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (_stopping.IsCancellationRequested || cancellationToken.IsCancellationRequested)
            {
                // The hosted service is stopping.
            }
        }

        InvokeInjector("UnregisterAllScriptsFromPlugin", Plugin.PluginId.ToString());
        _stopping.Dispose();
    }

    private async Task RegisterWhenAvailableAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            var interfaceType = FindInterfaceType();
            if (interfaceType is not null)
            {
                var payload = new JObject
                {
                    ["id"] = $"{Plugin.PluginId}-library-curator",
                    ["name"] = "Library Curator presentation",
                    ["script"] = ReadClientScript(),
                    ["enabled"] = true,
                    // The script waits for a signed-in account before requesting any settings.
                    // Loading on the login page also supports sign-in without a browser reload.
                    ["requiresAuthentication"] = false,
                    ["pluginId"] = Plugin.PluginId.ToString(),
                    ["pluginName"] = "Library Curator",
                    ["pluginVersion"] = Plugin.Instance?.Version.ToString() ?? "0.1.0.0"
                };
                object? result;
                try
                {
                    result = interfaceType.GetMethod("RegisterScript", BindingFlags.Public | BindingFlags.Static)?.Invoke(null, [payload]);
                }
                catch (Exception exception)
                {
                    logger.LogWarning(exception, "Could not register Library Curator script.");
                    await Task.Delay(TimeSpan.FromSeconds(30), cancellationToken).ConfigureAwait(false);
                    continue;
                }
                if (result is true)
                {
                    Registered = true;
                    logger.LogInformation("Registered Library Curator's client renderer with JavaScript Injector.");
                    return;
                }

                logger.LogWarning("JavaScript Injector was found but did not accept the Library Curator renderer.");
            }

            logger.LogDebug("JavaScript Injector is not available yet; Library Curator will retry registration.");
            await Task.Delay(TimeSpan.FromSeconds(30), cancellationToken).ConfigureAwait(false);
        }
    }

    private static string ReadClientScript()
    {
        const string resourceName = "Jellyfin.Plugin.LibraryCurator.Web.library-curator.js";
        using var stream = typeof(Plugin).Assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException("Library Curator's bundled client script is missing.");
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }

    private void InvokeInjector(string method, string argument)
    {
        try
        {
            FindInterfaceType()?.GetMethod(method, BindingFlags.Public | BindingFlags.Static)?.Invoke(null, [argument]);
        }
        catch (Exception exception)
        {
            logger.LogDebug(exception, "Could not call JavaScript Injector method {Method}.", method);
        }
    }

    private static Type? FindInterfaceType() => AssemblyLoadContext.All
        .SelectMany(context => context.Assemblies)
        .FirstOrDefault(assembly => assembly.GetName().Name?.Contains("JavaScriptInjector", StringComparison.Ordinal) == true)
        ?.GetType("Jellyfin.Plugin.JavaScriptInjector.PluginInterface");
}
