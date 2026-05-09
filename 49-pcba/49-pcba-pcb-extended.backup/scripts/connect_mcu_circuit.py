#!/usr/bin/env python3
"""
49 키보드 PCB: build_mcu_circuit.py 가 추가한 부품들의 핀에 global_label 자동 부착.

매핑 표 (PIN_NAME_MAP, PIN_NUMBER_MAP, TWO_PIN_NETS) 에 따라 각 인스턴스의 핀
좌표를 계산해 라벨을 sch 에 inject. ROW0~3 / COL0~13 라벨은 기존 sch 의
global_label 과 같은 이름이라 자동 연결.

idempotent: 이미 추가된 라벨이 있으면 (uuid 추적) skip 가능 — 단순화 위해
재실행 전엔 백업으로 복원 권장.

실행: python3 connect_mcu_circuit.py
"""

import re
import shutil
import uuid as _uuid
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SCH = REPO / 'keyboard' / 'keyboard.kicad_sch'

# ===== 매핑 표 =====

# pin name 기반 매핑 (각 부품에서 핀 이름이 unique 한 경우)
PIN_NAME_MAP: dict[str, dict[str, str]] = {
    'U1': {  # STM32F072CBTx
        'VDD': '+3V3', 'VDDA': '+3V3', 'VBAT': '+3V3', 'VDDIO2': '+3V3',
        'VSS': 'GND', 'VSSA': 'GND',
        'NRST': 'NRST', 'BOOT0': 'BOOT0',
        'PA0': 'COL0', 'PA1': 'COL1', 'PA2': 'COL2', 'PA3': 'COL3',
        'PA4': 'COL4', 'PA5': 'COL5', 'PA6': 'COL6', 'PA7': 'COL7',
        'PA8': 'COL13',
        'PA11': 'USB_DM', 'PA12': 'USB_DP',
        'PA13': 'SWDIO', 'PA14': 'SWCLK',
        'PB0': 'ROW0', 'PB1': 'ROW1', 'PB2': 'ROW2', 'PB10': 'ROW3',
        'PB3': 'COL8', 'PB4': 'COL9', 'PB5': 'COL10',
        'PB6': 'COL11', 'PB7': 'COL12',
        # 나머지 PA9, PA10, PA15, PB8, PB9, PB11~15, PC13~15, PF0/1 → 라벨 X (LED 등 미래)
    },
}

# pin number 기반 매핑 (핀 이름 중복 있는 부품: USB-C, USBLC6, LDO)
PIN_NUMBER_MAP: dict[str, dict[str, str]] = {
    'J1': {  # USB-C 16P
        'A1': 'GND', 'A12': 'GND', 'B1': 'GND', 'B12': 'GND', 'S1': 'GND',
        'A4': 'VBUS', 'A9': 'VBUS', 'B4': 'VBUS', 'B9': 'VBUS',
        'A5': 'CC1', 'B5': 'CC2',
        'A7': 'USB_DM_RAW', 'B7': 'USB_DM_RAW',
        'A6': 'USB_DP_RAW', 'B6': 'USB_DP_RAW',
        # A8 (SBU1), B8 (SBU2): NC, 라벨 안 부착
    },
    'U2': {  # USBLC6-2SC6 (USB connector 측: 1/3, MCU 측: 4/6)
        '1': 'USB_DM_RAW',
        '3': 'USB_DP_RAW',
        '6': 'USB_DM',
        '4': 'USB_DP',
        '5': 'VBUS',
        '2': 'GND',
    },
    'U3': {  # AP2112K-3.3
        '1': 'VBUS',   # VIN
        '2': 'GND',    # GND
        '3': 'VBUS',   # EN tied to VIN (always on)
        # '4': NC
        '5': '+3V3',   # VOUT
    },
    # PWR_FLAG: ERC power_pin_not_driven 해소. 1핀 (number "1").
    'PWR1': {'1': 'VBUS'},
    'PWR2': {'1': 'GND'},
}

# 2핀 부품 (C, R, switch): (pin1_net, pin2_net)
# C_Small/R_Small: pin "1" / "2"; SW_Push: pin "1" / "2"
TWO_PIN_NETS: dict[str, tuple[str, str]] = {
    'C1': ('+3V3', 'GND'),  # MCU VDD 디커플링
    'C2': ('+3V3', 'GND'),
    'C3': ('+3V3', 'GND'),
    'C4': ('+3V3', 'GND'),
    'C5': ('NRST', 'GND'),  # NRST 노이즈 캡
    'C6': ('VBUS', 'GND'),  # LDO 입력 캡
    'C7': ('+3V3', 'GND'),  # LDO 출력 캡
    'R1': ('CC1', 'GND'),   # USB-C CC1 풀다운 5.1k
    'R2': ('CC2', 'GND'),   # USB-C CC2 풀다운 5.1k
    'R3': ('BOOT0', 'GND'), # BOOT0 풀다운 10k
    'RST1': ('NRST', 'GND'),
}


def gen_uuid() -> str:
    return str(_uuid.uuid4())


