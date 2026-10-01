"""Create a removable iOS Home Screen launcher for a Superego server."""

import argparse
import plistlib
from pathlib import Path
from urllib.parse import urlsplit
from uuid import NAMESPACE_URL, uuid5


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("url", help="Server address reachable from the iPad")
parser.add_argument(
    "--output",
    type=Path,
    default=Path(__file__).resolve().parents[1] / "dist/ios/Superego.mobileconfig",
)
arguments = parser.parse_args()
address = urlsplit(arguments.url)
if address.scheme not in ("http", "https") or not address.hostname:
    parser.error("url must be an HTTP or HTTPS server address")

# Stable identifiers let reinstalling the profile update the server address.
identifier = "dev.superego.local.launcher"
icon = Path(__file__).resolve().parents[2] / "electron-app/assets/icon.png"
profile = {
    "PayloadType": "Configuration",
    "PayloadVersion": 1,
    "PayloadIdentifier": identifier,
    "PayloadUUID": str(uuid5(NAMESPACE_URL, identifier)).upper(),
    "PayloadDisplayName": "Superego Home Screen Launcher",
    "PayloadDescription": f"Adds a removable Superego launcher for {arguments.url}.",
    "PayloadOrganization": "Superego",
    "PayloadRemovalDisallowed": False,
    "PayloadContent": [
        {
            "PayloadType": "com.apple.webClip.managed",
            "PayloadVersion": 1,
            "PayloadIdentifier": f"{identifier}.webclip",
            "PayloadUUID": str(uuid5(NAMESPACE_URL, f"{identifier}.webclip")).upper(),
            "PayloadDisplayName": "Superego",
            "Label": "Superego",
            "URL": arguments.url,
            "FullScreen": True,
            "IsRemovable": True,
            "Precomposed": True,
            "Icon": icon.read_bytes(),
        }
    ],
}
arguments.output.parent.mkdir(parents=True, exist_ok=True)
arguments.output.write_bytes(plistlib.dumps(profile))
print(arguments.output)
