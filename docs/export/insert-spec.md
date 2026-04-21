# Threaded Insert Specification (SLA variant)

## Files for JLC3DP order

| File | Role | Insert count |
|---|---|---|
| `1_case-top_SLA.stl` | Top case lid | **4** (on side walls) |
| `2_case-bottom_SLA.stl` | Bottom case + pillars | **4** (on pillar tops) |
| **Total** | | **8** |

See `insert-spec.svg` for top-view drawing with insert positions marked.

## Insert spec (JLC3DP dropdown)

- **Type**: **`M3*4*5`** (M3 brass, Ø4.0 OD × 5mm length)
- **Hole in STL**: **Ø3.6mm × depth 7mm** (0.4mm under-sized for heat-press interference fit, 2mm extra depth below insert)

## STL hole details (already modeled, verify with JLC's auto-check)

All 8 pockets share:
- **Ø 3.6 mm** (radius 1.8mm)
- **Depth 7 mm**

### Case-top — 4 pockets (open DOWNWARD, installed from case-bottom side)

| # | Position | Pocket axis |
|---|---|---|
| ① | Left wall, Y=50% | vertical (case Z) |
| ② | Right wall, Y=50% | vertical |
| ③ | Left wall, Y=75% | vertical |
| ④ | Right wall, Y=75% | vertical |

Pockets are inside 6×6×8mm bosses on inner wall faces.

### Case-bottom — 4 pockets (open UPWARD, installed from top of pillars)

| # | Position | Pocket axis |
|---|---|---|
| ⑤ | Back-left plate corner | tilted 8° (matches plate angle) |
| ⑥ | Back-right plate corner | tilted 8° |
| ⑦ | Front-left plate corner | tilted 8° |
| ⑧ | Front-right plate corner | tilted 8° |

Pockets are inside Ø6 × (10~21)mm tilted pillars rising from floor to plate bottom level.

## Order instructions

1. Upload both STL files to JLC3DP
2. Material: **SLA Resin** (recommend 9000HE or similar durable resin)
3. Surface finish: select **Threaded Insert**
4. From insert dropdown, select: **M3*4*5**
5. Quantity: **8** (JLC's auto-detect should find all 8 pockets; if asked, specify 4 per file)
6. Attach `insert-spec.svg` as reference (optional)

## Post-delivery

- Inserts pre-installed, ready to use
- Use with **M3×6 button head screws** (already on hand)
- No self-tapping, no heat-press needed on user side

## Companion PA12 SLS variant (self-tap)

`1_case-top.stl` and `2_case-bottom.stl` use Ø2.5 pilot holes for direct M3 self-tap in PA12 Nylon. No inserts required. Use these if ordering SLS instead of SLA.
