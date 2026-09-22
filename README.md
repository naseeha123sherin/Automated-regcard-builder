# REG CARD AUTOMATOR

An engineer-controlled hotel registration-card workspace. Upload PDF/PNG/JPEG, analyze with an optional backend provider or transcribe manually, review mappings and terms, reconstruct layout, edit canonical JSON, simulate the Mirror guest journey, validate and download real RDL and three JSON files.

## Quick start

Requires Node.js 22+ and pnpm. From this directory:

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env
pnpm dev
```

Open http://127.0.0.1:5173. Express runs on http://127.0.0.1:3001; Vite proxies `/api`. The application works in manual mode without credentials.

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm start
```

Production Express serves `dist/client`. Run commands from this project root, not the generated directory. By default Express binds loopback; put it behind an authenticated TLS reverse proxy for shared deployment. Configure the bind address deliberately before exposing it remotely.

### Restricted Windows hosts

Some managed hosts prohibit Node child-process spawning. Vite/Vitest cannot run normally there. This project includes a native compiler path that uses the same production modules, bundles both runtimes, stages Monaco/PDF workers and runs 21 in-process Node tests:

```powershell
.\scripts\build-portable.ps1
node generated/server.js
```

Open http://127.0.0.1:3001. This is a real compiled application, not a mockup. Standard Tailwind compilation runs through Vite; the portable build uses the explicitly authored workspace CSS. The native tests cover business invariants; the Vitest suite provides the normal development runner. Neither replaces end-to-end provider testing or Report Builder acceptance.

## Structure

```text
frontend/        React views, Monaco editors, Mirror and RDL approximations
backend/         Express API, Worker API, swappable analysis providers
shared/          Canonical model, templates, mapping, RDL/JSON generation, validation
reference/       Original supplied JSON files (unchanged)
generated/       Compiled local server and native verification bundle (ignored)
tests/           Vitest business tests and in-process Node verification
scripts/         Portable build/staging and mechanical formatting
dist/            Compiled client and Cloudflare-compatible server (ignored)
```

## Architecture and data contracts

`RegistrationCardProject` is represented by the validated `Project` type in `shared/model.ts`. It contains source metadata, normalized layout elements, property confidence/review state, logo, mappings, three configurations, orientation, RDL constants and separate preview sample values. All generators and previews derive from that model. The provider returns structured data; it never writes RDL.

`ReferenceTemplateService` loads and clones the three original JSON structures. Unknown reference properties are preserved through passthrough schemas and deep cloning. The reference RDL informed the namespace/data-source conventions but is not blindly copied, so unrelated datasets, machine paths and guest values cannot leak into generated reports.

Template system identifiers are authoritative. Analysis proposes mappings only to loaded reference fields. Source `field_label` text, including Arabic and other multilingual labels, stays distinct from `field_name`. Low confidence never becomes confirmed. Unknown fields require Ignore, Map or an explicit human Add action; advanced JSON editing can deliberately insert/remove fields. The dropdown reads the template rather than a duplicated system-field list. Alias matching is deterministic; the optional vision provider also supplies semantic document understanding. Automatic results always require review.

New projects keep reference structure but clear inherited legal text, reference property and brand text. Check-in terms must be transcribed or extracted from the current document and confirmed by an engineer. Exact wording, punctuation and paragraph breaks are kept; no summarization occurs. Source-upload replacement clears the prior extraction/review state. Checkout property is replaced with the current project property. Advanced checkout text remains engineer-editable.

## AI configuration

