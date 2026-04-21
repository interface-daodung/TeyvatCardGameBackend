---
name: attached-animation-metadata
overview: Add `type`, `frameRate`, and `frameTotal` to attached assets with conditional animation metadata, including server validation/persistence and admin input support.
todos:
  - id: server-attached-schema
    content: Extend server attached interface/schema with type + animation fields and conditional rules
    status: completed
  - id: server-validator-export
    content: Update Zod validator and export normalization with legacy type inference
    status: completed
  - id: admin-types
    content: Extend admin AttachedImage type and propagate typing to consumers
    status: completed
  - id: admin-attached-panel
    content: Add type selector and conditional frame inputs in AttachedPanel with auto-infer logic
    status: completed
  - id: verify-paths
    content: Verify character/adventure/item flows and edge-case payload behavior
    status: completed
isProject: false
---

# Add Attached Metadata Fields

## Scope Chosen
Implement on both server and admin UI:
- `type`: one of `SE | image | animation`
- `frameRate`, `frameTotal`: only meaningful when `type = animation`
- Legacy entries (missing `type`) are inferred from path:
  - `/assets/images/animations/` => `animation`
  - `/assets/sounds/SE/` => `SE`
  - otherwise => `image`

## Server Changes
- Update attached type/schema in [server/src/types/attached.ts](server/src/types/attached.ts):
  - Extend `IAttached` with `type`, optional `frameRate`, optional `frameTotal`.
  - Add enum constraint for `type` in `AttachedSchema`.
  - Add validation rule in schema: when `type !== 'animation'`, strip/ignore `frameRate` and `frameTotal`.
- Update payload validation in [server/src/validators/gameData.ts](server/src/validators/gameData.ts):
  - Extend `attachedPayloadSchema` to validate `type` enum.
  - Add conditional refinement: animation requires positive integer `frameRate` and `frameTotal`; non-animation forbids them.
- Keep export format consistent in [server/src/utils/exportServerConfigToTeyvatData.ts](server/src/utils/exportServerConfigToTeyvatData.ts):
  - Extend `normalizeAttached()` to include `type`, `frameRate`, `frameTotal`.
  - Add legacy inference function based on path for missing `type`.
  - For non-animation outputs, omit `frameRate`/`frameTotal`.
- Re-export type if needed in [server/src/types/index.ts](server/src/types/index.ts) (likely no structural change, but verify compile).

## Admin UI Changes
- Extend client attached type in [admin-web/src/services/gameDataService.ts](admin-web/src/services/gameDataService.ts):
  - Add `type: 'SE' | 'image' | 'animation'` and optional `frameRate`, `frameTotal` to `AttachedImage`.
- Update attached editor UI in [admin-web/src/components/share/AttachedPanel.tsx](admin-web/src/components/share/AttachedPanel.tsx):
  - Add `type` selector for each attached row.
  - Show `frameRate` and `frameTotal` numeric inputs only when `type = animation`.
  - Auto-fill inferred `type` when selecting an asset path (animations/SE/image).
  - Clear animation-only fields when switching type away from `animation`.
  - Keep existing animation-preview behavior independent from metadata fields.
- Verify callsites that pass `attached` arrays remain type-safe:
  - [admin-web/src/components/characters/CharacterDetailView.tsx](admin-web/src/components/characters/CharacterDetailView.tsx)
  - [admin-web/src/components/adventureCards/AdventureCardDetailDrawer.tsx](admin-web/src/components/adventureCards/AdventureCardDetailDrawer.tsx)
  - [admin-web/src/components/equipment/EquipmentEditDrawer.tsx](admin-web/src/components/equipment/EquipmentEditDrawer.tsx)

## Behavior Rules
- `type = animation`:
  - require `frameRate > 0`, `frameTotal > 0` (integers).
- `type = image` or `SE`:
  - `frameRate` and `frameTotal` are removed/ignored.
- Legacy records:
  - infer `type` at read/export path so old data remains usable without manual migration.

## Verification
- Server:
  - Create/update character/adventure/item with each `type` and confirm schema/validator behavior.
  - Confirm invalid payloads are rejected (missing animation fields, non-animation with frame fields).
- Admin:
  - Confirm form shows/hides fields correctly by `type`.
  - Confirm selecting `/images/animations/*` auto-sets `animation`; `/sounds/SE/*` auto-sets `SE`.
  - Confirm save payload includes fields only when valid and expected.