# Superego server

Runs Superego's existing backend in Node.js, with SQLite on the desktop and the
existing browser UI available over the LAN. Electron is not required.

## Build and run

From the repository root, with Corepack and a Node.js version supporting
`node:sqlite` (tested with Node 25):

```sh
yarn install
yarn build-server
yarn start-server
```

Open the LAN URL printed at startup, for example `http://192.168.1.100:5177`.
The frontend and API share port 5177. Embedded apps use port 5178 on the same
desktop, preserving their separate origin and existing permission bridge. Both
ports must be reachable from the iPad. No authentication is configured.

| Variable                 | Default                                                                      |
| ------------------------ | ---------------------------------------------------------------------------- |
| `SUPEREGO_HOST`          | `0.0.0.0`                                                                    |
| `SUPEREGO_PORT`          | `5177`                                                                       |
| `SUPEREGO_SANDBOX_PORT`  | `5178`                                                                       |
| `SUPEREGO_DATABASE_FILE` | `$XDG_CONFIG_HOME/superego/superego.db`, or `~/.config/superego/superego.db` |

`SUPEREGO_BROWSER_DIRECTORY` can override the directory containing the built
frontend.

The default database is the Linux Electron application's existing database. Use
a different path to try the server with an empty database:

```sh
SUPEREGO_DATABASE_FILE=/tmp/superego-test.db yarn start-server
```

Use the server as the backend owner while accessing it from browsers. Live AI
conversation state is held in the backend process; separate Electron/CLI
processes do not share that in-memory state.

`GET /api/health` reports readiness. `GET /api/database/export` downloads a
SQLite snapshot. Backend calls use `POST /api/backend/<domain>.<method>` with
devalue-encoded argument arrays and results, preserving dates, undefined values,
and binary file contents. Requests are limited to 64 MiB encoded. The desktop
filesystem export method is replaced by the download endpoint.

## Run as a user daemon

The supplied unit assumes this checkout is at `~/opt/superego` and Node is at
`/usr/bin/node`. Adjust those paths if needed, then:

```sh
mkdir -p ~/.config/systemd/user
cp packages/apps/server-app/systemd/superego.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now superego.service
journalctl --user -u superego.service -f
```

A user service starts at login. To keep it running without an active login,
enable lingering for your user with `loginctl enable-linger "$USER"`. After
rebuilding, restart it with `systemctl --user restart superego.service`. Stop it
with `systemctl --user stop superego.service`.

## Older iPads and plain HTTP

The browser entries supply JavaScript polyfills and a cryptographically random
UUID fallback for HTTP. Microphone recording is disabled when the browser or
connection cannot provide it.

An experimental legacy build can be produced with:

```sh
yarn workspace @superego/server-app build:legacy
SUPEREGO_BROWSER_DIRECTORY="$PWD/packages/apps/server-app/dist/browser-legacy" yarn start-server
```

For the daemon, set `SUPEREGO_BROWSER_DIRECTORY` to that absolute path in a
systemd service override, then reload systemd and restart `superego.service`.
Rebuild with `build:legacy` when updating a daemon configured this way.

This produces a separate, unminified build targeting iOS 9 JavaScript, but is
**not a claim of full iOS 9 support**. Stop the normal server before starting
the experimental build on the same ports. The existing UI uses modern CSS
(including grid, custom properties, container queries, and `:has()`), and
complex editors need device testing and fallbacks. Embedded user apps also
dynamically import generated JavaScript, which needs additional adaptation for
iOS 9. The default build is for modern browsers.

## iPad Home Screen launcher

Generate a configuration profile containing a removable, full-screen Web Clip
with the Superego icon and your server address:

```sh
python3 packages/apps/server-app/scripts/createWebClip.py http://192.168.1.4:5177
```

With the iPads connected over USB and paired with the desktop, install it on
each device using its identifier from `idevice_id -l`:

```sh
uvx pymobiledevice3 profile install --udid DEVICE_IDENTIFIER packages/apps/server-app/dist/ios/Superego.mobileconfig
uvx pymobiledevice3 profile list --udid DEVICE_IDENTIFIER
```

If iOS requests confirmation, finish the installation on the iPad. Tap
**Superego** on its Home Screen to open the server. The launcher uses the
device's existing web engine; it does not change browser compatibility.
Regenerate and reinstall the profile if the desktop's IP address changes.