Environment variables (server-only; never use a `VITE_` prefix for secrets):

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANALYSIS_PROVIDER` | `none` | `none` for manual work, `openai` for remote vision/PDF analysis |
| `OPENAI_API_KEY` | empty | Server-side provider credential |
| `OPENAI_MODEL` | `gpt-4.1` | Configurable model that supports the Responses PDF/image inputs |
| `MAX_UPLOAD_MB` | `10` | Maximum upload size, capped at 10 MB |
| `PORT` | `3001` | Express port |

The provider abstraction is `DocumentAnalysisProvider.analyzeRegistrationCard`. Responses are runtime-validated before project mutation. Missing credentials, refusal/incomplete response, malformed JSON, schema errors, API failures and timeouts do not fabricate success. Uploaded PDF/image inputs go to the configured provider only when Analyze is clicked; configure credentials and privacy approval before using real guest documents. Provider requests set `store:false`, which does not by itself guarantee zero provider retention; verify your account's data controls. No external analysis call was made during local verification.

Provider implementation follows [OpenAI file inputs](https://developers.openai.com/api/docs/guides/file-inputs) and [image inputs](https://developers.openai.com/api/docs/guides/images-vision).

## RDL architecture

The generator emits genuine [Microsoft RDL 2016 ReportSections](https://learn.microsoft.com/en-us/openspecs/sql_server_protocols/ms-rdl/96c3d25f-d8ce-4fe4-ab03-592edaa4a1da) XML. Paper is 19in × 24in, with 0.5in margins and an 18in × 23in printable area. Normalized element coordinates convert deterministically into inches. Static text uses Textboxes, values use expression Textboxes, lines and borders use Line/Rectangle elements, and logos use embedded Images with `FitProportional`.

DataSet1 has FieldName and FieldValue. Every dynamic textbox uses:

```text
=Lookup("roomNumber", Fields!FieldName.Value, Fields!FieldValue.Value, "DataSet1")
```

The local `System.Data.DataSet` connection follows the supplied RDL's integration convention. To execute the report in a standalone SSRS deployment, connect a real query that returns those two columns or supply the dataset through your Mirror/.NET report host. This application produces a definition, not a hotel database connection.

The validator parses the final XML and checks root/namespace, dimensions, dataset/fields, syntax, system-field validity, dynamic Lookup multiplicity, placeholder rejection and required logo. It does not merely inspect React state. Expected counts come from actual dynamic elements. Final export is disabled if XML, JSON or review gates fail.

## Editing and previews

Three Monaco editors support syntax highlighting, line diagnostics, formatting, validation, draft reset, undo, Apply and draft download. Only Apply changes the shared project; adjacent preview shows applied values. Draft downloads are intentionally separate from reviewed final exports. JSON validators report locations, missing required field properties, duplicate identifiers and unsupported types.

The RDL view is a model-based layout approximation, **not the Microsoft report rendering engine**. It includes source/generated comparison, overlay, zoom/fit, opt-in bounds and a normalized layout editor. No debug boxes appear by default. The Mirror frame reads rows, field types, enabled and mandatory flags. Editable sample values are isolated from production JSON. Done checks mandatory inputs, Terms leads to signature, a canvas signature confirms checkout, and both orientations apply across screens. Preview signatures are not saved or exported and are not legal e-signatures.

## Persistence and downloads

Use Save/Load on this device, opt-in auto-save and export/import `project.json`. Raw source documents stay in browser memory only and must be uploaded again after refresh. Local/export saves reset sample values to avoid persisting entered guest details. Configurations, layout text and terms may still contain sensitive content: use a trusted device and inspect project exports. Logo base64 is part of project state. Final ZIP contains exactly the RDL and the three generated JSON files. Names use a sanitized confirmed property prefix; empty names fall back to unprefixed filenames.

## Deployment

### Vercel

This repository also includes `vercel.json` and four `/api` functions for a Vite deployment. Import the GitHub repository into Vercel using the repository root; the configured build writes the website to `dist/client`. Keep the repository private and enable Vercel Authentication for **All Deployments** before handling any guest documents. Set `ANALYSIS_PROVIDER=none` unless you deliberately configure a server-side `OPENAI_API_KEY` and approve sending documents to that provider. Do not use a `VITE_` prefix for secrets.

Vercel Functions have a 4.5 MB request-body limit, so optional server-side PDF/vision analysis accepts about 3 MB of original file content after base64 encoding. Local PDF analysis and the RDL/JSON editing workflow remain client-side. Test the deployed endpoints and a complete download flow before using the Vercel deployment operationally.

The Worker entrypoint is `backend/worker.ts`, compiled to `dist/server/index.js`, exporting `fetch(request, env)`. Static assets are `dist/client`, and `ASSETS` is the asset binding. The same API/generation services back Express and Worker deployments. Sites packages the compiled worker/assets with `.openai/hosting.json`. Keep the site owner-private for hotel engineering work. Configure hosted secrets separately; local `.env` is never published.

For another Cloudflare deployment configure its asset binding and Workers entrypoint, set `ANALYSIS_PROVIDER`/`OPENAI_MODEL` as variables and `OPENAI_API_KEY` as a secret. Never expose a credentialed analysis API publicly without authentication, rate limiting and budget controls. Express has Helmet and API rate limiting; the hosted private Worker relies on platform access controls. Add durable per-account quota controls before sharing broadly.

## Security and limitations

- Uploads have MIME, signature and size checks; PDF.js/image decoding catches invalid local documents. Backend checks content signatures but is not an antivirus scanner. No uploads are written to disk. No guest extraction values are logged.
- The uploaded document is authoritative. Reference screenshots are visual examples from different properties, not legal source text for another hotel.
- AI analysis is implemented but requires credentials and has not been tested against a live provider here. OCR, text boundaries, source logo identification and font estimates require human inspection.
- Source comparison previews the first PDF page only. Multi-page report reconstruction, embedded font fidelity and automatic matching of arbitrary complex tables are not guaranteed.
- Registration and terms previews cover the supplied types plus checkboxes; unfamiliar types are flagged. Layout text can overflow fixed bounds and must be checked in Report Builder.
- No Report Builder executable validation or full RDL XSD validation was performed. Test generated definitions in your target Report Builder/Mirror host before production use.
- WebMCP validation exposes a read-only validation tool when the browser supports it. This feature is optional and shares the same state as the visible UI.

## Verification checklist

Run typecheck, lint, normal Vitest (or native Windows path) and build. Review a PDF and JPEG upload, bilingual label acceptance, unknown-field Ignore/Add, editor application, mandatory input handling, terms/signature/checkout flow, portrait/landscape, save/load/import/export, and ZIP contents. Open final RDL in Report Builder, supply DataSet1 and compare printed output before operational deployment.
