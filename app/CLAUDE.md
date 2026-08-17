# app/CLAUDE.md — frontend rules

Rules for everything under `app/`. The root `CLAUDE.md` has the project-wide rules; this
file covers what is specific to the Vue/Nuxt layer. Read both.

---

## What lives where

| Directory | Contains | Does NOT contain |
|---|---|---|
| `pages/` | Routing, data fetching, SEO metadata, composition | Business logic, direct Supabase calls, markup beyond arrangement |
| `layouts/` | Chrome: header, nav, footer, skip link | Page-specific content |
| `components/app/` | Design-system primitives. Generic, no domain knowledge. | `$fetch`, domain types, i18n keys outside `common.*` |
| `components/profile/` | Public profile domain UI | Data fetching — props come from the page |
| `components/admin/` | Dashboard domain UI | — |
| `components/layout/` | Brand mark, locale switcher, footer | — |
| `composables/` | Reusable stateful logic and side effects | Pure functions (those go in `utils/`) |
| `utils/` | Pure functions | Anything reactive |
| `middleware/` | Navigation guards | **Authorization decisions** |

---

## Component patterns

### Always

- `<script setup lang="ts">`. Block order `<script>` → `<template>` → `<style>`.
- Type props and emits with generics:
  ```ts
  const props = defineProps<{ profile: PublicProfile }>()
  const emit = defineEmits<{ submit: [payload: ProfileCreateInput] }>()
  ```
- `defineModel<T>()` for two-way bindings — not the `modelValue` + `update:modelValue` pair.
- PascalCase in filenames and templates: `<ProfileIdentity />`.
- Filename-based auto-import names (configured `pathPrefix: false`). `AppButton.vue`
  is `<AppButton>` regardless of its folder. Because of this, **component filenames must be
  globally unique** — keep the domain prefix (`App*`, `Profile*`, `Admin*`).

### Data flow

Props down, events up. That is the default and it covers almost everything here.

- Props are read-only. Never mutate one.
- A parent needing to react to something emits upward; component events do not bubble, so
  re-emit explicitly through intermediate components.
- `provide`/`inject` only for genuinely cross-tree context, keyed by `InjectionKey`.
- Reach for a template ref only when a native imperative API is needed (`dialog.showModal()`).
  Type it with `useTemplateRef<HTMLDialogElement>('name')`.

### Splitting

Split a component when **any** of these is true:

- it owns both data orchestration and substantial markup;
- it has three or more distinct UI sections;
- a template block repeats or could be reused.

Pages and layouts stay thin — composition surfaces, not implementations. `ProfileView.vue`
is the model: it arranges blocks and owns nothing else.

### Reactivity

- `shallowRef` for primitives, `ref` for objects you replace wholesale, `reactive` for
  objects you mutate in place (forms).
- Derive with `computed`. Never assign a derived value inside a watcher.
- Keep `.filter()`/`.sort()` out of templates — put them in a `computed`.
- Computed getters stay pure. Side effects belong in `watch`.
- Cancel in-flight work on rapid changes (search inputs) — see the debounce in
  `pages/admin/profiles/index.vue`.

---

## Composables

- Name `useThing`, return an object.
- Options object for anything past two parameters.
- Return `readonly()` state plus explicit actions when consumers should not mutate directly
  (`useAdminSession`, `useAsyncAction`).
- Accept `MaybeRefOrGetter` for inputs and normalise with `toValue()`, so a caller can pass
  a value, a ref or a getter (`useProfileLinks`).
- Pure helpers are **not** composables — they go in `app/utils/`.

Existing composables, use them rather than reinventing:

| Composable | Use for |
|---|---|
| `useAsyncAction` | **Every** server mutation. Gives pending/error/field-error state and blocks double submits. |
| `useApiError` | Turning a thrown `$fetch` error into a translated message and field errors. |
| `useAdminSession` | Who is signed in; `can(capability)` for rendering decisions. |
| `useLocalizedField` | Picking `*En`/`*Ar` in the dashboard, with fallback. |
| `useProfileLinks` | vCard / QR / wallet / `tel:` / `mailto:` URLs for a profile. |
| `useLocaleDirection` | The active locale and its direction, when behaviour (not layout) depends on it. |
| `useClipboard` | Copy-to-clipboard with a "copied" acknowledgement and failure reporting. |

