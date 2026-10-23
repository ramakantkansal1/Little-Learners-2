with open('adaptive_learning.py', 'r') as f:
    lines = f.readlines()

# Fix line 139 (index 138): replace '        responses = attempt.responses or []\n'
# with proper separate query for responses
old = '        responses = attempt.responses or []\n'
new = '''        responses_result = await self.db.execute(
            select(ActivityResponse).where(ActivityResponse.attempt_id == attempt.id)
        )
        responses = responses_result.scalars().all()
'''

if old in content:
    content = content.replace(old, new, 1)
    with open('adaptive_learning.py', 'w') as f:
        f.write(content)
    print('Fixed responses loading')
else:
    print('Could not find old text')
    # Debug: show what's around line 139
    for i, line in enumerate(lines[137:142], start=138):
        print(f'{i}: {repr(line)}')
PYEOF
