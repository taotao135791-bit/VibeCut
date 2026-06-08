"""Creative pack management tools.

Lets external coding agents register new creative packs by writing TSX component
files to the frontend packs directory. The Vite dev server auto-discovers them
via import.meta.glob; for production exports, a re-bundle is triggered.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from app.tools.registry import registry

# Resolve the packs directory (relative to this file)
_THIS_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _THIS_DIR.parent  # apps/backend/app/tools -> apps/backend/app
_FRONTEND_PACKS_DIR = _BACKEND_DIR.parent.parent / "frontend" / "src" / "remotion" / "packs"


def _sanitize_name(name: str) -> str:
    """Ensure pack/component names are safe for filesystem use."""
    return re.sub(r"[^a-zA-Z0-9_-]", "", name)


@registry.register(
    name="register_creative_pack",
    description=(
        "Register a creative pack by writing TSX component files to the frontend. "
        "Each component must be a React FC conforming to PackComponentProps. "
        "After registration, the component is immediately available for use in "
        "effect clips via effect_params.component_type matching the component name. "
        "Use this when you want to create custom visual effects beyond the built-in set. "
        "\n\nWhen to use: creating novel visual components for promo/ad/creative work. "
        "When NOT to use: using existing built-in components (offer_stage, promo_top_bar, etc.)."
    ),
    parameters={
        "type": "OBJECT",
        "properties": {
            "pack_name": {
                "type": "STRING",
                "description": (
                    "Name of the creative pack (alphanumeric + hyphens/underscores). "
                    "Example: 'cyber-promo', 'minimal-brand', 'high-energy'"
                ),
            },
            "description": {
                "type": "STRING",
                "description": "Brief description of the pack's visual style and purpose.",
            },
            "components": {
                "type": "STRING",
                "description": (
                    "JSON array of components to register. Each element: "
                    '{\"name\": \"ComponentName\", \"code\": \"...TSX source code...\"}. '
                    "The code must export a named React FC with the same name. "
                    "Available props: { clip, frame, durationFrames, progress, isSSR }. "
                    "Import from 'remotion' for AbsoluteFill/Sequence, and from '../types' for PackComponentProps."
                ),
            },
        },
        "required": ["pack_name", "components"],
    },
)
async def register_creative_pack(args: dict, state) -> dict:
    pack_name = _sanitize_name(args.get("pack_name", ""))
    if not pack_name:
        return {"error": "pack_name is required and must contain alphanumeric characters"}

    description = args.get("description", "")

    raw_components = args.get("components", "[]")
    if isinstance(raw_components, str):
        try:
            components = json.loads(raw_components)
        except json.JSONDecodeError as exc:
            return {"error": f"Invalid components JSON: {exc}"}
    else:
        components = raw_components

    if not isinstance(components, list) or len(components) == 0:
        return {"error": "components must be a non-empty array"}

    pack_dir = _FRONTEND_PACKS_DIR / pack_name
    pack_dir.mkdir(parents=True, exist_ok=True)

    registered = []
    for comp in components:
        if not isinstance(comp, dict):
            return {"error": f"Each component must be an object, got: {type(comp).__name__}"}
        name = _sanitize_name(comp.get("name", ""))
        code = comp.get("code", "")
        if not name:
            return {"error": "Each component must have a non-empty 'name'"}
        if not code or not isinstance(code, str):
            return {"error": f"Component '{name}' must have non-empty 'code' string"}

        # Write the component file
        file_path = pack_dir / f"{name}.tsx"
        file_path.write_text(code, encoding="utf-8")
        registered.append(name)

    # Generate index.ts that exports all components
    index_lines = [
        f'export {{ {name} }} from "./{name}";'
        for name in registered
    ]
    # Also re-export any existing components in the pack that aren't being overwritten
    existing = set()
    for f in pack_dir.glob("*.tsx"):
        comp_name = f.stem
        if comp_name not in registered:
            existing.add(comp_name)
    for comp_name in sorted(existing):
        index_lines.append(f'export {{ {comp_name} }} from "./{comp_name}";')

    index_path = pack_dir / "index.ts"
    index_path.write_text("\n".join(index_lines) + "\n", encoding="utf-8")

    # Write manifest
    manifest = {
        "name": pack_name,
        "description": description,
        "components": sorted(set(registered) | existing),
    }
    manifest_path = pack_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    # Update registry.ts to add explicit import for this pack
    registry_path = _FRONTEND_PACKS_DIR / "registry.ts"
    if registry_path.exists():
        registry_content = registry_path.read_text(encoding="utf-8")
        import_line = f"import * as {pack_name.replace('-', '_')} from './{pack_name}/index';"
        registration_line = f"    this.registerPack('{pack_name}', {pack_name.replace('-', '_')} as Record<string, unknown>);"

        if import_line not in registry_content:
            registry_content = registry_content.replace(
                "// __PACK_IMPORTS__",
                f"{import_line}\n// __PACK_IMPORTS__"
            )
        if registration_line not in registry_content:
            registry_content = registry_content.replace(
                "// __PACK_REGISTRATIONS__",
                f"{registration_line}\n    // __PACK_REGISTRATIONS__"
            )
        registry_path.write_text(registry_content, encoding="utf-8")

    return {
        "success": True,
        "pack_name": pack_name,
        "pack_dir": str(pack_dir),
        "registered_components": registered,
        "total_components": len(set(registered) | existing),
        "usage_hint": (
            f"Use these components in effect clips by setting "
            f'effect_params.component_type to the component name (e.g. "{registered[0]}") '
            f'or the full path "{pack_name}/{registered[0]}".'
        ),
    }


@registry.register(
    name="list_creative_packs",
    description=(
        "List all available creative packs and their components. "
        "Use this to discover what visual components are available for timeline composition."
    ),
    parameters={
        "type": "OBJECT",
        "properties": {},
    },
)
async def list_creative_packs(args: dict, state) -> dict:
    packs = []
    if not _FRONTEND_PACKS_DIR.exists():
        return {"packs": []}

    for pack_dir in sorted(_FRONTEND_PACKS_DIR.iterdir()):
        if not pack_dir.is_dir() or pack_dir.name.startswith("."):
            continue
        manifest_path = pack_dir / "manifest.json"
        if manifest_path.exists():
            try:
                manifest = json.loads(manifest_path.read_text())
            except json.JSONDecodeError:
                manifest = {"name": pack_dir.name, "description": "", "components": []}
        else:
            # Infer from .tsx files
            components = [f.stem for f in pack_dir.glob("*.tsx")]
            manifest = {"name": pack_dir.name, "description": "No manifest", "components": components}

        packs.append(manifest)

    return {"packs": packs}
