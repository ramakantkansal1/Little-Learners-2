with open('adaptive_learning.py', 'r') as f:
    content = f.read()

# Fix 1: Change tier determination to check has_evidence first
old_block = '''        if overall_accuracy is not None:
            if overall_accuracy < 0.60:
                tier = "remediate"
                confidence = "high"
            elif overall_accuracy < 0.85:
                tier = "maintain"
                confidence = "medium"
            else:
                tier = "advance"
                confidence = "high"
        else:
            tier = "cold_start"
            confidence = "low"'''

new_block = '''        has_evidence = total_responses >= self.MIN_ATTEMPTS_FOR_SIGNAL
        if not has_evidence or overall_accuracy is None:
            tier = "cold_start"
            confidence = "low"
            mastery_score = None
        elif overall_accuracy < 0.60:
            tier = "remediate"
            confidence = "high"
        elif overall_accuracy < 0.85:
            tier = "maintain"
            confidence = "medium"
        else:
            tier = "advance"
            confidence = "high"'''

if old_block in content:
    content = content.replace(old_block, new_block, 1)
    print("Fixed tier determination")
else:
    print("OLD BLOCK NOT FOUND")
    # Debug: show what's around
    for i, line in enumerate(content.split('\\n')):
        if 'overall_accuracy is not None' in line:
            print(f'Found at line {i+1}: {line}')

with open('adaptive_learning.py', 'w') as f:
    f.write(content)
print('Done')
