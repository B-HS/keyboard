import json
import math
import re
import sys
import uuid

SIDE = sys.argv[1]
PATH = f"/Volumes/SSD/Archive/65/pcb/{SIDE}/keyboard/keyboard.kicad_sch"
COLS = 7 if SIDE == "left" else 8
N = COLS + 5
NETS = [f"COL{i}" for i in range(COLS)] + [f"ROW{i}" for i in range(5)]

s = open(PATH).read()
root_uuid = re.search(r'\(uuid "([^"]+)"\)', s).group(1)
project = re.search(r'\(project "([^"]+)"', s).group(1)
xs = [float(m.group(1)) for m in re.finditer(r'\(at ([-\d.]+) [-\d.]+ ?[-\d.]*\)', s)]
base_x = math.ceil((max(xs) + 60) / 2.54) * 2.54
base_y = 101.6

half = (N - 1) * 2.54 / 2
pins_txt = ""
pin_geom = {}
for i in range(N):
    py = half - i * 2.54
    pins_txt += f'(pin passive line (at -7.62 {py} 0) (length 2.54) (name "{NETS[i]}" (effects (font (size 1.27 1.27)))) (number "{i + 1}" (effects (font (size 1.27 1.27))))) '
    pin_geom[str(i + 1)] = (-7.62, py)

fpname = f"Wire_Pads:WirePads_1x{N}_P2.54"
lib_symbol = (
    f'(symbol "Wire_Pads:WirePads_1x{N}" (pin_names (offset 0.254)) (exclude_from_sim yes) (in_bom no) (on_board yes) '
    f'(property "Reference" "J" (at 0 {half + 2.54} 0) (effects (font (size 1.27 1.27)))) '
    f'(property "Value" "WirePads_1x{N}" (at 0 {-half - 2.54} 0) (effects (font (size 1.27 1.27)))) '
    f'(property "Footprint" "{fpname}" (at 0 0 0) (effects (font (size 1.27 1.27)) (hide yes))) '
    f'(property "Datasheet" "~" (at 0 0 0) (effects (font (size 1.27 1.27)) (hide yes))) '
    f'(property "Description" "Wire solder pads to off-board ESP32-C3 SuperMini" (at 0 0 0) (effects (font (size 1.27 1.27)) (hide yes))) '
    f'(symbol "WirePads_1x{N}_0_1" (rectangle (start -5.08 {half + 1.27}) (end 5.08 {-half - 1.27}) (stroke (width 0.254) (type default)) (fill (type background)))) '
    f'(symbol "WirePads_1x{N}_1_1" {pins_txt}) (embedded_fonts no))'
)

sym_uuid = str(uuid.uuid4())
pin_uuid_txt = "".join(f'(pin "{i + 1}" (uuid "{uuid.uuid4()}")) ' for i in range(N))
instance = (
    f'(symbol (lib_id "Wire_Pads:WirePads_1x{N}") (at {base_x} {base_y} 0) (unit 1) (exclude_from_sim yes) (in_bom no) (on_board yes) (dnp no) (uuid "{sym_uuid}") '
    f'(property "Reference" "J1" (at {base_x} {base_y - half - 5} 0) (effects (font (size 1.27 1.27)))) '
    f'(property "Value" "WirePads_1x{N}" (at {base_x} {base_y + half + 5} 0) (effects (font (size 1.27 1.27)))) '
    f'(property "Footprint" "{fpname}" (at {base_x} {base_y} 0) (effects (font (size 1.27 1.27)) (hide yes))) '
    f'(property "Datasheet" "~" (at {base_x} {base_y} 0) (effects (font (size 1.27 1.27)) (hide yes))) '
    f'{pin_uuid_txt}'
    f'(instances (project "{project}" (path "/{root_uuid}" (reference "J1") (unit 1)))))'
)

labels = []
for i in range(N):
    px, py = pin_geom[str(i + 1)]
    wx = base_x + px
    wy = base_y - py
    labels.append(
        f'(global_label "{NETS[i]}" (shape input) (at {wx} {wy} 180) (effects (font (size 1.27 1.27)) (justify right)) (uuid "{uuid.uuid4()}"))'
    )

i = s.find('(lib_symbols')
depth = 0
j = i
in_str = False
while j < len(s):
    c = s[j]
    if in_str:
        if c == '"' and s[j - 1] != '\\':
            in_str = False
    elif c == '"':
        in_str = True
    elif c == '(':
        depth += 1
    elif c == ')':
        depth -= 1
        if depth == 0:
            break
    j += 1
s = s[:j] + '\n' + lib_symbol + '\n' + s[j:]

k = s.rfind(')')
s = s[:k] + '\n' + instance + '\n' + '\n'.join(labels) + '\n' + s[k:]
open(PATH, 'w').write(s)
json.dump({"sym_uuid": sym_uuid, "n": N, "nets": NETS}, open(f"/private/tmp/claude-501/-Volumes-SSD-Archive/76761be2-506c-47c0-b98b-d07d29c1e87a/scratchpad/wirepads-{SIDE}.json", "w"))
print(f"[{SIDE}] J1 1x{N} added at ({base_x},{base_y})")
