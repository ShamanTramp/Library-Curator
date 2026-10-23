# Library Curator

![Library Curator](assets/library-curator-cover.png)

**Library Curator** customizes the Collections and Playlists libraries in Jellyfin Web. Select collections to hide from the Collections library and choose a custom name for the Playlists library on the home screen, in navigation, and in the library title.

## Installation

Requires **Jellyfin 10.11.11**, **.NET 9** and [JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector) (tested with **3.1.0.0**). Install JavaScript Injector first.

In **Dashboard → Plugins → Repositories**, add:

```text
https://raw.githubusercontent.com/ShamanTramp/Library-Curator/main/manifest.json
```

Install **Library Curator** from the catalog, restart Jellyfin, then fully reload Jellyfin Web. The plugin automatically registers its bundled script with JavaScript Injector. No manual script entry or edits to Jellyfin files are required.

## Configuration

Open **Dashboard → Plugins → Library Curator**. The page supports French and English, following your Jellyfin interface language.

| Setting | Default | Effect |
| --- | --- | --- |
| Enable Library Curator | On | Enables both presentation customizations. |
| Hide selected collections | On | Filters selected IDs only in the Collections library. |
| Keep all collections visible for administrators | On | Exempts administrator accounts from collection hiding. |
| Playlists library name | Empty | Empty preserves Jellyfin's original name. A custom name applies to all accounts, including administrators. |
| Collections to hide | None | Search by name or ID, then select collections. |

Save and reload Jellyfin Web to apply settings; no server restart is required for configuration changes. Collection selection uses IDs, so renaming a collection preserves its selection. Missing saved IDs appear as **Collection not found / Collection introuvable** and can be unchecked. A recreated collection has a new ID and must be selected again.

The configuration page reports whether JavaScript Injector has accepted the client script. If it is unavailable, install it and restart Jellyfin. Library Curator does not prevent Jellyfin from starting without it.

## Behavior and limits

- Hiding is a **Web presentation preference**, not an access restriction. Direct links, global searches, collection references on other pages, and native clients retain normal Jellyfin behavior and permissions.
- Filters are added to the normal Collections query **before pagination**, preserving server-side totals, ordering, search and filters.
- Individual playlists are never renamed. Names are inserted as text; markup is not executed.
- Disable the plugin or clear the custom name and reload the browser to restore the original presentation. Uninstalling requires a Jellyfin restart and browser reload.
- Account/server changes discard cached presentation settings. If settings cannot be loaded within five seconds, requests continue normally and loading is retried after 30 seconds.
- The supported Web target is the stock **10.11.11** interface. Other versions, third-party themes and native clients are not claimed compatible. The script chains the existing `ApiClient.getItems` method to coexist with Community Rating.

## Development

Three projects separate Jellyfin integration, presentation policy, and .NET tests. Client and configuration tests use Node.js 22 and jsdom.

```sh
dotnet restore Jellyfin.Plugin.LibraryCurator.sln
dotnet build Jellyfin.Plugin.LibraryCurator.sln -c Release --no-restore -m:1
dotnet test Jellyfin.Plugin.LibraryCurator.sln -c Release --no-build --no-restore -m:1
npm ci --ignore-scripts
npm test
```

See [VALIDATION.md](VALIDATION.md) for the integration recipe and verified scenarios. `compose.yaml` starts a separate local Jellyfin on **127.0.0.1:18097**, using disposable data under `/tmp/library-curator-qa`. Populate `/config/plugins` with the published plugin and JavaScript Injector before starting it. Override `LIBRARY_CURATOR_QA_ROOT` for persistent test data. This setup never uses production data.

## Releases

CI builds and runs both test suites on pull requests and pushes to `main`. Publishing a release named `v0.1.0.0` checks the tag against the project version, builds and tests, creates the ZIP, uploads it to the release, and commits the package and updated manifest to `main`. The manifest uses the raw package URL and an MD5 checksum as required by Jellyfin's catalog. Keep the plugin GUID stable across updates.

## Licence

GPL-3.0-only. See [LICENSE](LICENSE).
