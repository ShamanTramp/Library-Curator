# Disposable Jellyfin integration checks

`verify_server.py` exercises an **already seeded disposable instance**. It temporarily changes the Library Curator configuration and restores it on a successful run. Never point it at a production server.

Start the instance from `compose.yaml`. Create one administrator, two standard accounts, 25 collections named `QA Collection 00` through `QA Collection 24`, and a public playlist. Include a local test movie in each collection and playlist. Empty containers may be treated differently by Jellyfin startup cleanup.

Create a private state JSON **outside this repository** with these keys:

- `token`: administrator access token.
- `admin`: administrator user ID.
- `users`: two objects containing `Id` and `token` for standard users.
- `collections`: the 25 collection IDs in their numbered order.
- `config`: `{ "Enabled": true, "HideCollections": true, "ExemptAdministrators": true, "HiddenCollectionIds": [the first eight IDs], "PlaylistLibraryName": "Mes sélections" }`.

Apply that configuration through Jellyfin's plugin configuration API before running:

```sh
python3 tests/integration/verify_server.py --state /tmp/library-curator-qa/state.json
```

The default URL is `http://127.0.0.1:18097`. Set `LIBRARY_CURATOR_QA_URL` to use another disposable instance. The report contains check names only, never tokens. Keep the state file private and remove it with the disposable instance when finished.
