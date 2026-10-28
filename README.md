## Overview

This project uses the following tech stack:

- Vite
- Typescript
- React Router v7 (all imports from `react-router` instead of `react-router-dom`)
- React 19 (for frontend components)
- Tailwind v4 (for styling)
- Shadcn UI (for UI components library)
- Lucide Icons (for icons)
- Convex (for backend & database)
- Convex Auth (for authentication)
- Framer Motion (for animations)
- Three js (for 3d models)

All relevant files live in the 'src' directory.

Use npm for the package manager — `package-lock.json` is the one lockfile, and
CI installs with `npm ci`.

## The storefront: products, images and hosting

The landing page's four tiles are driven by `public/products.json` — a snapshot of the
creator's live IMVU shop that `npm run refresh-products` writes (the newest four items: id,
name, credit price, breadcrumb category, thumbnail URL and the link into the shop). Re-run it
when a drop lands and commit the file: the tiles, their artwork and their links then follow
the shop with nothing running server-side. Thumbnails are hotlinked from IMVU's CDN — the
same host the live feed returns — so no artwork is copied into the repository.

The tiles fall through three layers, in this order:

1. `public/products.json`, refreshed by hand. This is the feed on any static host.
2. `PRODUCTS` in `src/lib/store.ts` — the same four items baked in, used when that JSON
   cannot be fetched at all. It is also what the `/products/<id>` detail pages are built
   from, and what titles/prices/links the tiles show with no network at all.
3. The Convex action in `src/convex/imvuFeed.ts` — live server-side scraping. It is only
   reached when `SITE.productsApi` is set to `""`; that needs a deployment (`npx convex dev`)
   and its `VITE_CONVEX_URL`.

### Creator avatars

Each creator in the row shows the profile picture they have uploaded to IMVU, so an animated
GIF arrives animated and at full size (160×220) rather than as the blurry 80×110 still
`image_avatar.php` answers with. Those uploads carry a hash in their file name that changes
whenever the creator uploads a new picture, so the URL cannot be built from their id: it is
read from the `og:image` of their profile page by `npm run refresh-creators`
(`scripts/refresh-creators.mjs`), which writes `public/creators.json`.

A browser cannot do that lookup itself — IMVU sends no CORS header, so its profile pages are
unreadable from the storefront — which is why the deploy workflow runs the refresh before every
build and, on a six-hour schedule, on its own. Any push or scheduled run therefore republishes
the row with whatever pictures the creators have by then, and a creator whose page cannot be
read keeps the picture already in the file rather than going blank.

How quickly a new picture lands: the manifest is only as current as the last build, so a picture
uploaded now shows up at the next scheduled rebuild (within six hours) or at the next push. An
already-open page re-reads the manifest every five minutes — the same rollover that cache-busts
IMVU's own render — so it catches up within five minutes of that deploy rather than needing a
reload.

To keep this — and the product snapshot — current from your own machine, see "Keeping the
snapshot fresh from a terminal" below.

`src/components/CreatorAvatar.tsx` falls back through three sources: that manifest, then
`image_avatar.php?cid=…` (cache-busted with the rotating `v` token, since IMVU caches it for six
hours), then the copy in `public/creators/`. Each one is preloaded and only swapped in once it
decodes, so a refresh never blanks the frame.

### Keeping the snapshot fresh from a terminal

Everything on the site that comes from IMVU and changes on its own has a refresh script, and
`npm run watch` drives all of them — the product snapshot (`public/products.json`) and the
creators' pictures (`public/creators.json`) today:

```
npm run watch                    # every 30 minutes: refresh, commit, push
npm run watch -- --interval 5    # every 5 minutes
npm run watch -- --once          # a single pass
npm run watch -- --no-push       # commit, but keep it local
npm run watch -- --dry-run       # report what changed, touch nothing
```

A pass runs each refresher, compares its output byte-for-byte, and only when something moved
does it commit those files and push — which is the deploy. Unchanged passes commit nothing, so
a quiet night leaves no empty commits; a refresher that cannot reach IMVU leaves its file as it
is and the others still run. Another auto-updating source is one entry in the `REFRESHERS` list
at the top of `scripts/watch.mjs`: the script to run, and the files it writes.

The watcher lives only as long as that terminal does. For a window-less version, put the same
command under a scheduler — e.g. cron, every 30 minutes:

```
*/30 * * * * cd /path/to/xr-launch-countdown && npm run watch -- --once >> /tmp/watch.log 2>&1
```

