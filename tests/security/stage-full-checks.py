"""Parent-side source snapshot; never copies credentials or installs dependencies."""
import os
import pathlib
import subprocess
import sys

repo, destination = map(pathlib.Path, sys.argv[1:])
paths = subprocess.check_output(['git', '-C', str(repo), 'ls-files', '-z', '-c', '--others', '--exclude-standard']).decode().split('\0')
paths += ['apps/web/next-env.d.ts']
for relative in paths:
    if not relative:
        continue
    rel = pathlib.PurePosixPath(relative)
    if rel.is_absolute() or '..' in rel.parts:
        raise ValueError('Source path escaped repository')
    if any(part.startswith('.env') or part in {'.git', '.codex', '.aws', 'node_modules'} for part in rel.parts):
        continue
    if rel.suffix.lower() in {'.pem', '.key'}:
        continue
    source, target = repo / relative, destination / relative
    if not source.is_file() or source.is_symlink() or target.exists():
        continue
    target.parent.mkdir(parents=True, exist_ok=True)
    os.link(source, target)  # Container mounts this snapshot read-only.
