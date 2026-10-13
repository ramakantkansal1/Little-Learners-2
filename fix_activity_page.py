with open('frontend/src/pages/student/ActivityPage.tsx', 'r') as f:
    lines = f.readlines()

# Find lines with "options: q.options.map(o => ({"
# and add type annotation to the callback parameter
for i, line in enumerate(lines):
    if 'options: q.options.map(o => ({' in line:
        indent = line[:len(line) - len(line.lstrip())]
        lines[i] = indent + 'options: q.options.map((o: { id: number; text: string; text_audio_url: string | null; image_url: string | null; display_order: number; is_correct?: boolean }) => ({\n'
        print(f"Fixed line {i+1}")

with open('frontend/src/pages/student/ActivityPage.tsx', 'w') as f:
    f.writelines(lines)

print("Done!")