On a systemd machine, `deploy/systemd/` holds a user service and timer that do the same thing
and keep the output in the journal rather than a log file:

```
mkdir -p ~/.config/systemd/user
cp deploy/systemd/xr-watch.* ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now xr-watch.timer
```

```
systemctl --user list-timers xr-watch.timer     # next run, last run
systemctl --user start xr-watch.service         # one pass now, without waiting
journalctl --user -u xr-watch -n 40 -f          # what the passes did
systemctl --user disable --now xr-watch.timer   # stop the schedule
```

The units assume the clone is `~/xr-launch-countdown` (`%h` in a unit is your home directory)
and that node is in `/usr/local/bin` or `/usr/bin`; a clone elsewhere needs `WorkingDirectory`
and `Documentation` edited, and an nvm- or volta-managed node needs the `ExecStart` path
swapped for the output of `which node`. The timer fires at `:00` and `:30` with
`Persistent=true`, so a pass missed while the machine was asleep or off runs once at the next
boot rather than being skipped.

On macOS the same schedule is a LaunchAgent, `deploy/launchd/com.xr-launch-countdown.watch.plist`.
Copy it into `~/Library/LaunchAgents/` after replacing the two `/Users/YOU/…` paths and the
`/opt/homebrew/bin/node` it runs — or let `npm run schedule` write the filled-in copy:

```
cp deploy/launchd/com.xr-launch-countdown.watch.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.xr-launch-countdown.watch.plist
launchctl print gui/$(id -u)/com.xr-launch-countdown.watch | head -20
tail -f ~/Library/Logs/xr-watch.log
launchctl bootout gui/$(id -u)/com.xr-launch-countdown.watch    # stop and remove it
```

A LaunchAgent only runs while you are logged in, and `StartInterval` counts from the last run
rather than from the clock — a sleeping Mac catches up on waking instead of firing exactly on
the half hour.

`npm run schedule` does all of that on whichever scheduler the machine actually has — launchd
on macOS, a systemd user timer on Linux when a user instance answers, cron otherwise:

```
npm run schedule                      # install and enable, every 30 minutes
npm run schedule -- --interval 5      # every 5 minutes
npm run schedule -- --status          # installed? when does it next run?
npm run schedule -- --uninstall       # take the schedule back off
npm run schedule -- --dry-run         # print what it would write, change nothing
npm run schedule -- --scheduler cron  # override the detection
npm run schedule -- --linger          # systemd: keep it running with no session
```

It bakes in this clone's absolute path and the node binary that ran the script, which is the
part a hand-copied crontab gets wrong: a scheduled job has no shell profile, so an
nvm-installed `node` — and `npm` itself — are invisible to it. The systemd units and the plist
it writes are rendered from `deploy/systemd/` and `deploy/launchd/`, so every key has one home.

A **user** timer only counts down while your systemd user instance is running: on a desktop
that is every login, but on a server it stops at logout. Enabling lingering starts that
instance at boot and keeps it running with no session at all:

```
loginctl enable-linger "$USER"
loginctl show-user "$USER" --property=Linger     # Linger=yes
```

It needs no root for your own account on most distributions (polkit may ask for
confirmation); `sudo loginctl enable-linger "$USER"` works either way, and
`loginctl disable-linger "$USER"` undoes it. Use the timer **or** cron, not both — a second
schedule over the same clone duplicates the refresh and can collide on git's index lock.

Git credentials are the one thing a scheduler cannot supply: there is no unlocked keychain
prompt and no SSH passphrase prompt, so the push has to work unattended already —
`gh auth setup-git` or a passphrase-less deploy key. `git push` failing there leaves the
commit on disk and says so in the journal; the next pass pushes both.

### Publishing it

- `npm run build` — normal root-relative build for any host, including the Freebuff preview.
- `npm run build:pages` — builds for GitHub Pages at `/<repo>/` and writes `dist/404.html`,
  so deep links such as `/<repo>/products/76161696` boot the app instead of 404ing. It first
  runs `npm run check-creators`, which fails the build when a supported creator's live IMVU
  avatar no longer resolves — an unknown id answers with IMVU's placeholder picture, so the
  response is hashed and compared against it rather than trusted on status alone.
- `.github/workflows/deploy-pages.yml` — runs both on every push to `main` and deploys.
  Enable it once under Settings → Pages → Build and deployment → Source: GitHub Actions.