def find_balanced(text: str, start_idx: int) -> int:
    assert text[start_idx] == '('
    depth = 0
    in_string = False
    i = start_idx
    while i < len(text):
        c = text[i]
        if c == '"' and (i == 0 or text[i - 1] != '\\'):
            in_string = not in_string
        elif not in_string:
            if c == '(':
                depth += 1
            elif c == ')':
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    raise RuntimeError("Unbalanced parens")


def extract_pins_from_lib_symbol(symbol_text: str) -> list[dict]:
    """lib symbol 텍스트에서 모든 핀 발췌. type=unconnected 또는 no_connect 인 핀은 skip
    (이미 NC 처리된 핀이라 라벨/no_connect 부착 X)."""
    pins = []
    for m in re.finditer(r'\(pin\s+(\S+)\s+(\S+)\s', symbol_text):
        ptype = m.group(1)
        if ptype in ('unconnected', 'no_connect'):
            continue
        ps = m.start()
        pe = find_balanced(symbol_text, ps)
        block = symbol_text[ps:pe + 1]
        at_m = re.search(r'\(at\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)', block)
        len_m = re.search(r'\(length\s+([-\d.]+)', block)
        name_m = re.search(r'\(name\s+"([^"]*)"', block)
        num_m = re.search(r'\(number\s+"([^"]*)"', block)
        if not (at_m and name_m and num_m):
            continue
        pins.append({
            'type': ptype,
            'x': float(at_m.group(1)),
            'y': float(at_m.group(2)),
            'rot': float(at_m.group(3)),
            'length': float(len_m.group(1)) if len_m else 0.0,
            'name': name_m.group(1),
            'number': num_m.group(1),
        })
    return pins


def _lib_symbols_span(sch_text: str) -> tuple[int, int]:
    """lib_symbols 의 시작 ( 와 끝 ) 인덱스 반환. 없으면 (-1, -1)."""
    m = re.search(r'\(lib_symbols\s', sch_text)
    if not m:
        return -1, -1
    ls_start = sch_text.index('(', m.start())
    ls_end = find_balanced(sch_text, ls_start)
    return ls_start, ls_end


def extract_lib_symbols(sch_text: str) -> dict[str, str]:
    """lib_symbols 의 직접 자식 (symbol "ID" ...) 들만 추출 (sub-symbol 제외)."""
    ls_start, ls_end = _lib_symbols_span(sch_text)
    if ls_start < 0:
        return {}
    out: dict[str, str] = {}
    i = ls_start + 1  # ( 다음부터
    depth = 1  # lib_symbols 의 ( 안
    in_str = False
    while i < ls_end:
        c = sch_text[i]
        if c == '"' and (i == 0 or sch_text[i - 1] != '\\'):
            in_str = not in_str
            i += 1
            continue
        if not in_str:
            if c == '(':
                # depth==1 이면 lib_symbols 의 직접 자식. (symbol "ID" 패턴인지 체크
                if depth == 1:
                    head = sch_text[i:i + 80]
                    nm = re.match(r'\(symbol\s+"([^"]+)"', head)
                    if nm:
                        sym_end = find_balanced(sch_text, i)
                        out[nm.group(1)] = sch_text[i:sym_end + 1]
                        i = sym_end + 1
                        continue
                depth += 1
            elif c == ')':
                depth -= 1
                if depth == 0:
                    break
        i += 1
    return out


def extract_instances(sch_text: str) -> list[dict]:
    """sch 의 최상위 (symbol (lib_id "X") ...) 인스턴스 추출. lib_symbols 영역 제외."""
    ls_start, ls_end = _lib_symbols_span(sch_text)
    out = []
    for m in re.finditer(r'\(symbol\s+\(lib_id\s+"([^"]+)"\)', sch_text):
        ps = m.start()
        if ls_start <= ps <= ls_end:
            continue
        pe = find_balanced(sch_text, ps)
        block = sch_text[ps:pe + 1]
        at_m = re.search(r'\(at\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)', block)
        ref_m = re.search(r'\(reference\s+"([^"]+)"\)', block)
        if at_m and ref_m:
            out.append({
                'lib_id': m.group(1),
                'x': float(at_m.group(1)),
                'y': float(at_m.group(2)),
                'rot': float(at_m.group(3)),
                'ref': ref_m.group(1),
            })
    return out


def transform_pin_pos(inst_x: float, inst_y: float, inst_rot: float,
                      pin_x: float, pin_y: float) -> tuple[float, float]:
    """심볼 좌표 (pin_x, pin_y) 를 sch 절대 좌표로.
    KiCad: 심볼 좌표 Y-up → sch Y-down. 인스턴스 회전은 CCW (반시계).

    회전 0 도면 단순: (Ix + Px, Iy - Py).
    이번 스크립트는 모든 인스턴스가 rot=0 으로 배치돼 다른 회전은 검증 안 함.
    """
    if inst_rot == 0:
        return inst_x + pin_x, inst_y - pin_y
    # 회전 처리 (검증되지 않음 — 미래 확장용)
    import math
    rad = math.radians(inst_rot)
    cos_r, sin_r = math.cos(rad), math.sin(rad)
    new_x = cos_r * pin_x - sin_r * pin_y
    new_y = sin_r * pin_x + cos_r * pin_y
    return inst_x + new_x, inst_y - new_y


