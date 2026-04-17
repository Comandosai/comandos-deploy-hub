# Live search для консультанта

## Live schema

Use confirmed `products_live` schema only:
- `entity_name`
- `sku`
- `category`
- `attributes_json`
- `price`
- `stock_qty`
- `status`
- `currency`
- `delivery_note`
- `updated_at`

Attributes live in `attributes_json`.

If the project brief/profile provides a more specific live schema contract than this reference, generated prompts must use the project contract as the source of truth.
This reference is a fallback, not permission to override project-specific field names.

Canonical category values:
- `wall_enclosures`
- `floor_cabinets`
- `mounting_panels`
- `cable_boxes`

Canonical attribute keys in `attributes_json`:
- `installation`
- `width_mm`
- `height_mm`
- `depth_mm`
- `material`
- `door_type`
- `lock`
- `coating`

Canonical attribute values:
- `installation`: `wall | floor`
- `material`: `cold_rolled_steel | galvanized_steel | stainless_steel`
- `door_type`: `solid | window`
- `lock`: `true | false`
- `coating`: `powder`

## Search modes

Use:
- `exact_match`
- `relaxed_match`
- `category_browse`
- `clarification`

## Product-memory pre-step

If the project brief/profile confirms a `product_memory` layer:
- use it before broad live relaxation;
- use it to infer the likely category, family, mount type, and nearby-size path;
- use it to decide which same-family alternatives should be checked first.

## Rules

- do not flatten `attributes_json`
- do not invent category values
- do not return fake matches
- if showing nearby options, mark them as nearby
