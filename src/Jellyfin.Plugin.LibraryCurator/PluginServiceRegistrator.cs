using Jellyfin.Plugin.LibraryCurator.Services;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.LibraryCurator;

/// <summary>Registers the client script bridge.</summary>
public sealed class PluginServiceRegistrator : IPluginServiceRegistrator
{
    /// <inheritdoc />
    public void RegisterServices(IServiceCollection services, IServerApplicationHost applicationHost)
    {
        services.AddSingleton<JavaScriptInjectorBridge>();
        services.AddHostedService(provider => provider.GetRequiredService<JavaScriptInjectorBridge>());
    }
}
