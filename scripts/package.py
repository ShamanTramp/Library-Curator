#!/usr/bin/env python3
"""Build the catalog package and manifest from an already-tested publish directory."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PLUGIN_ID = 'a7c41c34-c6a1-4cab-9c87-7f548ba37bb8'
parser = argparse.ArgumentParser()
parser.add_argument('--tag', required=True)
parser.add_argument('--input', type=Path, default=ROOT / 'publish')
args = parser.parse_args()
version = ET.parse(ROOT / 'src/Jellyfin.Plugin.LibraryCurator/Jellyfin.Plugin.LibraryCurator.csproj').findtext('.//Version')
if args.tag.removeprefix('v') != version or not re.fullmatch(r'\d+\.\d+\.\d+\.\d+', version or ''):
    raise SystemExit('Release tag must match the four-part plugin version.')
for assembly in ['Jellyfin.Plugin.LibraryCurator.dll', 'Jellyfin.Plugin.LibraryCurator.Core.dll']:
    if not (args.input / assembly).is_file():
        raise SystemExit('Missing plugin assembly: ' + assembly)
package = ROOT / 'packages' / f'library-curator-{version}.zip'
package.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(package, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(args.input.iterdir()):
        if file.is_file(): archive.write(file, file.name)
checksum = hashlib.md5(package.read_bytes()).hexdigest()
manifest_path = ROOT / 'manifest.json'
manifest = json.loads(manifest_path.read_text())
plugin = next(entry for entry in manifest if entry['guid'] == PLUGIN_ID)
plugin['versions'] = [entry for entry in plugin['versions'] if entry['version'] != version]
plugin['versions'].insert(0, {
    'version': version,
    'changelog': 'Initial release: selective collection hiding with administrator exemption and custom Playlists library name in Jellyfin Web.' if version == '0.1.0.0' else 'See the GitHub release notes.',
    'targetAbi': '10.11.11.0',
    'sourceUrl': f'https://raw.githubusercontent.com/ShamanTramp/Library-Curator/main/packages/{package.name}',
    'checksum': checksum,
    'timestamp': datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')
})
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(package.relative_to(ROOT))
