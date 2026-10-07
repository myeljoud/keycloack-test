# Next Console login theme — handoff

This document is the working agreement between the team that owns the login
theme (Console frontend) and the team that operates Keycloak (Identity). It
describes what each side owns, what the artifact is, how it is installed, and
how changes and upgrades flow between the two.

## 1. Ownership

| Area | Owner | Lives in |
|---|---|---|
| Theme source: React pages, CSS, assets, translations, Storybook | Console frontend | `keycloak-theme/` in this repository |
| Theme artifact: versioned JAR | Console frontend (built and published by CI) | GitHub Releases, tags `theme-v*` |
| Keycloak version, deployment, image build | Identity | Keycloak deployment repository |
| Realm and client configuration, authentication flows, required actions | Identity | Realm configuration |
| Realm setting **Login theme = `next-console`** | Identity (set once) | Realm settings → Themes |

The theme never changes Keycloak behaviour. It only changes how Keycloak's
pages look. Every form still posts to Keycloak with Keycloak's field names, so
password policy, brute-force detection, MFA and required actions are
unaffected by theme releases.

## 2. The artifact

| | |
|---|---|
| Name | `next-console-theme-<version>.jar` |
| Theme name inside the JAR | `next-console` |
| Theme type | Login only (no account, admin or email theme) |
| Built against | Keycloak 26.x. The JAR is the Keycloakify "all other versions" build, which covers Keycloak 26 and later. |
| Published by | GitHub Actions workflow `keycloak-theme.yml` on a tag matching `theme-vX.Y.Z` |
| Where | GitHub Release for that tag, with a `.sha256` file next to the JAR |
| Pull requests | The same workflow builds the JAR and a static Storybook on every PR that touches `keycloak-theme/`, available as workflow artifacts for review |

Versioning is semantic from the theme's point of view:

- **patch** — visual or wording fixes, no new pages
- **minor** — new branded pages or new translations
- **major** — built against a new Keycloak major, or a change that needs a realm setting

## 3. Installing the JAR

Copy the JAR into Keycloak's providers directory at image build time. Do not
bind-mount it: Keycloak memory-maps provider JARs and a mounted file can fail
with `ZipException: invalid LOC header` ("Failed to load themes" in the admin
console).

```dockerfile
FROM quay.io/keycloak/keycloak:26.8.0
ADD --checksum=sha256:<from the release> \
    https://github.com/<org>/<repo>/releases/download/theme-v1.0.0/next-console-theme-1.0.0.jar \
    /opt/keycloak/providers/
RUN /opt/keycloak/bin/kc.sh build
```

Notes:

- `kc.sh build` is required when Keycloak runs with `start --optimized`. In
  `start-dev` the JAR is picked up without it.
- After the first install, set **Realm settings → Themes → Login theme** to
  `next-console` for the realm. In a realm export this is `"loginTheme": "next-console"`.
- A new theme version is a new image build and a rolling restart. No realm
  change is needed for patch and minor releases.

## 4. Realm settings the theme depends on

The pages read these realm settings and change shape accordingly. Changing
them is fine, but tell the theme owner so Storybook and the QA checklist can
be updated.

| Setting | Current value | Effect on the page |
|---|---|---|
| Internationalization enabled, supported locales | on; `en`, `fr`, `ar`; default `en` | Language switcher and translations. Locales not in this list are never shown, even though the JAR contains them. |
| Remember me | on | Shows the "Remember me?" checkbox |
| Forgot password | on | Shows the "Forgot password?" link |
| Login with email | on | Field label reads "Username or Email" |
| User registration | off | No "Register" link is rendered. The register page is not yet branded. |
| Realm display name | `Next Console` | Browser tab title |

Clients pass the user's current language with the standard `ui_locales`
parameter. Keycloak ignores values that are not in the supported list.

## 5. What is branded today

| Keycloak page | Status |
|---|---|
| `login.ftl` (username + password) | Branded: Next Console design, three languages, RTL |
| Everything else: forgot password, update password, OTP, passkeys, terms, errors, info, logout confirmation, register, email verification | Keycloakify default look (Keycloak's own style). Functional, not branded. |

Unbranded pages are safe to enable; they just look like stock Keycloak until
they are picked up. The intended order is: forgot/reset password, update
password, OTP, error and info pages, then the rest as flows require them.

Email templates are not part of this theme. If branded emails are wanted,
that is a separate email theme and a separate decision.

## 6. Change process

**Theme change (frontend side)**

1. Open a PR in this repository touching `keycloak-theme/`.
2. CI builds the JAR and a static Storybook. Reviewers use the Storybook
   artifact to check every page state without a Keycloak instance.
3. Merge, then tag `theme-vX.Y.Z`. CI publishes the release.
4. Post the release link to Identity with the one-line summary and whether
   any realm setting is involved.

**Rolling it out (Identity side)**

1. Update the JAR version and checksum in the Keycloak image.
2. Deploy to the pre-production realm. Run the "Login" and "Languages"
   sections of the QA checklist in the repository README.
3. Deploy to production.

**Keycloak upgrade (Identity side, with frontend involvement)**

The theme is tied to the Keycloak major version through the page data it
receives. Before upgrading a Keycloak major:

1. Identity opens an issue with the target version and date.
2. Frontend bumps Keycloakify, rebuilds, runs Storybook and the local compose
   stack in `keycloak/` against the target version, and tags a new major
   theme release.
3. Identity rolls out the Keycloak upgrade and the theme release together.

Minor and patch Keycloak upgrades do not normally need a theme release, but
a smoke test of the login page after the upgrade is expected.

## 7. Testing without each other

- **Frontend, without Keycloak:** `pnpm theme:storybook` renders every page
  with mocked data. `pnpm theme:dev` serves the login page alone with hot reload.
- **Frontend, with a local Keycloak:** `pnpm build:theme && pnpm keycloak:up`
  starts Keycloak 26 with the realm and theme from this repository. Test user
  `demo` / `demo`.
- **Identity, before rollout:** install the release JAR in a pre-production
  realm and run the README QA checklist.

## 8. Security rules for theme code

The theme runs on Keycloak's origin, in the page where users type their
password. Treat it as authentication code.

- Translations and all other content ship inside the JAR. Nothing is loaded
  at runtime from a CMS, a CDN or any other origin. The only current
  exception is web fonts from Google Fonts; self-hosting them is planned.
- Keycloak-provided strings are rendered through Keycloakify's sanitiser
  (DOMPurify with Keycloak's allow-list). Custom translations are plain text.
- Forms post only to the URLs Keycloak supplies. No fetch calls, no scripts
  from third parties, no analytics on these pages.
- New npm dependencies in `keycloak-theme/` need a reviewer from each side.
- Realm administrators can override message strings in the admin console
  (Realm settings → Localization). Those overrides bypass code review; keep the
  set of people with `manage-realm` small.

## 9. Contacts

| Role | Name | Channel |
|---|---|---|
| Theme owner (Console frontend) | | |
| Keycloak owner (Identity) | | |
| Escalation for login outages | | |

Fill in before the first production rollout.
