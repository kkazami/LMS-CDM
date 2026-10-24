# Running CdM LMS on another computer

Use Node.js 24.3 or newer (24 LTS recommended), or 22.13+, and pnpm 10.32.1.
Run commands from the repository root. Use the committed lockfile:

```sh
pnpm install --frozen-lockfile
pnpm check:setup mobile
pnpm dev:mobile
```

Mobile is an Expo application. `npx prisma start` starts a Prisma service, not the
mobile application. Do not copy `node_modules`, `.expo`, or `.next` from another
computer. Each computer installs its own platform dependencies.

## Mobile

A fresh clone uses `https://lms-cdm.vercel.app` for its API. It needs internet access
but no database, SMTP, JDoodle, or other server secrets. To change the address,
copy `apps/mobile/.env.example` to `apps/mobile/.env.local` and set
`EXPO_PUBLIC_API_URL`. This is public app configuration; never put secrets there.
Use a server origin, such as `https://lms.example.edu`, rather than a login-page URL.

The project uses Expo SDK 57. The phone's Expo Go build must support SDK 57, or use
a development build matching this project. Installing the latest store app does
not guarantee a match. See Expo's [version mismatch guide](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/).
Keep the project's pinned dependency versions until making a deliberate SDK upgrade.

For local API work, set `EXPO_PUBLIC_API_URL=auto`, start `pnpm dev:web` in another
terminal, and keep the phone and computer on the same network. Automatic discovery
uses Metro's LAN host; Android emulators use `10.0.2.2`. `localhost` on a physical
phone means the phone itself. Permit the development server through the computer's
firewall on trusted/private networks. Do not disable the firewall globally.

If you use Expo's web preview, use the local API mode so development CORS permits
the preview origin. Hosted API access from a different browser origin requires a
deliberate server allowlist configuration; native requests do not use browser CORS.

After changing networks or public environment settings, stop Expo and run:

```sh
pnpm dev:mobile:clear
```

`pnpm dev:mobile:tunnel` tunnels the Expo bundle. It does not tunnel the Next.js
server or PostgreSQL. Use the live API or configure a reachable HTTPS backend when
the phone is outside the local network. You can change the WebView server through
its connection screen; Retry reloads the saved address.

### “Cannot connect to Expo CLI” at a LAN address

This warning concerns the phone's developer connection to Metro (normally port
8081), not the LMS API or PostgreSQL. A cached bundle can keep working while live
reload and developer tools are disconnected. Do not suppress the warning.

Stop the old Metro process, restart `pnpm dev:mobile:clear`, and scan the new QR
code. An old QR code can point at a different computer or a previous Wi-Fi address.
Keep both devices on the same non-guest network; VPNs, client isolation, or a
firewall blocking Node's private-network traffic can block the developer connection.

For different networks or a troublesome Wi-Fi connection, use:

```sh
pnpm dev:mobile:tunnel
```

For Android over USB, install Android SDK Platform-Tools, enable USB debugging,
connect the phone, and approve its debugging prompt. Check that `adb devices`
shows the intended device as `device`, then run:

```sh
pnpm dev:mobile:usb
```

That command forwards the phone's port 8081 to this computer and starts Expo on
localhost at the same port. It requires one authorized Android device. Use the
live backend or a separately reachable API; this developer-port forward does not
forward port 3000. A release build does not need Expo CLI at all.

## Web

Copy `.env.example` to `apps/web/.env.local` and configure a PostgreSQL connection
with the project's restricted application runtime role. A template's placeholder
connection is not a working database. Do not substitute a database-owner URL to
make privileged login work: administrator login checks the database boundary.
Use the project's migration/provisioning procedures for a new database.

```sh
pnpm check:setup web
pnpm dev:web
```

Next.js reads environment files in `apps/web`. A root `.env` used by Prisma is not
a replacement for the web application's environment configuration. Process
environment variables take precedence. Restart Next.js after changing settings.
Environment files are intentionally absent from GitHub; transfer credentials
securely or create independent development credentials.

## Desktop

For local development, start the web server first, then run `pnpm dev:desktop` in
another terminal. The desktop shell uses the same backend; it has no database of
its own. To use the live backend from PowerShell:

```powershell
$env:LMS_WEB_URL = 'https://lms-cdm.vercel.app'
pnpm dev:desktop
```

The app and its navigation menu use that same address. Packaged production
configuration defaults to the live website. An interrupted Electron binary
download is reported by `pnpm check:setup desktop`; retry the approved Electron
installation as instructed. Do not enable all dependency build scripts globally.

## Login on the live website

Every computer visiting the same live website uses Vercel's deployed code and
server settings, not its own checkout, dependencies, or `.env.local`. Test a fresh
sign-in in a private browser window to separate a saved session from new login.
If one device still fails, capture the exact error and time, verify the URL and
institute, and inspect the corresponding recent server logs. Do not copy cookies
or passwords between computers to work around a failure.
