from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

SOURCES = [
    "bootstrap.js",
    "chaos_dwarfs_payload_loader.js",
    "wood_elves_loader.js",
    "dwarf_payload_loader.js",
    "dogs_of_war_loader.js",
    "lizardmen_loader.js",
    "kislev_loader.js",
    "norse_loader.js",
    "slann_empire_loader.js",
    "app.js",
    "global_release_rules.js",
    "army_extensions.js",
    "army_extensions_vampire_fix.js",
    "vampire_champion_fixes.js",
    "chaos_state_guard.js",
    "dwarf_extensions.js",
    "dwarf_validation_patch.js",
    "armour_save_fixes.js",
    "orc_special_character_fixes.js",
    "orc_shaman_fixes.js",
    "orc_magic_item_filter.js",
    "bretonnia_extensions.js",
    "skaven_extensions.js",
    "skaven_variable_units.js",
    "chaos_extensions.js",
    "chaos_final_fixes.js",
    "common_magic_item_effects.js",
    "undead_magic_banners.js",
    "chaos_abomination.js",
    "chaos_abomination_mount_guard.js",
    "chaos_dwarfs_extensions.js",
    "chaos_dwarfs_final_fixes.js",
    "halflings_loader.js",
    "ogre_mercenaries_loader.js",
    "halflings_extensions.js",
    "halflings_final_fixes.js",
    "dark_elves_loader.js",
    "dark_elves_extensions.js",
    "dark_elves_final_fixes.js",
    "wood_elves_extensions.js",
    "wood_elves_final_fixes.js",
    "dogs_of_war_extensions.js",
    "dogs_of_war_dwarf_runes.js",
    "dogs_of_war_final_fixes.js",
    "dogs_of_war_magic_guard.js",
    "lizardmen_extensions.js",
    "lizardmen_final_fixes.js",
    "ogre_mercenaries_extensions.js",
    "ogre_mercenaries_final_fixes.js",
    "ogre_mercenaries_guard.js",
    "kislev_extensions.js",
    "norse_extensions.js",
    "norse_final_fixes.js",
    "norse_guard.js",
    "slann_empire_extensions.js",
    "slann_empire_final_fixes.js",
    "global_consistency_fixes.js",
    "special_character_magic_fixes.js",
    "special_character_mount_fixes.js",
    "tomb_kings_champion_fix.js",
    "roster_interactions.js",
    "unit_model_count.js",
    "unit_scrollbar.js",
    "roster_pad_sort.js",
    "roster_pad_layout_fix.js",
    "swarm_unit_fixes.js",
    "vampire_wraith_steed_fix.js",
    "army_loading.js",
    "global_zero_one.js",
    "dev_runtime_loader.js",
    "campaign.js",
]

missing = [name for name in SOURCES if not (ROOT / name).exists()]
if missing:
    raise SystemExit(f"Missing bundle source files: {', '.join(missing)}")

parts = [
    "// GENERATED FILE - DO NOT EDIT DIRECTLY.\n",
    "// Built by tools/build_dev_bundle.py. Source file boundaries and order are preserved below.\n",
]
for name in SOURCES:
    source = (ROOT / name).read_text(encoding="utf-8")
    parts.append(f"\n/* ===== BEGIN {name} ===== */\n")
    parts.append(source)
    if not source.endswith("\n"):
        parts.append("\n")
    parts.append(";\n")
    parts.append(f"/* ===== END {name} ===== */\n")

(ROOT / "dev_bundle.js").write_text("".join(parts), encoding="utf-8")

index_path = ROOT / "index.html"
index = index_path.read_text(encoding="utf-8")
index = re.sub(r'<script\s+src="[^"]+"\s*></script>', '', index)
index = index.replace("</body>", '<script src="dev_bundle.js?v=2"></script>\n</body>')
index_path.write_text(index, encoding="utf-8")

print(f"Built dev_bundle.js from {len(SOURCES)} source files")
