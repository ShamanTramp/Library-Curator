using System.Security.Claims;
using Jellyfin.Data.Enums;
using Jellyfin.Database.Implementations.Enums;
using MediaBrowser.Model.Entities;
using Jellyfin.Plugin.LibraryCurator.Configuration;
using Jellyfin.Plugin.LibraryCurator.Core;
using Jellyfin.Plugin.LibraryCurator.Services;
using MediaBrowser.Common.Api;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Library;
using MediaBrowser.Model.Library;
using MediaBrowser.Model.Querying;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.LibraryCurator.Api;

/// <summary>Authenticated presentation settings and administrator collection selection.</summary>
[ApiController]
[Route("LibraryCurator")]
[Authorize]
public sealed class LibraryCuratorController(IUserManager users, IUserViewManager views, ILibraryManager library, JavaScriptInjectorBridge bridge) : ControllerBase
{
    /// <summary>Gets effective settings for the authenticated user, never a caller-supplied account.</summary>
    [HttpGet("DisplayOptions")]
    public IActionResult GetDisplayOptions()
    {
        if (!TryGetUserId(out var id) || users.GetUserById(id) is not { } user) return Unauthorized();
        var config = Plugin.Instance?.Configuration ?? new PluginConfiguration();
        var folders = views.GetUserViews(new UserViewQuery { User = user });
        var libraries = folders.Select(folder => new
        {
            Id = folder.Id.ToString("N"),
            folder.Name,
            CollectionType = folder is UserView view ? view.CollectionType?.ToString() : folder is ICollectionFolder collection ? collection.CollectionType?.ToString() : null
        }).ToArray();
        return Ok(new
        {
            UserId = id.ToString("N"),
            HiddenCollectionIds = CuratorPolicy.EffectiveExclusions(config.Enabled, config.HideCollections,
                config.ExemptAdministrators, users.GetUserDto(user, string.Empty).Policy?.IsAdministrator == true, config.HiddenCollectionIds)
                .Select(value => value.ToString("N")).ToArray(),
            PlaylistLibraryName = CuratorPolicy.PlaylistName(config.Enabled, config.PlaylistLibraryName),
            Views = libraries
        });
    }

    /// <summary>Lists collections for administrators, independently of presentation exclusions.</summary>
    [HttpGet("Admin/Collections")]
    [Authorize(Policy = Policies.RequiresElevation)]
    public IActionResult GetCollections([FromQuery] int startIndex = 0, [FromQuery] int limit = 100, [FromQuery] string? searchTerm = null)
    {
        if (startIndex < 0 || limit is < 1 or > 200) return BadRequest("Invalid pagination.");
        if (!TryGetUserId(out var id) || users.GetUserById(id) is not { } user) return Unauthorized();
        var result = library.GetItemsResult(new InternalItemsQuery(user)
        {
            IncludeItemTypes = [BaseItemKind.BoxSet], StartIndex = startIndex, Limit = limit,
            SearchTerm = searchTerm, EnableTotalRecordCount = true,
            OrderBy = [(ItemSortBy.SortName, SortOrder.Ascending)]
        });
        return Ok(new
        {
            Items = result.Items.Select(item => new { Id = item.Id.ToString("N"), item.Name }).ToArray(),
            result.TotalRecordCount, StartIndex = startIndex
        });
    }

    /// <summary>Reports whether the injected script was successfully registered.</summary>
    [HttpGet("Admin/Status")]
    [Authorize(Policy = Policies.RequiresElevation)]
    public IActionResult GetStatus() => Ok(new { InjectorRegistered = bridge.Registered });

    private bool TryGetUserId(out Guid id) => Guid.TryParse(
        User.FindFirst("Jellyfin-UserId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out id);
}
