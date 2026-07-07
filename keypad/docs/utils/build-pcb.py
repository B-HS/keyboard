import json
import math

import pcbnew

PCB = "/Users/hyunseokbyun/Downloads/split-65/keypad/pcb/keyboard/keyboard.kicad_pcb"
LAYOUT = "/tmp/keypad_layout.json"
FPLIB = "/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints/Diode_THT.pretty"
DIODE_FP = "D_DO-35_SOD27_P7.62mm_Horizontal"

FromMM = pcbnew.FromMM
ToMM = pcbnew.ToMM


def V(x, y):
    return pcbnew.VECTOR2I(FromMM(x), FromMM(y))


lay = json.load(open(LAYOUT))
board = pcbnew.LoadBoard(PCB)

# ====================================================================
# 1. Edge.Cuts 외곽 (rounded rect R1). KiCad 좌표(SW1=원점, Y=-문서Y)
#    caseOutline(문서좌표)에서 유도 — config/layout.js SSOT
# ====================================================================
co = lay["caseOutline"]
xmin = co["cx"] - co["w"] / 2
xmax = co["cx"] + co["w"] / 2
ymin = -(co["cy"] + co["h"] / 2)
ymax = -(co["cy"] - co["h"] / 2)
R = 1.0
EDGE_W = FromMM(0.1)
k = R * math.sqrt(0.5)


def add_seg(x1, y1, x2, y2):
    s = pcbnew.PCB_SHAPE(board)
    s.SetShape(pcbnew.SHAPE_T_SEGMENT)
    s.SetStart(V(x1, y1))
    s.SetEnd(V(x2, y2))
    s.SetLayer(pcbnew.Edge_Cuts)
    s.SetWidth(EDGE_W)
    board.Add(s)


def add_arc(sx, sy, mx, my, ex, ey):
    s = pcbnew.PCB_SHAPE(board)
    s.SetShape(pcbnew.SHAPE_T_ARC)
    s.SetArcGeometry(V(sx, sy), V(mx, my), V(ex, ey))
    s.SetLayer(pcbnew.Edge_Cuts)
    s.SetWidth(EDGE_W)
    board.Add(s)


add_seg(xmin + R, ymin, xmax - R, ymin)  # top
add_seg(xmax, ymin + R, xmax, ymax - R)  # right
add_seg(xmax - R, ymax, xmin + R, ymax)  # bottom
add_seg(xmin, ymax - R, xmin, ymin + R)  # left
add_arc(xmax - R, ymin, (xmax - R) + k, (ymin + R) - k, xmax, ymin + R)  # TR
add_arc(xmax, ymax - R, (xmax - R) + k, (ymax - R) + k, xmax - R, ymax)  # BR
add_arc(xmin + R, ymax, (xmin + R) - k, (ymax - R) + k, xmin, ymax - R)  # BL
add_arc(xmin, ymin + R, (xmin + R) - k, (ymin + R) - k, xmin + R, ymin)  # TL
print("[1] Edge.Cuts: 4 seg + 4 arc 추가")

# ====================================================================
# 2. M2 마운트홀 6개 (Ø2.4 NPTH) + 키프아웃 Ø5 (양면 구리, rule area)
# ====================================================================
HOLES = [("H%d" % i, m["x"], -m["y"]) for i, m in enumerate(lay["mountHoles"], 1)]
HOLE_D = 2.4
KEEPOUT_D = 5.0


def add_mount(ref, x, y):
    fp = pcbnew.FOOTPRINT(board)
    fp.SetReference(ref)
    pad = pcbnew.PAD(fp)
    pad.SetAttribute(pcbnew.PAD_ATTRIB_NPTH)
    pad.SetShape(pcbnew.PAD_SHAPE_CIRCLE)
    pad.SetSize(V(HOLE_D, HOLE_D))
    pad.SetDrillSize(V(HOLE_D, HOLE_D))
    pad.SetLayerSet(pad.UnplatedHoleMask())
    fp.Add(pad)
    board.Add(fp)
    fp.SetPosition(V(x, y))


