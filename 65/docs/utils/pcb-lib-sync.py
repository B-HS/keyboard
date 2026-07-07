import os
import sys
import wx

_app = wx.App()
import pcbnew
from pcbnew import VECTOR2I

SIDE = sys.argv[1]
PRJ = f"/Volumes/SSD/Archive/65/pcb/{SIDE}/keyboard"
BOARD = f"{PRJ}/keyboard.kicad_pcb"

LIB_DIRS = {
    "Switch_Keyboard_Cherry_MX": f"{PRJ}/footprints/Switch_Keyboard_Cherry_MX.pretty",
    "Diode_THT": f"{PRJ}/footprints/Diode_THT.pretty",
    "MountingHole": f"{PRJ}/footprints/MountingHole.pretty",
    "Mounting_Keyboard_Stabilizer": f"{PRJ}/footprints/Mounting_Keyboard_Stabilizer.pretty",
    "ESP32-C3_SuperMini": f"{PRJ}/footprints/ESP32-C3_SuperMini.pretty",
    "Wire_Pads": f"{PRJ}/footprints/Wire_Pads.pretty",
}

board = pcbnew.LoadBoard(BOARD)
io = pcbnew.PCB_IO_KICAD_SEXPR()

seen = set()
saved = []
for fp in board.GetFootprints():
    fpid = fp.GetFPID()
    lib = fpid.GetUniStringLibNickname()
    name = fpid.GetUniStringLibItemName()
    if lib not in LIB_DIRS or name in seen:
        continue
    seen.add(name)
    dup = pcbnew.Cast_to_FOOTPRINT(fp.Duplicate(False))
    dup.SetPosition(VECTOR2I(0, 0))
    dup.SetOrientationDegrees(0)
    dup.SetReference("REF**")
    dup.Reference().SetVisible(True)
    for pad in dup.Pads():
        pad.SetNetCode(0)
    libdir = LIB_DIRS[lib]
    os.makedirs(libdir, exist_ok=True)
    io.FootprintSave(libdir, dup)
    saved.append(f"{lib}:{name}")

NICKS = ["Switch_Keyboard_Cherry_MX", "Diode_THT", "MountingHole", "Mounting_Keyboard_Stabilizer", "ESP32-C3_SuperMini", "Wire_Pads"]
rows = "".join(
    f'   (lib (name "{n}")(type "KiCad")(uri "${{KIPRJMOD}}/footprints/{n}.pretty")(options "")(descr ""))\n' for n in NICKS
)
with open(f"{PRJ}/fp-lib-table", "w") as f:
    f.write("(fp_lib_table\n   (version 7)\n" + rows + ")\n")

print(f"[{SIDE}] saved masters:", saved)

report = []
for fp in board.GetFootprints():
    fpid = fp.GetFPID()
    lib = fpid.GetUniStringLibNickname()
    name = fpid.GetUniStringLibItemName()
    if lib not in LIB_DIRS:
        continue
    master = io.FootprintLoad(LIB_DIRS[lib], name)
    if master is None:
        report.append((fp.GetReference(), "master missing"))
        continue
    bp = {p.GetNumber() or f"npth@{p.GetFPRelativePosition()}": p for p in fp.Pads()}
    mp = {p.GetNumber() or f"npth@{p.GetFPRelativePosition()}": p for p in master.Pads()}
    if len(bp) != len(mp):
        report.append((fp.GetReference(), "pad count", len(bp), len(mp)))
        continue
    for k, p in bp.items():
        m = mp.get(k)
        if m is None:
            report.append((fp.GetReference(), "pad key", k))
            continue
        same = (
            p.GetAttribute() == m.GetAttribute()
            and p.GetSize() == m.GetSize()
            and p.GetDrillSize() == m.GetDrillSize()
            and p.GetFPRelativePosition() == m.GetFPRelativePosition()
            and p.GetShape() == m.GetShape()
        )
        if not same:
            report.append((fp.GetReference(), "pad diff", k))
print(f"[{SIDE}] board vs lib-master diff:", report if report else "identical")