---

## i18n

- **No hardcoded user-facing strings.** Every string goes through `t()` and into **both**
  `i18n/locales/en.json` and `i18n/locales/ar.json`. A key present in only one file is a bug.
- Keys are nested and namespaced by area: `admin.profiles.title`, `profile.actions.call`,
  `validation.slug`, `errors.forbidden`.
- Interpolate, never concatenate: `t('common.pagination.page', { page, total })`.
- Internal links go through `localePath()`. Never write `/en/...` by hand.
- Language switching uses `switchLocalePath()`, which resolves the *same* route in the
  other locale. On a dynamic route call `useSetI18nParams()` so the parameters survive —
  see `pages/[slug].vue`.
- Validation messages returned from the server are **i18n keys**, not sentences. Translate
  them at the render site.
- Dates and numbers: `d()` and `n()` from `useI18n()`, using the formats in
  `i18n/i18n.config.ts`. Never `toLocaleDateString()` with a hardcoded locale.

## RTL

The document's `dir` is set by `useLocaleHead()` in `app.vue`. Nothing else should set it.

- **Use logical utilities.** `ps-*` `pe-*` `ms-*` `me-*` `start-*` `end-*` `text-start`
  `text-end` `border-s` `border-e` `rounded-s-*` `rounded-e-*`.
- **Never** `pl-*` `pr-*` `ml-*` `mr-*` `left-*` `right-*` `text-left` `text-right`.
- Directional glyphs (chevrons, arrows) need an explicit flip: `ltr:rotate-0 rtl:rotate-180`.
- A transform that means "forward" needs both variants:
  `ltr:translate-x-5 rtl:-translate-x-5` — see `AppSwitch.vue`.
- **Form inputs holding the other language use `dir="auto"`.** An Arabic name field on an
  English page renders wrongly under the page direction; `auto` resolves per value.
  `AppInput` and `AppTextarea` default to it.
- Latin-only values (slug, email, phone, URL) get `dir="ltr"` explicitly, so an Arabic page
  does not reorder `+966...` or `https://...`.
- **Check both locales before calling UI work done.** `/en/...` and `/ar/...`.

---

## Design tokens

Tokens are defined once, in `app/assets/css/main.css`, as `--pu-*` values mapped through
`@theme inline` onto Tailwind's semantic names.

**Use only semantic utilities:**

```text
bg-background  bg-surface  bg-surface-hover  bg-muted
text-foreground  text-muted-fg
bg-primary  text-primary-fg  bg-accent  text-accent-fg
border-border  border-border-strong  outline-ring
bg-danger  bg-danger-surface  text-danger   (also success / warning / info)
rounded-sm|md|lg|xl   shadow-card|raised|overlay
```

**Never:**

- a raw hex value in a component (`bg-[#192341]`, `color: #192341`);
- an arbitrary colour utility (`bg-blue-600`) — the palette is semantic, not named;
- a new token invented inline. Add it to `main.css` with the others.