def label_rotation_for_pin(pin_rot: float) -> int:
    """핀 방향 → 라벨 회전. 핀이 외부로 뻗는 방향에 라벨이 마주봐야.

    KiCad 핀 ROT: 0=뿌리에서 +X 로 뻗음? 또는 외부 연결점이 +X? 검증된 컨벤션:
    심볼 좌표상 핀 (at X Y R). R=0 일 때 핀은 좌측에서 들어옴 (외부 연결 X
    위치는 본체 우측). 라벨이 +X 방향으로 텍스트 출력하려면 회전 0.

    단순화: 핀 회전과 동일한 라벨 회전. KiCad 가 fields_autoplaced 로
    텍스트 위치 알아서 잡음.
    """
    return int(pin_rot)


def make_global_label(net: str, x: float, y: float, rot: int) -> str:
    return (
        f'\t(global_label "{net}" '
        f'(shape input) '
        f'(at {x} {y} {rot}) '
        f'(fields_autoplaced) '
        f'(effects (font (size 1.27 1.27)) (justify left)) '
        f'(uuid "{gen_uuid()}"))'
    )


def make_no_connect(x: float, y: float) -> str:
    return f'\t(no_connect (at {x} {y}) (uuid "{gen_uuid()}"))'


def main():
    if not SCH.exists():
        raise SystemExit(f"Not found: {SCH}")

    sch_text = SCH.read_text()

    # 백업
    backup_dir = SCH.parent / 'keyboard-backups'
    backup_dir.mkdir(exist_ok=True)
    ts = datetime.now().strftime('%Y%m%d-%H%M%S')
    backup = backup_dir / f'keyboard-{ts}-pre-labels.kicad_sch'
    shutil.copy2(SCH, backup)
    print(f'Backup: {backup.name}')

    # lib_symbols 와 인스턴스 추출
    lib_syms = extract_lib_symbols(sch_text)
    instances = extract_instances(sch_text)
    print(f'lib_symbols: {len(lib_syms)}, instances: {len(instances)}')

    # 우리가 처리할 ref 들
    target_refs = (
        set(PIN_NAME_MAP.keys())
        | set(PIN_NUMBER_MAP.keys())
        | set(TWO_PIN_NETS.keys())
    )

    new_labels = []
    new_nocs = []
    skipped_pins = []
    for inst in instances:
        ref = inst['ref']
        if ref not in target_refs:
            continue
        lib_id = inst['lib_id']
        if lib_id not in lib_syms:
            print(f'  ! {ref}: lib_id {lib_id} not in lib_symbols, skip')
            continue
        pins = extract_pins_from_lib_symbol(lib_syms[lib_id])
        if not pins:
            print(f'  ! {ref}: no pins extracted from {lib_id}')
            continue

        for pin in pins:
            net = None
            if ref in PIN_NUMBER_MAP and pin['number'] in PIN_NUMBER_MAP[ref]:
                net = PIN_NUMBER_MAP[ref][pin['number']]
            elif ref in PIN_NAME_MAP and pin['name'] in PIN_NAME_MAP[ref]:
                net = PIN_NAME_MAP[ref][pin['name']]
            elif ref in TWO_PIN_NETS:
                if pin['number'] == '1':
                    net = TWO_PIN_NETS[ref][0]
                elif pin['number'] == '2':
                    net = TWO_PIN_NETS[ref][1]

            ax, ay = transform_pin_pos(
                inst['x'], inst['y'], inst['rot'],
                pin['x'], pin['y'],
            )

            if net is None:
                # 매핑 없는 핀 = 의도된 NC. no_connect 부착해 ERC pin_not_connected 무력화.
                skipped_pins.append((ref, pin['number'], pin['name']))
                new_nocs.append(make_no_connect(ax, ay))
                continue

            label_rot = label_rotation_for_pin(pin['rot'])
            new_labels.append(make_global_label(net, ax, ay, label_rot))

    # sch 마지막 ) 직전에 inject
    if new_labels or new_nocs:
        last = sch_text.rstrip().rfind(')')
        block = '\n\n' + '\n'.join(new_labels + new_nocs) + '\n'
        sch_text = sch_text[:last] + block + sch_text[last:]
        SCH.write_text(sch_text)

    print(f'\nLabels added: {len(new_labels)}')
    print(f'No-connect flags added: {len(new_nocs)}')
    if skipped_pins:
        print(f'Pins flagged NC (intended unconnected): {len(skipped_pins)}')
        for ref, num, name in skipped_pins[:20]:
            print(f'  - {ref} pin {num} ({name})')
        if len(skipped_pins) > 20:
            print(f'  ... and {len(skipped_pins) - 20} more')


if __name__ == '__main__':
    main()
