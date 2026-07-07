import sys
import wx
_app = wx.App()
import pcbnew
from pcbnew import VECTOR2I, FromMM

SIDE = sys.argv[1]
import os
PATH = os.environ.get("PCB_PATH") or f"/Volumes/SSD/Archive/65/pcb/{SIDE}/keyboard/keyboard.kicad_pcb"

OUTLINE = {
    "left": {"cx": 57.150, "cy": 38.100, "w": 146.35, "h": 108.25},
    "right": {"cx": 66.675, "cy": 38.100, "w": 165.40, "h": 108.25},
}[SIDE]
MOUNT_X = {"left": (-12.025, 126.325), "right": (-12.025, 145.375)}[SIDE]
MOUNT_HOLES = [(x, y) for y in (-12.025, 88.225, 38.100) for x in MOUNT_X]

R = 1.0
DIODE_OFFSET = (0.89, -4.0)
DIODE_PITCH = 7.62
DIODE_PAD = 1.6
DIODE_DRILL = 0.8
SOCKET_BARREL = 3.05
HS_PADS = [("1", -7.035, -2.54), ("2", 5.765, -5.08)]
HS_PAD_SIZE = (2.9, 2.5)
MOUNT_DRILL = 5.4
KEEPOUT_SILK_D = 7.0

board = pcbnew.LoadBoard(PATH)


def mm(v):
    return FromMM(v)


def vec(x, y):
    return VECTOR2I(mm(x), mm(y))


switches = {}
diodes = []
for fp in board.GetFootprints():
    fpid = fp.GetFPID().GetUniStringLibItemName()
    if fpid.startswith("SW_Cherry_MX"):
        switches[fp.GetReference()] = fp
    elif fpid == "D_SOD-123":
        diodes.append(fp)

anode_to_switch = {}
for ref, fp in switches.items():
    for pad in fp.Pads():
        net = pad.GetNetname()
        if net.startswith("Net-(D") and net.endswith("-A)"):
            anode_to_switch[net] = fp

assert len(anode_to_switch) == len(switches), (len(anode_to_switch), len(switches))

made = 0
for d in diodes:
    nets = {}
    for pad in d.Pads():
        nets[pad.GetNumber()] = pad.GetNet()
    cathode_net = nets["1"]
    anode_net = nets["2"]
    assert cathode_net.GetNetname().startswith("ROW"), cathode_net.GetNetname()
    assert anode_net.GetNetname() in anode_to_switch, anode_net.GetNetname()
    sw = anode_to_switch[anode_net.GetNetname()]
    swp = sw.GetPosition()
    ref = d.GetReference()

    board.Remove(d)

    nfp = pcbnew.FOOTPRINT(board)
    nfp.SetReference(ref)
    nfp.SetValue("1N4148")
    nfp.Reference().SetVisible(False)
    nfp.Value().SetVisible(False)
    nfp.SetFPID(pcbnew.LIB_ID("Diode_THT", "D_DO-35_SOD27_P7.62mm_Horizontal"))
    nfp.thisown = 0
    board.Add(nfp)
    nfp.SetPosition(VECTOR2I(swp.x + mm(DIODE_OFFSET[0]), swp.y + mm(DIODE_OFFSET[1])))

    for num, lx, net in (("1", 0.0, cathode_net), ("2", DIODE_PITCH, anode_net)):
        pad = pcbnew.PAD(nfp)
        pad.SetNumber(num)
        pad.SetAttribute(pcbnew.PAD_ATTRIB_PTH)
        pad.SetShape(pcbnew.PAD_SHAPE_CIRCLE)
        pad.SetSize(vec(DIODE_PAD, DIODE_PAD))
        pad.SetDrillSize(vec(DIODE_DRILL, DIODE_DRILL))
        pad.SetLayerSet(pcbnew.PAD.PTHMask())
        pad.thisown = 0
        nfp.Add(pad)
        pad.SetFPRelativePosition(vec(lx, 0))
        pad.SetNet(net)
    nfp.SetOrientationDegrees(180)
    made += 1

_smd_front = pcbnew.PAD.SMDMask()
_smd_back = _smd_front.FlipStandardLayers()
hs = 0
for ref, fp in switches.items():
    pin_nets = {}
    for pad in fp.Pads():
        if pad.GetNumber() in ("1", "2") and pad.GetAttribute() == pcbnew.PAD_ATTRIB_PTH:
            pin_nets[pad.GetNumber()] = pad.GetNet()
            pad.SetAttribute(pcbnew.PAD_ATTRIB_NPTH)
            pad.SetShape(pcbnew.PAD_SHAPE_CIRCLE)
            pad.SetSize(vec(SOCKET_BARREL, SOCKET_BARREL))
            pad.SetDrillSize(vec(SOCKET_BARREL, SOCKET_BARREL))
            pad.SetLayerSet(pcbnew.PAD.UnplatedHoleMask())
            pad.SetNetCode(0)
            pad.SetNumber("")
    assert len(pin_nets) == 2, (ref, pin_nets)
    for num, lx, ly in HS_PADS:
        pad = pcbnew.PAD(fp)
        pad.SetNumber(num)
        pad.SetAttribute(pcbnew.PAD_ATTRIB_SMD)
        pad.SetShape(pcbnew.PAD_SHAPE_RECT)
        pad.SetSize(vec(*HS_PAD_SIZE))
        pad.SetLayerSet(_smd_back)
        pad.thisown = 0
        fp.Add(pad)
        pad.SetFPRelativePosition(vec(lx, ly))
        pad.SetOrientationDegrees(fp.GetOrientationDegrees())
        pad.SetNet(pin_nets[num])
    hs += 1