If a design needs a variant that does not exist, add it to the component's variant map
(e.g. `AppButton`'s `VARIANT_CLASS`) rather than passing utility classes in from a page.
That keeps the design system enumerable.

Dark mode already works: `.dark` redefines the same `--pu-*` values, so every utility
follows. Do not add `dark:` variants for colour — the token handles it.

---

## Responsive design

- **Public profiles are mobile-first.** Write the phone layout with no prefix, then widen
  with `sm:` / `lg:`. They are opened from a QR code and from chat apps.
- **The dashboard is desktop-efficient but responsive.** The `admin` layout keeps a
  persistent sidebar from `lg:` and collapses to a disclosure panel below it.
- Tables scroll inside their own `overflow-x-auto` container (`AppTable` does this) so a
  wide table never makes the page scroll sideways.
- Touch targets: 40px minimum for icon-only controls. `AppIconButton` sizes enforce it.
- Use `min-h-dvh`, not `min-h-screen` — mobile browser chrome makes `vh` wrong.
- Long values need `truncate` or `break-all`, with the full value in a `title`.

---

## Accessibility

Non-negotiable. Reviewed on every UI change.

- Every input has a `<label for>`. Use `AppFormField`, which wires `for`/`id`,
  `aria-describedby`, `aria-invalid` and `role="alert"` for you.
- Icon-only controls need an accessible name. `AppIconButton` requires `label` in its
  props type, so it cannot be omitted.
- Navigation renders as `<a>`/`<NuxtLink>`, never a div with a click handler. `AppButton`
  switches element by prop for this reason.
- One `<h1>` per page; do not skip heading levels.
- Mark the current item with `aria-current` (`page` in nav, `true` in the locale switcher).
- Focus must be visible. A single ring is defined in `main.css` — do not remove it.
- Never rely on colour alone. A badge's tone is decoration; its text carries the meaning.
- Loading state: a `role="status"` region around skeletons; skeletons themselves are
  `aria-hidden`.
- Error state: `role="alert"` so it is announced. `AppAlert` picks the role from its tone.
- Respect `prefers-reduced-motion` — handled globally in `main.css`.
- Set `alt` on meaningful images; use `alt=""` plus `aria-hidden` for decoration
  (`BrandLogo` does this when a name sits beside it).

---

## Form validation

- The **shared Zod schema** in `shared/schemas/` is the definition. Do not write a second
  set of rules in a component.
- Submit with `useAsyncAction`. Render `errorMessage` in an `AppAlert` and `fieldErrors`
  through `AppFormField`'s `error` prop.
- Server field errors arrive keyed by dot-path (`slug`, `links.0.url`) and as i18n keys.
- `novalidate` on the `<form>` — browser bubbles cannot be translated or styled, and the
  real validation is server-side anyway.
- Where immediate feedback matters (the login form), parse with the shared schema on the
  client too. Never *only* on the client.

---

## Loading, empty, error, success, disabled

One pattern each. Do not invent per-page variants.

| State | Pattern |
|---|---|
| Loading (first paint) | `AppSkeleton` inside a `role="status"` container, mirroring the real layout |
| Loading (action) | `:loading` on `AppButton` — disables the control and sets `aria-busy` |
| Empty | `AppEmptyState` with a title, an explanation and the next action |
| Error (action) | `AppAlert tone="danger"` with `useApiError`'s translated message |
| Error (page) | `throw createError({ statusCode, fatal: true })` → `app/error.vue` |
| Success | `AppAlert tone="success"` with a translated confirmation |
| Disabled | `disabled` prop; if the reason is not obvious, explain it in adjacent text |

Never show a bare spinner where the shape of the content is known — use a skeleton.
Never leave a failed action silent.

---

## Data fetching

- `useFetch` for page data (SSR + payload transfer). `$fetch` for user-triggered mutations.
- Give `useFetch` an explicit `key` when the URL is dynamic, and put every dependency in
  it — see `pages/[slug].vue`, whose key includes both slug and locale.
- Reactive `query` objects make the request re-run on change; use that instead of manual
  watchers.
- Filters belong in the URL query, not component state, so a filtered view is bookmarkable
  and survives a reload.
- Never call Supabase from a component. The one exception is `supabase.auth.*` on the login
  screen and in the admin layout's sign-out, which is the documented pattern.

---

## Before finishing frontend work

- `pnpm lint && pnpm typecheck && pnpm test`
- Viewed in **both** `/en` and `/ar`
- Checked at a phone width and a desktop width
- Tabbed through it with the keyboard; focus is visible and ordered
- No hardcoded strings, no raw colours, no physical-direction utilities
