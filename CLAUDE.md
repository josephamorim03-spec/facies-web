# Frontend Rules

## Scope
- This directory is the Next.js 16 / React 19 web app.
- Keep UI changes consistent with existing App Router, Tailwind, and local component patterns.
- Do not change backend contracts from the frontend. If an API shape must change, update backend schemas, clients, tests, and contract docs together.
- Prefer small client components, hooks, and domain API helpers over giant page components.

## Security
- Never expose secrets in the browser. `NEXT_PUBLIC_*` is public by definition.
- Do not store access tokens, refresh tokens, API keys, reset tokens, or privileged IDs in `localStorage`, `sessionStorage`, query strings, logs, analytics, or client-visible JSON.
- Preserve the BFF/session model from `docs/core-contracts.md`: browser auth uses the Next BFF and `agendar_session` HttpOnly cookie.
- Mutating BFF requests must keep same-origin `Origin`/`Referer` checks and `X-KrosMed-CSRF: 1`.
- Do not leak `access_token` responses to the browser after the BFF sets the session cookie.
- Avoid `dangerouslySetInnerHTML` and raw `innerHTML`. If unavoidable, sanitize input and document why.
- Treat uploaded files, PDFs, images, medical content, and user identifiers as private.

## Architecture
- Use `src/lib/api` domain helpers for API access instead of duplicating fetch logic in pages.
- Keep route handlers in `src/app/api` focused on BFF/proxy behavior: auth/session/CSRF, request forwarding, response redaction.
- Keep page files thin. Move reusable UI to components and stateful workflow logic to hooks.
- Prefer explicit TypeScript types from `src/types` or local domain files over `any` and implicit JSON shapes.
- Keep local storage keys centralized in `src/lib/storage-keys.ts` when adding durable browser state.

## UX And Maintainability
- Build the actual workflow screen first, not marketing or explanatory filler.
- Keep controls accessible, keyboard-usable, and resilient on mobile and desktop.
- Avoid text overlap, layout shift, oversized panels inside panels, and one-off styling when existing components fit.
- Do not add visible instructional text for implementation details or shortcuts unless the product flow truly needs it.
- When a page/component grows large, split by behavior: data hook, view component, small presentational pieces.

## Performance
- Avoid client fetch waterfalls. Prefer parallel fetches, server-side data where appropriate, and cached helpers when safe.
- Avoid re-render storms from broad state objects, unstable callbacks, and derived state stored redundantly.
- Keep expensive transforms memoized only when there is a real cost and dependencies are clear.
- Use bounded lists, pagination, virtualization, or incremental rendering for large collections.

## Validation
Run only what is relevant, but prefer:
- `npm.cmd --prefix web run lint`
- `npm.cmd --prefix web run typecheck`
- `npm.cmd --prefix web run build` for broad UI/API changes
- `npm.cmd --prefix web run test:e2e:smoke` when auth, navigation, import, review, or critical flows change

## Review Checklist
- No secrets or tokens in client-visible code, storage, logs, URL params, or `NEXT_PUBLIC_*`.
- BFF response redaction and CSRF behavior preserved.
- API client types match backend schemas.
- Components are split enough to test and maintain.
- Loading, empty, error, disabled, and optimistic states are handled where users can trigger them.
