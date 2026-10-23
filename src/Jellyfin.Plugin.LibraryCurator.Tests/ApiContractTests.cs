using System.Reflection;
using Jellyfin.Plugin.LibraryCurator.Api;
using MediaBrowser.Common.Api;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace Jellyfin.Plugin.LibraryCurator.Tests;

public sealed class ApiContractTests
{
    [Fact]
    public void SettingsRequireAuthenticationAndDoNotAcceptAnotherUserId()
    {
        var controller = typeof(LibraryCuratorController);
        Assert.NotNull(controller.GetCustomAttribute<AuthorizeAttribute>());
        Assert.Empty(controller.GetMethod(nameof(LibraryCuratorController.GetDisplayOptions))!.GetParameters());
        Assert.Null(controller.GetCustomAttribute<AllowAnonymousAttribute>());
    }

    [Theory]
    [InlineData(nameof(LibraryCuratorController.GetCollections))]
    [InlineData(nameof(LibraryCuratorController.GetStatus))]
    public void AdministrationRequiresElevation(string method)
        => Assert.Equal(Policies.RequiresElevation, typeof(LibraryCuratorController).GetMethod(method)!.GetCustomAttribute<AuthorizeAttribute>()?.Policy);

    [Theory]
    [InlineData(-1, 100)]
    [InlineData(0, 0)]
    [InlineData(0, 201)]
    public void InvalidPaginationIsRejectedBeforeQueryingLibrary(int start, int limit)
    {
        var controller = new LibraryCuratorController(null!, null!, null!, null!);
        Assert.IsType<BadRequestObjectResult>(controller.GetCollections(start, limit));
    }

    [Fact]
    public void EmbeddedAssetsAndPluginIdentifierArePresent()
    {
        var resources = typeof(Plugin).Assembly.GetManifestResourceNames();
        Assert.Contains("Jellyfin.Plugin.LibraryCurator.Configuration.configPage.html", resources);
        Assert.Contains("Jellyfin.Plugin.LibraryCurator.Web.library-curator.js", resources);
        Assert.NotEqual(Guid.Empty, Plugin.PluginId);
    }
}
