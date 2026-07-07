import json
import sys
import wx
_app = wx.App()
import pcbnew
from pcbnew import VECTOR2I, FromMM

SIDE = sys.argv[1]
PRJ = f"/Volumes/SSD/Archive/65/pcb/{SIDE}/keyboard"
meta = json.load(open(f"/private/tmp/claude-501/-Volumes-SSD-Archive/76761be2-506c-47c0-b98b-d07d29c1e87a/scratchpad/wirepads-{SIDE}.json"))
N = meta["n"]
CENTER_X = {"left": 57.15, "right": 66.675}[SIDE]
Y = -12.0
start_x = CENTER_X - (N - 1) * 2.54 / 2

board = pcbnew.LoadBoard(f"{PRJ}/keyboard.kicad_pcb")
for old in [f for f in board.GetFootprints() if f.GetReference() == "J1"]:
    board.Remove(old)
io = pcbnew.PCB_IO_KICAD_SEXPR()
fp = io.FootprintLoad(f"{PRJ}/footprints/Wire_Pads.pretty", f"WirePads_1x{N}_P2.54")
fp.SetReference("J1")
fp.Reference().SetVisible(False)
fp.Value().SetVisible(False)
fp.SetPath(pcbnew.KIID_PATH(f"/{meta['sym_uuid']}"))
fp.thisown = 0
board.Add(fp)
fp.SetPosition(VECTOR2I(FromMM(start_x), FromMM(Y)))
netted = 0
for pad in fp.Pads():
    idx = int(pad.GetNumber()) - 1
    ni = board.FindNet(meta["nets"][idx])
    if ni is None:
        raise SystemExit("net missing " + meta["nets"][idx])
    pad.SetNet(ni)
    netted += 1
pcbnew.SaveBoard(f"{PRJ}/keyboard.kicad_pcb", board)
print(f"[{SIDE}] J1 1x{N} at y{Y}, x {start_x:.2f}..{start_x + (N - 1) * 2.54:.2f}, netted {netted}")
