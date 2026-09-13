# Salon OS — platform operator console

The console **you** run, not the salons. It onboards a salon, sets what their plan
allows, records that they paid you, and suspends them when they don't. It is a separate
Next.js app from the salon-facing frontend, on a separate port, behind separate
credentials — a platform operator is not a salon user and cannot be one.

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind.

---

## Running it

```bash
cp .env.example .env.local     # point API_URL at the backend
npm install
npm run dev                    # http://localhost:3001
```

| Variable | What it is |
| --- | --- |
| `API_URL` | Backend base URL, server-side only — e.g. `http://localhost:4000/api/v1` |

Sign in with a row from the backend's `platform_users` table; the seed script creates
one. These are **not** tenant users — they authenticate against `/auth/platform/login`
and receive a token with no `tenantId` in it.

```bash
npm run typecheck
npm run build
```

---

## Why it looks different

The sidebar is deliberately dark (`stone-900`) while the salon app is light. You should
never be one glance away from thinking you are inside a customer's own app while
holding a token that can see every salon on the platform.

---

## What it does

**Overview** (`/`) — how many salons, how they break down by status, total branches and
customers, and the gross transaction value flowing through the platform.

**Salons** (`/tenants`) — search and filter by status; each row opens the salon.

**Onboard a salon** (`/tenants/new`) — one form, one backend transaction. It creates the
tenant, its first branch, the owner's login and (optionally) a starter catalogue of
service categories, GST rates, appointment statuses and message templates, so the salon
does not open an empty app on day one. On success the screen turns into a **handover
card**: the owner's email, the starting password, and their booking URL, with a copy
button. The password is not shown again — it is hashed the moment it reaches the API.

The GST **state code** on this form matters: it is what decides whether that salon's
invoices split tax as CGST/SGST or charge IGST.

**Salon detail** (`/tenants/[id]`) — the salon's particulars, counts, current
subscription, and the two actions that matter:

- **Change status.** `TRIAL` → `ACTIVE` → `PAST_DUE` → `SUSPENDED` → `CANCELLED`.
  Suspension bites immediately: the API drops its cached identities, so staff are
  refused on their very next request rather than at the end of their session. Their
  data is kept.
- **Record payment.** Money reaches you off-platform — bank transfer, UPI, cheque. This
  records what you received and for how many months, sets the salon to `ACTIVE`, and
  extends the period end date.

**Plans** (`/plans`) — create and edit plans and the limits they carry (branches,
staff, customers, messages per month). These are enforced by the API, not by the UI: a
salon on a one-branch plan gets a 4xx when it tries to create a second branch. A plan's
`code` is a stable key other records point at, so it cannot be edited after creation —
retire the plan instead, which hides it from onboarding while leaving existing salons on
their current limits.

---

## There is no payment gateway — anywhere

Not in the salon app, and not here. This console never charges a card and never talks to
a payment provider. "Record payment" is exactly what it says: you were paid somewhere
else, and you are writing that down so the subscription clock moves. The same principle
runs through the salon-facing product, where staff record what was taken at the counter.

---

## Security notes

- Same token discipline as the frontend: the platform token lives in an **httpOnly
  cookie** (`sos_pat`), and `src/app/api/proxy/[...path]/route.ts` is the only path from
  the browser to the API. The browser never sees a token.
- Unlike the salon app, there is **no refresh token here**. The session lasts 8 hours
  and then asks for the password again. An operator console that can see every salon on
  the platform should not stay open indefinitely on an unattended laptop;
  `src/middleware.ts` bounces to `/login` the moment the cookie is gone.
- The API accepts an `X-Tenant-Id` header from a platform token, which is how this
  console can look inside a salon when it must. That header is only ever set
  server-side, and every such request is audited by the backend.
- A platform token carries no `tenantId`, so the backend's tenant-isolation extension
  has nothing to inject; the platform routes explicitly opt out via `runUnscoped`. This
  is the only place in the system where that happens, and it is worth keeping that way.

---

## Layout

```
src/
  app/
    (console)/
      page.tsx            overview
      tenants/            list · detail + actions · new (provisioning)
      plans/              plan cards + create/edit
    login/
    api/auth|proxy/       the only server routes
  components/
    ui/                   the same primitives as the frontend
    layout/console-shell  dark sidebar
  lib/                    api, client, session, types, format
```
