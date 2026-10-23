using Jellyfin.Plugin.LibraryCurator.Configuration;
using Jellyfin.Plugin.LibraryCurator.Core;
using Xunit;

namespace Jellyfin.Plugin.LibraryCurator.Tests;

public sealed class CuratorPolicyTests
{
    [Fact]
    public void DefaultsMakeNoPresentationChanges()
    {
        var config = new PluginConfiguration();
        Assert.True(config.Enabled);
        Assert.True(config.HideCollections);
        Assert.True(config.ExemptAdministrators);
        Assert.Empty(config.HiddenCollectionIds);
        Assert.Empty(config.PlaylistLibraryName);
    }

    [Fact]
    public void NormalizesDuplicateMalformedAndEmptyIdentifiers()
    {
        var id = Guid.NewGuid();
        Assert.Equal([id], CuratorPolicy.NormalizeIds([id.ToString(), id.ToString("N").ToUpperInvariant(), "bad", "", Guid.Empty.ToString()]));
        Assert.Empty(CuratorPolicy.NormalizeIds(null));
    }

    [Theory]
    [InlineData(true, true, true, false, true)]
    [InlineData(true, true, true, true, false)]
    [InlineData(true, true, false, true, true)]
    [InlineData(false, true, false, false, false)]
    [InlineData(true, false, false, false, false)]
    public void ExclusionsRespectFeatureFlagsAndAdminException(bool enabled, bool hide, bool exempt, bool admin, bool expected)
    {
        var id = Guid.NewGuid();
        var actual = CuratorPolicy.EffectiveExclusions(enabled, hide, exempt, admin, [id.ToString()]);
        Assert.Equal(expected ? [id] : [], actual);
    }

    [Fact]
    public void MissingCollectionsKeepTheirSavedIdentity()
    {
        var missingId = Guid.NewGuid();
        Assert.Equal([missingId], CuratorPolicy.NormalizeIds([missingId.ToString()]));
    }

    [Theory]
    [InlineData(true, "  Mes sélections  ", "Mes sélections")]
    [InlineData(true, "  ", "")]
    [InlineData(false, "Custom", "")]
    [InlineData(true, null, "")]
    public void NamesAreTrimmedAndDisabledNamesAreEmpty(bool enabled, string? value, string expected)
        => Assert.Equal(expected, CuratorPolicy.PlaylistName(enabled, value));
}