def add_keepout(x, y, d):
    z = pcbnew.ZONE(board)
    ls = pcbnew.LSET()
    ls.AddLayer(pcbnew.F_Cu)
    ls.AddLayer(pcbnew.B_Cu)
    z.SetLayerSet(ls)
    z.SetIsRuleArea(True)
    z.SetDoNotAllowTracks(True)
    z.SetDoNotAllowVias(True)
    z.SetDoNotAllowZoneFills(True)
    z.SetDoNotAllowPads(False)
    z.SetDoNotAllowFootprints(False)
    out = z.Outline()
    out.NewOutline()
    r = d / 2.0
    n = 48
    for i in range(n):
        a = 2 * math.pi * i / n
        out.Append(FromMM(x + r * math.cos(a)), FromMM(y + r * math.sin(a)))
    board.Add(z)


for ref, x, y in HOLES:
    add_mount(ref, x, y)
    add_keepout(x, y, KEEPOUT_D)
print("[2] M2 홀 6개(Ø2.4 NPTH) + 키프아웃 Ø5 추가")

# ====================================================================
# 3. 다이오드: D_SOD-123 → 1N4148 DO-35 THT (net 유지 + anode 고정 + ROW 트랙 끝점 이동)
# ====================================================================
TOL = FromMM(0.01)


def near(p, x_nm, y_nm):
    return abs(p.x - x_nm) <= TOL and abs(p.y - y_nm) <= TOL


diodes = [f for f in board.GetFootprints() if f.GetReference().startswith("D")]
old = {}
for f in diodes:
    rec = {
        "origin": (f.GetPosition().x, f.GetPosition().y),
        "orient": f.GetOrientationDegrees(),
        "flipped": f.IsFlipped(),
        "pads": {},
    }
    for pad in f.Pads():
        rec["pads"][pad.GetNumber()] = {
            "net": pad.GetNetname(),
            "x": pad.GetPosition().x,
            "y": pad.GetPosition().y,
        }
    old[f.GetReference()] = rec
    board.Remove(f)

tracks = list(board.GetTracks())
moved = 0
for ref, info in old.items():
    fp = pcbnew.FootprintLoad(FPLIB, DIODE_FP)
    fp.SetReference(ref)
    fp.SetValue("1N4148")
    board.Add(fp)
    ox, oy = info["origin"]
    fp.SetPosition(pcbnew.VECTOR2I(ox, oy))
    if info["flipped"]:
        fp.Flip(pcbnew.VECTOR2I(ox, oy), pcbnew.FLIP_DIRECTION_TOP_BOTTOM)
    fp.SetOrientationDegrees(info["orient"])
    # anode(pad2)를 기존 anode 위치에 고정 → 스위치로 가는 anode 트랙 보존
    pad2 = fp.FindPadByNumber("2")
    n2 = pad2.GetPosition()
    dx = info["pads"]["2"]["x"] - n2.x
    dy = info["pads"]["2"]["y"] - n2.y
    cur = fp.GetPosition()
    fp.SetPosition(pcbnew.VECTOR2I(cur.x + dx, cur.y + dy))
    # net 할당 (pad 번호로 극성 유지)
    for num in ("1", "2"):
        pad = fp.FindPadByNumber(num)
        net = board.FindNet(info["pads"][num]["net"])
        if net:
            pad.SetNet(net)
    # pad1(ROW)만 트랙 끝점 이동 (pad2 anode는 고정이라 트랙 불변)
    pad1 = fp.FindPadByNumber("1")
    n1x, n1y = pad1.GetPosition().x, pad1.GetPosition().y
    o1x, o1y = info["pads"]["1"]["x"], info["pads"]["1"]["y"]
    net1 = board.FindNet(info["pads"]["1"]["net"])
    nc1 = net1.GetNetCode() if net1 else None
    for t in tracks:
        if nc1 is not None and t.GetNetCode() != nc1:
            continue
        if near(t.GetStart(), o1x, o1y):
            t.SetStart(pcbnew.VECTOR2I(n1x, n1y))
            moved += 1
        if near(t.GetEnd(), o1x, o1y):
            t.SetEnd(pcbnew.VECTOR2I(n1x, n1y))
            moved += 1
print(f"[3] 다이오드 {len(old)}개 D0-35 교체(anode 고정), ROW 트랙 끝점 {moved}개 이동")

board.Save(PCB)
print("저장 완료:", PCB)