Every public asset and internal link resolves through `src/lib/asset.ts`
(`import.meta.env.BASE_URL`), so the storefront works at a domain root or under a sub-path
unchanged — that also covers the font the binary mark is drawn in and the notice strip.

No backend is needed to publish: with no `VITE_CONVEX_URL` the storefront renders in full and
`/auth` and `/dashboard` show a "backend offline" note instead of a blank page.

## Setup

This project is set up already and running on a cloud environment, as well as a convex development in the sandbox.

## Environment Variables

The project is set up with project specific CONVEX_DEPLOYMENT and VITE_CONVEX_URL environment variables on the client side.

The convex server has a separate set of environment variables that are accessible by the convex backend.

Currently, these variables include auth-specific keys: JWKS, JWT_PRIVATE_KEY, and SITE_URL.

# Using Authentication (Important!)

You must follow these conventions when using authentication.

## Auth is already set up.

All convex authentication functions are already set up. The auth currently uses email OTP and anonymous users, but can support more.

The email OTP configuration is defined in `src/convex/auth/emailOtp.ts`. DO NOT MODIFY THIS FILE.

Also, DO NOT MODIFY THESE AUTH FILES: `src/convex/auth.config.ts` and `src/convex/auth.ts`.

## Using Convex Auth on the backend

On the `src/convex/users.ts` file, you can use the `getCurrentUser` function to get the current user's data.

## Using Convex Auth on the frontend

The `/auth` page is already set up to use auth. Navigate to `/auth` for all log in / sign up sequences.

You MUST use this hook to get user data. Never do this yourself without the hook:

```typescript
import { useAuth } from "@/hooks/use-auth";

const { isLoading, isAuthenticated, user, signIn, signOut } = useAuth();
```

## Protected Routes

The starter `/dashboard` route is protected with `RequireAuth`. Extend that page
for the product's authenticated experience, and reuse `RequireAuth` when adding
another protected route — do NOT hand-roll a redirect to `/auth`, since landing
on a bare sign-in form with no explanation of what was blocked is confusing.

`RequireAuth` states the block on the page the visitor asked for and sends them
to `/auth?returnTo=<current route>` when they choose to sign in, so they come
back to it. Pass `title` and `description` to say what the page is:

```tsx
<Route
  path="/dashboard"
  element={
    <RequireAuth
      title="Sign in to view your dashboard"
      description="Your projects and settings live here."
    >
      <Dashboard />
    </RequireAuth>
  }
/>
```

Pass `redirectImmediately` for a route where bouncing straight to `/auth` really
is better.

## Auth Page

The auth page is defined in `src/pages/Auth.tsx`. Send sign-in and sign-up actions
to `/auth`.

## Authorization

You can perform authorization checks on the frontend and backend.

On the frontend, you can use the `useAuth` hook to get the current user's data and authentication state.

You should also be protecting queries, mutations, and actions at the base level, checking for authorization securely.

## Adding a redirect after auth

The `/auth` route in `src/main.tsx` redirects to `/dashboard` by default. If the
product's main authenticated route is different, update `redirectAfterAuth` to
that route. A validated same-origin `returnTo` query parameter takes priority so
users can resume the protected page they originally requested. Never leave an
authenticated product redirecting back to the public landing page.

## Complete authenticated products

When the requested product implies accounts, a workspace, a dashboard, or other
signed-in functionality, the task is not complete with only a landing page and
auth form. Build the main authenticated experience, protect its route, and verify
that signing in reaches it.

# Frontend Conventions

You will be using the Vite frontend with React 19, Tailwind v4, and Shadcn UI.

Generally, pages should be in the `src/pages` folder, and components should be in the `src/components` folder.

Shadcn primitives are located in the `src/components/ui` folder and should be used by default.

## Page routing

Your page component should go under the `src/pages` folder.

When adding a page, update the react router configuration in `src/main.tsx` to include the new route you just added.

## Shad CN conventions

Follow these conventions when using Shad CN components, which you should use by default.

- Remember to use "cursor-pointer" to make the element clickable
- For title text, use the "tracking-tight font-bold" class to make the text more readable
- Always make apps MOBILE RESPONSIVE. This is important
- AVOID NESTED CARDS. Try and not to nest cards, borders, components, etc. Nested cards add clutter and make the app look messy.
- AVOID SHADOWS. Avoid adding any shadows to components. stick with a thin border without the shadow.
- Avoid skeletons; instead, use the loader2 component to show a spinning loading state when loading data.

## Landing Pages

