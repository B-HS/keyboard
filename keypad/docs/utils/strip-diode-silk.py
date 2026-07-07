import pcbnew

P = "/Users/hyunseokbyun/Downloads/split-65/keypad/pcb/keyboard/keyboard.kicad_pcb"
b = pcbnew.LoadBoard(P)
n = 0
for f in b.GetFootprints():
    ref = f.GetReference()
    if ref.startswith("D") and not ref.startswith("H"):
        for g in list(f.GraphicalItems()):
            g.DeleteStructure()
        try:
            for fld in list(f.GetFields()):
                fld.SetVisible(False)
        except Exception:
            for getter in (f.Reference, f.Value):
                try:
                    getter().SetVisible(False)
                except Exception:
                    pass
        n += 1
b.Save(P)
print("외형 제거하고 구멍만 남긴 다이오드:", n)
