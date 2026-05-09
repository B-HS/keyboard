#!/usr/bin/env python3
"""
49 키보드 매트릭스 자동 라우팅 (KiCad 9 pcbnew API).

전략:
- ROW0~3: B.Cu, 가로. 같은 row 의 다이오드 cathode pad 들을 x 좌표 정렬 후 인접쌍 직선.
- COL0~13: F.Cu, 세로. 같은 col 의 스위치 col-side smd pad 들을 y 정렬 후 인접쌍 직선.
  - 핫스왑 smd pad 가 B.Cu only 라 F.Cu 트레이스 ↔ pad 연결 위해 stitching via 자동 추가.
- Net-(D{N}-A): B.Cu, 다이오드 anode ↔ 스위치 col-side pad 짧은 link.

KiCad 9 의 native python (pcbnew API) 으로 좌표 변환 자동 처리.

실행:
  /Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/Current/bin/python3 \\
      scripts/route_matrix.py

idempotent 아님. 재실행 전 백업으로 PCB 복원 권장.
"""
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

try:
    import pcbnew
except ImportError:
    sys.exit(
        "pcbnew 모듈 없음. KiCad 의 python 으로 실행:\n"
        "/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/"
        "Versions/Current/bin/python3 scripts/route_matrix.py"
    )

REPO = Path(__file__).resolve().parents[1]
PCB = REPO / 'keyboard' / 'keyboard.kicad_pcb'

TRACE_W_MM = 0.25
POWER_W_MM = 0.4
VIA_DIAM_MM = 0.6
VIA_DRILL_MM = 0.3

ROW_NAMES = [f'ROW{i}' for i in range(4)]
COL_NAMES = [f'COL{i}' for i in range(14)]
DA_NET_RE = re.compile(r'^Net-\(D\d+-A\)$')

ROW_LAYER = pcbnew.B_Cu
COL_LAYER = pcbnew.F_Cu
DA_LAYER = pcbnew.B_Cu
NON_MATRIX_LAYER = pcbnew.F_Cu

# (net_name, width_mm). GND 제외 (zone 으로 처리). SWDIO/SWCLK 는 핀 1개라 스킵됨.
NON_MATRIX_NETS = [
    ('VBUS',       POWER_W_MM),
    ('+3V3',       POWER_W_MM),
    ('NRST',       TRACE_W_MM),
    ('BOOT0',      TRACE_W_MM),
    ('CC1',        TRACE_W_MM),
    ('CC2',        TRACE_W_MM),
    ('USB_DM',     TRACE_W_MM),
    ('USB_DP',     TRACE_W_MM),
    ('USB_DM_RAW', TRACE_W_MM),
    ('USB_DP_RAW', TRACE_W_MM),
]


def collect_pads(board):
    """{net_name: [{ref, num, x, y, layers}]} 수집. 좌표는 mm."""
    by_net: dict[str, list[dict]] = {}
    for fp in board.GetFootprints():
        for pad in fp.Pads():
            net_name = pad.GetNetname()
            if not net_name:
                continue
            pos = pad.GetCenter()
            by_net.setdefault(net_name, []).append({
                'ref': fp.GetReference(),
                'num': pad.GetNumber(),
                'x': pcbnew.ToMM(pos.x),
                'y': pcbnew.ToMM(pos.y),
                'fp_lib_id': fp.GetFPID().GetLibItemName().wx_str(),
            })
    return by_net


def add_track(board, net_obj, x1, y1, x2, y2, layer, width_iu):
    if abs(x1 - x2) < 1e-6 and abs(y1 - y2) < 1e-6:
        return None
    t = pcbnew.PCB_TRACK(board)
    t.SetStart(pcbnew.VECTOR2I_MM(x1, y1))
    t.SetEnd(pcbnew.VECTOR2I_MM(x2, y2))
    t.SetLayer(layer)
    t.SetWidth(width_iu)
    t.SetNet(net_obj)
    board.Add(t)
    return t


def add_via(board, net_obj, x, y, diam_iu, drill_iu):
    v = pcbnew.PCB_VIA(board)
    v.SetPosition(pcbnew.VECTOR2I_MM(x, y))
    v.SetWidth(diam_iu)
    v.SetDrill(drill_iu)
    v.SetNet(net_obj)
    board.Add(v)
    return v


def mst_edges(pads):
    """Prim's MST. 같은 net 의 pad 들을 최소 길이로 연결하는 N-1 개 edge 반환."""
    if len(pads) < 2:
        return []
    in_tree = [pads[0]]
    out = list(pads[1:])
    edges = []
    while out:
        best = None
        for a in in_tree:
            for b in out:
                d = (a['x'] - b['x']) ** 2 + (a['y'] - b['y']) ** 2
                if best is None or d < best[0]:
                    best = (d, a, b)
        _, a, b = best
        edges.append((a, b))
        in_tree.append(b)
        out.remove(b)
    return edges


