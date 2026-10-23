# Library Curator

![Library Curator illustration](assets/library-curator-cover-v2.png)

**Library Curator** is a Jellyfin plugin that lets you hide selected collections from the Collections library and customize the name of the Playlists library in Jellyfin Web.

## Features

- Hides selected collections only in the **Collections** library, while preserving direct access and collection references elsewhere.
- Keeps every collection visible to administrators by default, with an option to apply the same hiding rules to them.
- Renames the **Playlists** library on the home screen, in navigation, and in the library title. Individual playlist names stay unchanged.
- Preserves Jellyfin's server-side sorting, filtering, pagination, and result totals by excluding selected collections before pagination.
- Identifies collections by their Jellyfin IDs, so renaming a collection does not change its selection.
- Provides a searchable collection list with names and IDs, including saved selections that are no longer found.
- Follows Jellyfin's interface language for configuration, with French and English included and English as the fallback.

These customizations apply to Jellyfin Web. Hiding a collection is a display preference; it does not change access permissions or remove the collection. Native clients keep their normal display.

## Installation

Install [JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector) first. Library Curator registers its bundled script with JavaScript Injector automatically when Jellyfin starts.

In Jellyfin, open **Dashboard → Plugins → Repositories**, then add the repository manifest:

```text
https://raw.githubusercontent.com/ShamanTramp/Library-Curator/main/manifest.json
```

Save the repository, open the plugin catalog, select **Available** if needed, then install **Library Curator**. Restart Jellyfin and reload the web client when installation is complete. The [0.1.0.0 plugin package](https://raw.githubusercontent.com/ShamanTramp/Library-Curator/main/packages/library-curator-0.1.0.0.zip) is also available directly.

Jellyfin must be able to access the manifest and package files on GitHub to install and update the plugin.

## Configuration and usage

Open **Dashboard → Plugins → Library Curator**:

| Option | Default | Description |
| --- | --- | --- |
| Enable Library Curator | Enabled | Enables collection hiding and the custom Playlists library name. |
| Hide selected collections | Enabled | Hides the selected collections in the Collections library. |
| Keep all collections visible for administrators | Enabled | Exempts administrator accounts from collection hiding. Disable to apply the same selection to everyone. |
| Playlists library name | Empty | Sets the library label for all accounts, including administrators. Leave empty to keep Jellyfin's original name. |
| Collections to hide | None | Search by name or ID, then select the collections to hide. |

Save your settings, then reload Jellyfin Web to apply them. Configuration changes do not require a server restart.

The configuration page shows whether JavaScript Injector has accepted the plugin's script. If registration is unavailable, install JavaScript Injector and restart Jellyfin. The server and configuration remain usable when that dependency is absent.

Selected collections retain their IDs when renamed. A deleted collection is shown as **Collection not found** (**Collection introuvable** in French) until you uncheck it. A recreated collection has a new ID and must be selected again.

To restore the original display, disable Library Curator and reload the browser. Clearing only the Playlists name restores its original label while keeping collection hiding active. After upgrading, fully reload the browser page to replace any script left running by the previous version.

## Compatibility

Targets Jellyfin **10.11.11** and **.NET 9**. The web interface requires JavaScript Injector; the integration was tested with JavaScript Injector **3.1.0.0** and Community Rating **0.1.5.0**. Native clients do not load the injected script.

The script waits for an authenticated account before loading its settings and clears cached presentation settings when the account or server changes. If settings cannot be loaded within five seconds, normal Jellyfin requests continue and loading is retried after 30 seconds.

The supported target is Jellyfin Web 10.11.11 with its standard interface. Other Web versions and third-party themes have not been validated.

## Development

```sh
dotnet restore Jellyfin.Plugin.LibraryCurator.sln
dotnet build Jellyfin.Plugin.LibraryCurator.sln -c Release --no-restore -m:1
dotnet test Jellyfin.Plugin.LibraryCurator.sln -c Release --no-build --no-restore -m:1
npm ci --ignore-scripts
npm test
```

The solution separates Jellyfin integration, independent presentation rules, and .NET tests. Web tests use Node.js 22 and jsdom, including the released Community Rating script in both loading orders; they do not require a running Jellyfin server.

CI builds and runs both test suites on pushes to `main` and pull requests. Publishing a GitHub release verifies the version tag, produces the installable ZIP, computes its checksum, and updates `manifest.json` and the package on `main`.

See [VALIDATION.md](VALIDATION.md) for the completed checks and [tests/integration/README.md](tests/integration/README.md) for the live API test recipe. The included `compose.yaml` starts a separate Jellyfin test instance on **127.0.0.1:18097**, with disposable data under `/tmp/library-curator-qa`. Override `LIBRARY_CURATOR_QA_ROOT` to choose another test-data directory. Install the published plugin and JavaScript Injector in that instance before testing.

## License

GPL-3.0-only. See [LICENSE](LICENSE).