for dr in list(board.GetDrawings()):
    if dr.GetLayer() == pcbnew.Edge_Cuts:
        board.Remove(dr)

cx, cy, w, h = OUTLINE["cx"], OUTLINE["cy"], OUTLINE["w"], OUTLINE["h"]
x0, x1 = cx - w / 2, cx + w / 2
y0, y1 = cy - h / 2, cy + h / 2


def add_line(ax, ay, bx, by):
    seg = pcbnew.PCB_SHAPE(board, pcbnew.SHAPE_T_SEGMENT)
    seg.SetStart(vec(ax, ay))
    seg.SetEnd(vec(bx, by))
    seg.SetLayer(pcbnew.Edge_Cuts)
    seg.SetWidth(mm(0.1))
    seg.thisown = 0
    board.Add(seg)


def add_arc(sx, sy, mx, my, ex, ey):
    arc = pcbnew.PCB_SHAPE(board, pcbnew.SHAPE_T_ARC)
    arc.SetArcGeometry(vec(sx, sy), vec(mx, my), vec(ex, ey))
    arc.SetLayer(pcbnew.Edge_Cuts)
    arc.SetWidth(mm(0.1))
    arc.thisown = 0
    board.Add(arc)


k = R * (1 - 0.7071067811865476)
add_line(x0 + R, y0, x1 - R, y0)
add_line(x1, y0 + R, x1, y1 - R)
add_line(x1 - R, y1, x0 + R, y1)
add_line(x0, y1 - R, x0, y0 + R)
add_arc(x0, y0 + R, x0 + k, y0 + k, x0 + R, y0)
add_arc(x1 - R, y0, x1 - k, y0 + k, x1, y0 + R)
add_arc(x1, y1 - R, x1 - k, y1 - k, x1 - R, y1)
add_arc(x0 + R, y1, x0 + k, y1 - k, x0, y1 - R)

for i, (hx, hy) in enumerate(MOUNT_HOLES, start=1):
    mfp = pcbnew.FOOTPRINT(board)
    mfp.SetReference(f"H{i}")
    mfp.SetValue("MountHole_5.4_NPTH")
    mfp.Reference().SetVisible(False)
    mfp.Value().SetVisible(False)
    mfp.SetFPID(pcbnew.LIB_ID("MountingHole", "MountingHole_5.4mm_NPTH"))
    mfp.SetAttributes(pcbnew.FP_EXCLUDE_FROM_BOM | pcbnew.FP_EXCLUDE_FROM_POS_FILES)
    mfp.thisown = 0
    board.Add(mfp)
    mfp.SetPosition(vec(hx, hy))
    pad = pcbnew.PAD(mfp)
    pad.SetNumber("")
    pad.SetAttribute(pcbnew.PAD_ATTRIB_NPTH)
    pad.SetShape(pcbnew.PAD_SHAPE_CIRCLE)
    pad.SetSize(vec(MOUNT_DRILL, MOUNT_DRILL))
    pad.SetDrillSize(vec(MOUNT_DRILL, MOUNT_DRILL))
    pad.SetLayerSet(pcbnew.PAD.UnplatedHoleMask())
    pad.thisown = 0
    mfp.Add(pad)
    pad.SetFPRelativePosition(vec(0, 0))
    for layer in (pcbnew.F_SilkS, pcbnew.B_SilkS):
        circ = pcbnew.PCB_SHAPE(mfp, pcbnew.SHAPE_T_CIRCLE)
        circ.SetCenter(vec(hx, hy))
        circ.SetEnd(vec(hx + KEEPOUT_SILK_D / 2, hy))
        circ.SetLayer(layer)
        circ.SetWidth(mm(0.15))
        circ.thisown = 0
        mfp.Add(circ)

stripped = list(board.GetTracks())
for _t in stripped:
    board.Remove(_t)

pcbnew.SaveBoard(PATH, board)
print(f"{SIDE}: diodes→DO-35 {made}, hotswap {hs}, edge replaced, mount holes {len(MOUNT_HOLES)}, tracks stripped {len(stripped)}")
