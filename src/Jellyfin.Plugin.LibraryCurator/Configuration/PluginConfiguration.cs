using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.LibraryCurator.Configuration;

/// <summary>Global presentation settings, persisted by Jellyfin.</summary>
public sealed class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>Gets or sets whether presentation customizations are enabled.</summary>
    public bool Enabled { get; set; } = true;
    /// <summary>Gets or sets whether selected collections are hidden.</summary>
    public bool HideCollections { get; set; } = true;
    /// <summary>Gets or sets saved collection identifiers, including missing collections.</summary>
    public string[] HiddenCollectionIds { get; set; } = [];
    /// <summary>Gets or sets whether administrators can see every collection.</summary>
    public bool ExemptAdministrators { get; set; } = true;
    /// <summary>Gets or sets the custom playlists library label.</summary>
    public string PlaylistLibraryName { get; set; } = string.Empty;
}
