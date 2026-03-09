#!/usr/bin/env python3
"""
Centralized environment variable resolver.

Resolves env vars from a hierarchy of .env files, supporting both
development repo structure (skills/hd-*/...env) and installed structure
(.claude/skills/*/...env).

Priority order (highest to lowest):
1. Runtime environment variables (os.environ)
2. Skill-specific .env (skills/hd-<skill>/.env or .claude/skills/<skill>/.env)
3. Shared skills .env (skills/.env or .claude/skills/.env)
4. Project root .env (.env)
5. User skill-specific ~/.claude/skills/<skill>/.env
6. User shared ~/.claude/skills/.env
7. User global ~/.claude/.env
"""

import os
import sys
from pathlib import Path
from typing import Optional

try:
    from dotenv import load_dotenv, dotenv_values

    _DOTENV_AVAILABLE = True
except ImportError:
    _DOTENV_AVAILABLE = False


def _find_project_root() -> Path:
    """Find project root by looking for .git or .claude directory."""
    # Start from skills/common/ → skills/ → project root
    current = Path(__file__).parent.parent.parent
    for parent in [current] + list(current.parents):
        if (parent / ".git").exists() or (parent / ".claude").exists():
            return parent
    return current


def resolve_env(var_name: str, skill: Optional[str] = None, verbose: bool = False) -> Optional[str]:
    """Resolve an environment variable from a hierarchy of .env files.

    Args:
        var_name: Environment variable name (e.g., "GEMINI_API_KEY")
        skill: Skill name for skill-specific .env lookup (e.g., "look_at", "painter")
        verbose: Print resolution details

    Returns:
        Resolved value or None
    """
    # Priority 1: Runtime environment
    val = os.getenv(var_name)
    if val:
        if verbose:
            print(f"  Found {var_name} in runtime environment", file=sys.stderr)
        return val

    if not _DOTENV_AVAILABLE:
        if verbose:
            print(f"  python-dotenv not available, skipping .env files", file=sys.stderr)
        return None

    project_root = _find_project_root()
    home = Path.home()

    # Map skill names to directory names
    # "look_at" → "hd-look-at", "painter" → "hd-painter"
    skill_dir_name = None
    if skill:
        skill_kebab = skill.replace("_", "-")
        skill_dir_name = f"hd-{skill_kebab}" if not skill_kebab.startswith("hd-") else skill_kebab

    # Build .env search paths (highest to lowest priority)
    env_paths = []

    if skill_dir_name:
        # Priority 2: Skill-specific .env (dev repo structure)
        env_paths.append(project_root / "skills" / skill_dir_name / ".env")
        # Also check .claude/skills/ structure (installed)
        env_paths.append(project_root / ".claude" / "skills" / skill_dir_name / ".env")

    # Priority 3: Shared skills .env
    env_paths.append(project_root / "skills" / ".env")
    env_paths.append(project_root / ".claude" / "skills" / ".env")

    # Priority 4: Project root .env
    env_paths.append(project_root / ".env")

    if skill_dir_name:
        # Priority 5: User skill-specific
        env_paths.append(home / ".claude" / "skills" / skill_dir_name / ".env")

    # Priority 6: User shared
    env_paths.append(home / ".claude" / "skills" / ".env")

    # Priority 7: User global
    env_paths.append(home / ".claude" / ".env")

    for env_path in env_paths:
        if env_path.exists():
            if verbose:
                print(f"  Checking {env_path}...", file=sys.stderr)
            values = dotenv_values(env_path)
            if var_name in values and values[var_name]:
                if verbose:
                    print(f"  Found {var_name} in {env_path}", file=sys.stderr)
                return values[var_name]

    if verbose:
        print(f"  {var_name} not found in any .env file", file=sys.stderr)
    return None


def main():
    """CLI for debugging env resolution."""
    import argparse

    parser = argparse.ArgumentParser(description="Resolve environment variables from .env hierarchy")
    parser.add_argument("var_name", nargs="?", help="Variable name to resolve")
    parser.add_argument("--skill", help="Skill name (e.g., look_at, painter)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show resolution details")
    parser.add_argument("--show-hierarchy", action="store_true", help="Show .env search hierarchy")

    args = parser.parse_args()

    if args.show_hierarchy:
        project_root = _find_project_root()
        home = Path.home()
        skill = args.skill or "<skill>"
        skill_kebab = skill.replace("_", "-")
        skill_dir = f"hd-{skill_kebab}" if not skill_kebab.startswith("hd-") else skill_kebab

        print(f"Project root: {project_root}")
        print(f"\n.env search hierarchy (highest → lowest):")
        print(f"  1. Runtime environment (os.environ)")
        print(f"  2. {project_root}/skills/{skill_dir}/.env")
        print(f"  3. {project_root}/.claude/skills/{skill_dir}/.env")
        print(f"  4. {project_root}/skills/.env")
        print(f"  5. {project_root}/.claude/skills/.env")
        print(f"  6. {project_root}/.env")
        print(f"  7. {home}/.claude/skills/{skill_dir}/.env")
        print(f"  8. {home}/.claude/skills/.env")
        print(f"  9. {home}/.claude/.env")
        return

    if not args.var_name:
        parser.error("var_name required (or use --show-hierarchy)")

    val = resolve_env(args.var_name, skill=args.skill, verbose=args.verbose)
    if val:
        masked = val[:8] + "..." + val[-4:] if len(val) > 16 else val[:4] + "..."
        print(f"{args.var_name}={masked}")
    else:
        print(f"{args.var_name} not found")
        sys.exit(1)


if __name__ == "__main__":
    main()
