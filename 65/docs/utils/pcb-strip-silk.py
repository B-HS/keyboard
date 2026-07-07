import re, sys

path = sys.argv[1]
s = open(path).read()

def find_blocks(text, names):
    blocks = []
    for m in re.finditer(r'\((?:' + '|'.join(names) + r')[\s(]', text):
        start = m.start()
        depth = 0
        i = start
        in_str = False
        while i < len(text):
            c = text[i]
            if in_str:
                if c == '"' and text[i-1] != '\\':
                    in_str = False
            elif c == '"':
                in_str = True
            elif c == '(':
                depth += 1
            elif c == ')':
                depth -= 1
                if depth == 0:
                    blocks.append((start, i + 1))
                    break
            i += 1
    return blocks

SILK = re.compile(r'\(layer\s+"[FB]\.SilkS"\)')

shape_names = ['fp_line', 'fp_circle', 'fp_rect', 'fp_arc', 'fp_poly', 'fp_text', 'gr_line', 'gr_circle', 'gr_rect', 'gr_arc', 'gr_poly', 'gr_text']
removed = 0
out = []
last = 0
for start, end in find_blocks(s, shape_names):
    if start < last:
        continue
    block = s[start:end]
    if SILK.search(block):
        out.append(s[last:start])
        last = end
        removed += 1
out.append(s[last:])
s = ''.join(out)

hidden = 0
out = []
last = 0
for start, end in find_blocks(s, ['property']):
    if start < last:
        continue
    block = s[start:end]
    if SILK.search(block) and '(hide yes)' not in block:
        new = SILK.sub(lambda m: m.group(0) + '\n\t\t\t(hide yes)', block, count=1)
        out.append(s[last:start])
        out.append(new)
        last = end
        hidden += 1
out.append(s[last:])
s = ''.join(out)

open(path, 'w').write(s)
print(path.split('/')[-3], 'silk blocks removed', removed, 'properties hidden', hidden)
