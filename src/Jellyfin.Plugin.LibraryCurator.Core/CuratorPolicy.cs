namespace Jellyfin.Plugin.LibraryCurator.Core;

/// <summary>Presentation rules independent of Jellyfin services.</summary>
public static class CuratorPolicy
{
    /// <summary>Normalizes saved Jellyfin identifiers, ignoring invalid and empty values.</summary>
    public static Guid[] NormalizeIds(IEnumerable<string>? values) => (values ?? [])
        .Select(value => Guid.TryParse(value, out var id) ? id : Guid.Empty)
        .Where(id => id != Guid.Empty).Distinct().ToArray();

    /// <summary>Computes exclusions for the authenticated account.</summary>
    public static Guid[] EffectiveExclusions(bool enabled, bool hideCollections, bool exemptAdmins, bool isAdmin, IEnumerable<string>? ids)
        => enabled && hideCollections && !(exemptAdmins && isAdmin) ? NormalizeIds(ids) : [];

    /// <summary>Empty names preserve Jellyfin's original label.</summary>
    public static string PlaylistName(bool enabled, string? name) => enabled ? (name ?? string.Empty).Trim() : string.Empty;
}
