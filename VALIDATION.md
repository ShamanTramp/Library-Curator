# Validation — Library Curator 0.1.0.0

Target: Jellyfin Server/Web **10.11.11**, .NET 9, JavaScript Injector **3.1.0.0**, Community Rating **0.1.5.0**. Tested on 23 October 2026 using a separate local instance on port 18097.

## Automated checks

- Release solution build: **0 warnings, 0 errors**.
- **19 .NET tests**: defaults, identifier normalization, administrator exemption, disabled features, names, API authorization and embedded resources.
- **21 Web tests**: native query preservation, exclusion merging, pagination arguments, scope, rendering and safe text insertion, native home links, account changes, login-page startup, restoration, duplicate injection, configuration failures and Community Rating's actual released script in both loading orders.
- **22 live API checks** on an isolated Jellyfin: two standard accounts, administrator exemption on/off, permissions, native views, direct collection access, search, settings persistence after restart and disabled behavior.
- Pagination fixture: **25 collections, 8 excluded → 17 visible; pages of 10 and 7**.

Run the live checks as described in [tests/integration/README.md](tests/integration/README.md). Tokens and fixture credentials are kept outside the repository.

## Browser verification

Verified in Jellyfin Web alongside the installed Community Rating plugin:

- Custom name on home cards and the navigation menu, with Community Rating counters still displayed.
- Custom Playlists library title and preserved individual playlist names.
- French configuration labels, saved settings, collection selection, search and JavaScript Injector status.
- Standard account: Collections displays exactly **1–17 of 17**, starting at QA Collection 08; IDs 00–07 are absent.
- Signing out restores native labels; signing in as another account uses that account’s distinct virtual Playlists view.
- Mobile viewport **390 × 844**: custom Playlists title, preserved playlist item title, navigation and content render using Jellyfin’s native responsive layout.

The Web script intentionally starts on the login page but performs no authenticated requests until an account is signed in. This also supports signing in without reloading the browser.

## Distribution checks

CI and release workflows run the .NET and Web suites. The package script validates the tag/version and required assemblies before writing the ZIP and Jellyfin manifest. Only the isolated test instance is used for installation testing; existing plugin projects and the pre-existing Jellyfin instance are not changed.