def main():
    if not PCB.exists():
        sys.exit(f"Not found: {PCB}")

    # 백업
    backup_dir = PCB.parent / 'keyboard-backups'
    backup_dir.mkdir(exist_ok=True)
    ts = datetime.now().strftime('%Y%m%d-%H%M%S')
    backup = backup_dir / f'keyboard-{ts}-pre-route.kicad_pcb'
    shutil.copy2(PCB, backup)
    print(f'Backup: {backup.name}')

    board = pcbnew.LoadBoard(str(PCB))

    # 기존 트랙/비아 모두 제거 (idempotent 보장).
    removed_tracks = 0
    removed_vias = 0
    for item in list(board.GetTracks()):
        if isinstance(item, pcbnew.PCB_VIA):
            board.RemoveNative(item)
            removed_vias += 1
        elif isinstance(item, pcbnew.PCB_TRACK):
            board.RemoveNative(item)
            removed_tracks += 1
    print(f'Cleared: {removed_tracks} tracks, {removed_vias} vias')

    pads_by_net = collect_pads(board)

    width_iu = pcbnew.FromMM(TRACE_W_MM)
    via_diam_iu = pcbnew.FromMM(VIA_DIAM_MM)
    via_drill_iu = pcbnew.FromMM(VIA_DRILL_MM)

    n_tracks = 0
    n_vias = 0

    # 1) ROW: B.Cu, 가로. x 정렬 후 인접쌍 직선
    for net_name in ROW_NAMES:
        if net_name not in pads_by_net:
            print(f'  ! {net_name}: no pads')
            continue
        net_obj = board.FindNet(net_name)
        pads = sorted(pads_by_net[net_name], key=lambda p: p['x'])
        for a, b in zip(pads, pads[1:]):
            if add_track(board, net_obj, a['x'], a['y'], b['x'], b['y'],
                         ROW_LAYER, width_iu):
                n_tracks += 1
        print(f'  + {net_name}: {len(pads)} pads → {len(pads) - 1} tracks (B.Cu)')

    # 2) COL: F.Cu, 세로. y 정렬. 핫스왑 smd 는 B.Cu only 라 stitching via 추가.
    for net_name in COL_NAMES:
        if net_name not in pads_by_net:
            print(f'  ! {net_name}: no pads')
            continue
        net_obj = board.FindNet(net_name)
        pads = sorted(pads_by_net[net_name], key=lambda p: p['y'])
        # 핫스왑 pad (B.Cu only) 위에 via 추가 → F.Cu 와 연결
        for p in pads:
            if 'Hotswap' in p['fp_lib_id']:
                add_via(board, net_obj, p['x'], p['y'],
                        via_diam_iu, via_drill_iu)
                n_vias += 1
        for a, b in zip(pads, pads[1:]):
            if add_track(board, net_obj, a['x'], a['y'], b['x'], b['y'],
                         COL_LAYER, width_iu):
                n_tracks += 1
        print(f'  + {net_name}: {len(pads)} pads → {len(pads) - 1} tracks (F.Cu)')

    # 3) Net-(D{N}-A): B.Cu, 다이오드 ↔ 스위치 짧은 link
    da_count = 0
    for net_name, pads in pads_by_net.items():
        if not DA_NET_RE.match(net_name):
            continue
        if len(pads) != 2:
            continue
        net_obj = board.FindNet(net_name)
        a, b = pads
        if add_track(board, net_obj, a['x'], a['y'], b['x'], b['y'],
                     DA_LAYER, width_iu):
            n_tracks += 1
            da_count += 1
    print(f'  + D-A links: {da_count} tracks (B.Cu)')

    # 4) 비매트릭스 net 러프 라우팅: F.Cu, MST. 겹침 허용 (수동 정리 전제).
    for net_name, w_mm in NON_MATRIX_NETS:
        if net_name not in pads_by_net:
            print(f'  ! {net_name}: no pads (skip)')
            continue
        net_obj = board.FindNet(net_name)
        pads = pads_by_net[net_name]
        if len(pads) < 2:
            print(f'  ! {net_name}: only {len(pads)} pad (skip)')
            continue
        edges = mst_edges(pads)
        w_iu = pcbnew.FromMM(w_mm)
        added = 0
        for a, b in edges:
            if add_track(board, net_obj, a['x'], a['y'], b['x'], b['y'],
                         NON_MATRIX_LAYER, w_iu):
                n_tracks += 1
                added += 1
        print(f'  + {net_name}: {len(pads)} pads → {added} tracks '
              f'(F.Cu, {w_mm}mm)')

    board.Save(str(PCB))
    print(f'\nSaved: {PCB.relative_to(REPO)}')
    print(f'Tracks added: {n_tracks}')
    print(f'Vias added: {n_vias}')


if __name__ == '__main__':
    main()
