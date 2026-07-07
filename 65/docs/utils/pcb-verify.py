import sys
import wx
_app = wx.App()
import pcbnew
from pcbnew import ToMM

side = sys.argv[1]
board = pcbnew.LoadBoard(f"/Volumes/SSD/Archive/65/pcb/{side}/keyboard/keyboard.kicad_pcb")

edge = board.GetBoardEdgesBoundingBox()
print(f"[{side}] edge bbox {ToMM(edge.GetWidth()):.2f} x {ToMM(edge.GetHeight()):.2f} @ ({ToMM(edge.GetX()):.3f},{ToMM(edge.GetY()):.3f})")

mounts, diodes, sw = [], [], []
for fp in board.GetFootprints():
    name = fp.GetFPID().GetUniStringLibItemName()
    if name.startswith("MountingHole"):
        p = fp.GetPosition()
        d = next(iter(fp.Pads())).GetDrillSize()
        mounts.append((round(ToMM(p.x), 3), round(ToMM(p.y), 3), round(ToMM(d.x), 2)))
    elif name.startswith("D_DO-35"):
        diodes.append(fp)
    elif name.startswith("SW_Cherry_MX"):
        sw.append(fp)
print(f"[{side}] mounts({len(mounts)}):", sorted(mounts))

bad = []
for d in diodes:
    pads = {p.GetNumber(): p for p in d.Pads()}
    if not pads["1"].GetNetname().startswith("ROW"): bad.append((d.GetReference(), "cathode", pads["1"].GetNetname()))
    if not pads["2"].GetNetname().startswith("Net-(D"): bad.append((d.GetReference(), "anode", pads["2"].GetNetname()))
    for p in pads.values():
        if round(ToMM(p.GetDrillSize().x), 2) != 0.8: bad.append((d.GetReference(), "drill", ToMM(p.GetDrillSize().x)))
print(f"[{side}] diodes {len(diodes)} bad {bad if bad else 0}")

hsbad = []
for f in sw:
    smd = [p for p in f.Pads() if p.GetAttribute() == pcbnew.PAD_ATTRIB_SMD]
    npth = [p for p in f.Pads() if p.GetAttribute() == pcbnew.PAD_ATTRIB_NPTH]
    if len(smd) != 2: hsbad.append((f.GetReference(), "smd", len(smd)))
    nets = sorted(p.GetNetname() for p in smd)
    if not any(n.startswith("COL") for n in nets) or not any(n.startswith("Net-(D") for n in nets):
        hsbad.append((f.GetReference(), "nets", nets))
    if len([p for p in npth if round(ToMM(p.GetDrillSize().x), 2) == 3.05]) != 2:
        hsbad.append((f.GetReference(), "barrel", [round(ToMM(p.GetDrillSize().x),2) for p in npth]))
    if not all(p.IsOnLayer(pcbnew.B_Cu) for p in smd): hsbad.append((f.GetReference(), "layer"))
print(f"[{side}] switches {len(sw)} hotswap-bad {hsbad if hsbad else 0}")
print(f"[{side}] tracks remaining: {len(list(board.GetTracks()))}")