You must always create good-looking designer-level styles to your application.

- Make it well animated and fit a certain "theme", ie neo brutalist, retro, neumorphism, glass morphism, etc

Use known images and emojis from online.

If the user is logged in already, show the get started button to say "Dashboard" or "Profile" instead to take them there.

## Responsiveness and formatting

Make sure pages are wrapped in a container to prevent the width stretching out on wide screens. Always make sure they are centered aligned and not off-center.

Always make sure that your designs are mobile responsive. Verify the formatting to ensure it has correct max and min widths as well as mobile responsiveness.

- Always create sidebars for protected dashboard pages and navigate between pages
- Always create navbars for landing pages
- On these bars, the created logo should be clickable and redirect to the index page

## Animating with Framer Motion

You must add animations to components using Framer Motion. It is already installed and configured in the project.

To use it, import the `motion` component from `framer-motion` and use it to wrap the component you want to animate.

### Other Items to animate

- Fade in and Fade Out
- Slide in and Slide Out animations
- Rendering animations
- Button clicks and UI elements

Animate for all components, including on landing page and app pages.

## Three JS Graphics

Your app comes with three js by default. You can use it to create 3D graphics for landing pages, games, etc.

## Colors

You can override colors in: `src/index.css`

This uses the oklch color format for tailwind v4.

Always use these color variable names.

Make sure all ui components are set up to be mobile responsive and compatible with both light and dark mode.

Set theme using `dark` or `light` variables at the parent className.

## Styling and Theming

When changing the theme, always change the underlying theme of the shad cn components app-wide under `src/components/ui` and the colors in the index.css file.

Avoid hardcoding in colors unless necessary for a use case, and properly implement themes through the underlying shad cn ui components.

When styling, ensure buttons and clickable items have pointer-click on them (don't by default).

Always follow a set theme style and ensure it is tuned to the user's liking.

## Toasts

You should always use toasts to display results to the user, such as confirmations, results, errors, etc.

Use the shad cn Sonner component as the toaster. For example:

```
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
export function SonnerDemo() {
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast("Event has been created", {
          description: "Sunday, December 03, 2023 at 9:00 AM",
          action: {
            label: "Undo",
            onClick: () => console.log("Undo"),
          },
        })
      }
    >
      Show Toast
    </Button>
  )
}
```

Remember to import { toast } from "sonner". Usage: `toast("Event has been created.")`

## Dialogs

Always ensure your larger dialogs have a scroll in its content to ensure that its content fits the screen size. Make sure that the content is not cut off from the screen.

Ideally, instead of using a new page, use a Dialog instead.

# Using the Convex backend

You will be implementing the convex backend. Follow your knowledge of convex and the documentation to implement the backend.

## The Convex Schema

You must correctly follow the convex schema implementation.

The schema is defined in `src/convex/schema.ts`.

Do not include the `_id` and `_creationTime` fields in your queries (it is included by default for each table).
Do not index `_creationTime` as it is indexed for you. Never have duplicate indexes.

## Convex Actions: Using CRUD operations

When running anything that involves external connections, you must use a convex action with "use node" at the top of the file.

You cannot have queries or mutations in the same file as a "use node" action file. Thus, you must use pre-built queries and mutations in other files.

You can also use the pre-installed internal crud functions for the database:

```ts
// in convex/users.ts
import { crud } from "convex-helpers/server/crud";
import schema from "./schema.ts";

export const { create, read, update, destroy } = crud(schema, "users");

// in some file, in an action:
const user = await ctx.runQuery(internal.users.read, { id: userId });

await ctx.runMutation(internal.users.update, {
  id: userId,
  patch: {
    status: "inactive",
  },
});
```

## Common Convex Mistakes To Avoid

When using convex, make sure:

- Document IDs are referenced as `_id` field, not `id`.
- Document ID types are referenced as `Id<"TableName">`, not `string`.
- Document object types are referenced as `Doc<"TableName">`.
- Keep schemaValidation to false in the schema file.
- You must correctly type your code so that it passes the type checker.
- You must handle null / undefined cases of your convex queries for both frontend and backend, or else it will throw an error that your data could be null or undefined.
- Always use the `@/folder` path, with `@/convex/folder/file.ts` syntax for importing convex files.
- This includes importing generated files like `@/convex/_generated/server`, `@/convex/_generated/api`
- Remember to import functions like useQuery, useMutation, useAction, etc. from `convex/react`
- NEVER have return type validators.
