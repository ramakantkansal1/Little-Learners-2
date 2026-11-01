#!/usr/bin/env python3
"""
Validate migration graph - check for multiple heads and merge conflicts.
"""
import subprocess
import sys


def validate_migration_graph():
    """Validate migration graph for issues."""
    # Check for multiple heads
    result = subprocess.run(
        ['python', '-m', 'alembic', 'heads'],
        capture_output=True,
        text=True
    )
    print('Heads:', result.stdout.strip())
    if result.returncode != 0:
        print('Error checking heads:', result.stderr)
        return False
    
    heads = result.stdout.strip().split('\n')
    heads = [h for h in heads if h.strip()]  # Remove empty lines
    if len(heads) > 1:
        print('ERROR: Multiple heads detected!')
        for h in heads:
            print(f'  Head: {h}')
        return False
    print('Single head detected')

    # Check for merge conflicts in history
    result = subprocess.run(
        ['python', '-m', 'alembic', 'history', '--verbose'],
        capture_output=True,
        text=True
    )
    print('Migration history:')
    print(result.stdout)
    if result.returncode != 0:
        print('Error getting history:', result.stderr)
        return False
    
    if 'merge' in result.stdout.lower():
        print('WARNING: Merge revisions detected in history')
        # Not failing, just warning
    
    return True


if __name__ == '__main__':
    success = validate_migration_graph()
    sys.exit(0 if success else 1)