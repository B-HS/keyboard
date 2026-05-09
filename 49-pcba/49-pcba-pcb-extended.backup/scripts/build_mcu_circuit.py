#!/usr/bin/env python3
"""
49 키보드 PCB: MCU + USB-C + LDO + ESD + 부속회로 부품을 키보드 schematic 에 자동 주입.

기존 keyboard.kicad_sch (49 스위치 + 49 다이오드 + 4 스태빌 + ROW/COL 글로벌 라벨) 위에
추가 부품 정의를 lib_symbols 에 발췌해 넣고, 메인 sch 우측 빈 공간에 인스턴스 배치.

배치만 하고 wire/label 은 안 그림 (사용자가 KiCad GUI 에서 ROW/COL/전원 라벨을
이미 존재하는 global_label 과 같은 이름으로 잇는 식).

idempotent: 두 번 실행해도 중복 안 됨 (Reference 기준 skip).
"""

import re
import shutil
import uuid as _uuid
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SCH = REPO / 'keyboard' / 'keyboard.kicad_sch'
KICAD_LIB = Path('/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols')
PROJECT_UUID = '9e45a776-7007-48ff-b543-dc98423173b7'

# KiCad 9 sch 기본 connection grid (50 mil = 1.27 mm).
# 인스턴스 좌표를 이 배수로 두면 핀 끝점이 grid 위에 떨어져 ERC endpoint_off_grid 회피.
GRID = 1.27


def snap(v: float) -> float:
    """좌표를 sch grid (1.27mm) 의 가장 가까운 배수로 정렬."""
    return round(v / GRID) * GRID

# 부품 정의: (lib_id, lib_file, ref, value, footprint, x, y, rot)
# x, y 단위 mm. 매트릭스가 ~25-205 x 35-100 영역을 차지하므로 우측 (x>=220) 빈 공간에 배치.
COMPONENTS = [
    # MCU 중앙. LQFP-48 심볼은 가로/세로 약 30x40mm 라 여유 둠.
    ('MCU_ST_STM32F0:STM32F072CBTx', 'MCU_ST_STM32F0.kicad_sym',
     'U1', 'STM32F072CBTx',
     'Package_QFP:LQFP-48_7x7mm_P0.5mm', 260.0, 60.0, 0),

    # USB-C 좌하
    ('Connector:USB_C_Receptacle_USB2.0_16P', 'Connector.kicad_sym',
     'J1', 'USB_C',
     'Connector_USB:USB_C_Receptacle_HRO_TYPE-C-31-M-12', 230.0, 130.0, 0),

    # ESD 보호
    ('Power_Protection:USBLC6-2SC6', 'Power_Protection.kicad_sym',
     'U2', 'USBLC6-2SC6',
     'Package_TO_SOT_SMD:SOT-23-6', 290.0, 130.0, 0),

    # LDO 5V→3.3V
    ('Regulator_Linear:AP2112K-3.3', 'Regulator_Linear.kicad_sym',
     'U3', 'AP2112K-3.3',
     'Package_TO_SOT_SMD:SOT-23-5', 340.0, 130.0, 0),

    # 디커플링 캡 4 (MCU VDD 핀마다)
    ('Device:C_Small', 'Device.kicad_sym', 'C1', '100nF',
     'Capacitor_SMD:C_0402_1005Metric', 380.0, 25.0, 0),
    ('Device:C_Small', 'Device.kicad_sym', 'C2', '100nF',
     'Capacitor_SMD:C_0402_1005Metric', 390.0, 25.0, 0),
    ('Device:C_Small', 'Device.kicad_sym', 'C3', '100nF',
     'Capacitor_SMD:C_0402_1005Metric', 400.0, 25.0, 0),
    ('Device:C_Small', 'Device.kicad_sym', 'C4', '100nF',
     'Capacitor_SMD:C_0402_1005Metric', 410.0, 25.0, 0),

    # NRST 노이즈 캡
    ('Device:C_Small', 'Device.kicad_sym', 'C5', '100nF',
     'Capacitor_SMD:C_0402_1005Metric', 420.0, 25.0, 0),

    # LDO 입력 캡
    ('Device:C_Small', 'Device.kicad_sym', 'C6', '1uF',
     'Capacitor_SMD:C_0402_1005Metric', 380.0, 50.0, 0),

    # LDO 출력 / 벌크 캡
    ('Device:C_Small', 'Device.kicad_sym', 'C7', '10uF',
     'Capacitor_SMD:C_0603_1608Metric', 395.0, 50.0, 0),

    # CC 풀다운 저항 ×2
    ('Device:R_Small', 'Device.kicad_sym', 'R1', '5.1k',
     'Resistor_SMD:R_0402_1005Metric', 380.0, 80.0, 0),
    ('Device:R_Small', 'Device.kicad_sym', 'R2', '5.1k',
     'Resistor_SMD:R_0402_1005Metric', 390.0, 80.0, 0),

    # BOOT0 풀다운
    ('Device:R_Small', 'Device.kicad_sym', 'R3', '10k',
     'Resistor_SMD:R_0402_1005Metric', 400.0, 80.0, 0),

    # 리셋 버튼 (매트릭스 SW1~SW49 와 충돌 회피해 RST1 사용)
    ('Switch:SW_Push', 'Switch.kicad_sym', 'RST1', 'RESET',
     'Button_Switch_SMD:SW_SPST_TL3342', 340.0, 80.0, 0),

    # PWR_FLAG: 외부에서 들어오는 power net (VBUS, GND) 이 driven 됨을 ERC 에 알림.
    # +3V3 는 LDO U3 의 VOUT (power_out) 이 이미 driver 라 불필요.
    ('power:PWR_FLAG', 'power.kicad_sym', 'PWR1', 'VBUS',
     '', 425.0, 110.0, 0),
    ('power:PWR_FLAG', 'power.kicad_sym', 'PWR2', 'GND',
     '', 425.0, 120.0, 0),
]


def gen_uuid() -> str:
    return str(_uuid.uuid4())


def find_balanced(text: str, start_idx: int) -> int:
    """text[start_idx] 가 '(' 라고 가정. 균형 잡힌 닫는 ')' 의 인덱스 반환 (포함)."""
    assert text[start_idx] == '(', f"Expected ( at {start_idx}"
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


def extract_symbol(lib_path: Path, sym_name: str) -> str:
    """라이브러리 파일에서 (symbol "NAME" ...) 최상위 정의 발췌."""
    text = lib_path.read_text()
    # 최상위 심볼은 들여쓰기 1탭 또는 공백. 안전하게 줄 시작 + 들여쓰기 + (symbol "NAME"
    pat = re.compile(rf'(?m)^[\t ]+\(symbol\s+"{re.escape(sym_name)}"\s')
    m = pat.search(text)
    if not m:
        raise ValueError(f"Symbol {sym_name!r} not found in {lib_path.name}")
    paren_start = text.index('(', m.start())
    end = find_balanced(text, paren_start)
    return text[paren_start:end + 1]


def get_pin_numbers(symbol_text: str) -> list[str]:
    """심볼 안의 핀 번호 추출 (중복 제거, 순서 유지)."""
    seen = set()
    result = []
    for n in re.findall(r'\(number\s+"([^"]+)"', symbol_text):
        if n not in seen:
            seen.add(n)
            result.append(n)
    return result


def get_extends_parent(symbol_text: str) -> str | None:
    """(extends "Parent") 안의 부모 이름. 없으면 None."""
    m = re.search(r'\(extends\s+"([^"]+)"\)', symbol_text)
    return m.group(1) if m else None


def resolve_lib_symbol(
    lib_path: Path, lib_prefix: str, sym_name: str,
    lib_text_map: dict[str, str],
) -> str:
    """심볼이 extends 면 부모 정의를 lib_symbols 에 추가하고 부모 lib_id 반환.
    extends 없으면 자기 자신 정의를 추가하고 자기 lib_id 반환.

    KiCad 9 의 sch 파일 lib_symbols 안에서는 (extends ...) 를 사용한 자식 심볼이
    제대로 파싱되지 않음. 따라서 인스턴스가 부모 lib_id 를 참조하도록 우회.
    인스턴스의 Value/Footprint property 로 자식의 메타데이터를 덮어쓰면 됨.
    """
    sym_text = extract_symbol(lib_path, sym_name)
    parent = get_extends_parent(sym_text)
    actual_short = parent if parent else sym_name
    actual_lib_id = f'{lib_prefix}:{actual_short}'
    if actual_lib_id in lib_text_map:
        return actual_lib_id
    # 부모 (또는 자기) 텍스트 추출, 이름을 lib_id 로 rename
    target_text = extract_symbol(lib_path, actual_short)
    target_text = re.sub(
        rf'\(symbol\s+"{re.escape(actual_short)}"',
        f'(symbol "{actual_lib_id}"',
        target_text,
        count=1,
    )
    lib_text_map[actual_lib_id] = target_text
    return actual_lib_id


def make_instance(lib_id: str, ref: str, value: str, footprint: str,
                  x: float, y: float, rot: int, pin_numbers: list[str]) -> str:
    """심볼 인스턴스 S-expr 생성. 핀 좌표는 lib 정의에서 KiCad가 처리."""
    inst_uuid = gen_uuid()
    pin_block = ''.join(
        f'\t\t(pin "{n}" (uuid "{gen_uuid()}"))\n' for n in pin_numbers
    )
    return (
        f'\t(symbol\n'
        f'\t\t(lib_id "{lib_id}")\n'
        f'\t\t(at {x} {y} {rot})\n'
        f'\t\t(unit 1)\n'
        f'\t\t(exclude_from_sim no)\n'
        f'\t\t(in_bom yes)\n'
        f'\t\t(on_board yes)\n'
        f'\t\t(dnp no)\n'
        f'\t\t(uuid "{inst_uuid}")\n'
        f'\t\t(property "Reference" "{ref}"\n'
        f'\t\t\t(at {x + 5} {y - 7} 0)\n'
        f'\t\t\t(effects (font (size 1.27 1.27)) (justify left))\n'
        f'\t\t)\n'
        f'\t\t(property "Value" "{value}"\n'
        f'\t\t\t(at {x + 5} {y - 4.5} 0)\n'
        f'\t\t\t(effects (font (size 1.27 1.27)) (justify left))\n'
        f'\t\t)\n'
        f'\t\t(property "Footprint" "{footprint}"\n'
        f'\t\t\t(at {x} {y} 0)\n'
        f'\t\t\t(effects (font (size 1.27 1.27)) (hide yes))\n'
        f'\t\t)\n'
        f'\t\t(property "Datasheet" "~"\n'
        f'\t\t\t(at {x} {y} 0)\n'
        f'\t\t\t(effects (font (size 1.27 1.27)) (hide yes))\n'
        f'\t\t)\n'
        f'\t\t(property "Description" ""\n'
        f'\t\t\t(at {x} {y} 0)\n'
        f'\t\t\t(effects (font (size 1.27 1.27)) (hide yes))\n'
        f'\t\t)\n'
        f'{pin_block}'
        f'\t\t(instances\n'
        f'\t\t\t(project "template"\n'
        f'\t\t\t\t(path "/{PROJECT_UUID}"\n'
        f'\t\t\t\t\t(reference "{ref}") (unit 1)\n'
        f'\t\t\t\t)\n'
        f'\t\t\t)\n'
        f'\t\t)\n'
        f'\t)'
    )


def main():
    if not SCH.exists():
        raise SystemExit(f"Not found: {SCH}")

    sch_text = SCH.read_text()

    # 백업
    backup_dir = SCH.parent / 'keyboard-backups'
    backup_dir.mkdir(exist_ok=True)
    ts = datetime.now().strftime('%Y%m%d-%H%M%S')
    backup = backup_dir / f'keyboard-{ts}-pre-mcu.kicad_sch'
    shutil.copy2(SCH, backup)
    print(f'Backup: {backup.relative_to(REPO)}')

    # idempotent: 이미 추가된 ref 가 있으면 skip
    existing_refs = set(re.findall(r'\(reference\s+"([^"]+)"\)', sch_text))
    target_refs = {c[2] for c in COMPONENTS}
    if target_refs & existing_refs:
        already = sorted(target_refs & existing_refs)
        raise SystemExit(
            f'Already injected refs detected ({len(already)}): {already}. '
            'Restore from backup before re-running.'
        )

    # 1) 라이브러리 → lib_symbols 정의 발췌. extends 자식은 부모 lib_id 로 redirect.
    needed_syms: dict[str, str] = {}
    component_actual_lib: dict[str, str] = {}  # 컴포넌트 lib_id → 실제 lib_symbols 의 lib_id
    for lib_id, lib_file, *_ in COMPONENTS:
        if lib_id in component_actual_lib:
            continue
        lib_prefix, sym_short = lib_id.split(':', 1)
        actual = resolve_lib_symbol(KICAD_LIB / lib_file, lib_prefix, sym_short, needed_syms)
        component_actual_lib[lib_id] = actual
        if actual == lib_id:
            print(f'  + {actual}')
        else:
            print(f'  + {actual}  (redirect: {lib_id} extends → {actual})')

    # 2) lib_symbols 섹션 끝 직전에 inject
    lib_pat = re.compile(r'\(lib_symbols\s')
    m = lib_pat.search(sch_text)
    if not m:
        raise SystemExit('lib_symbols section not found')
    lib_paren = sch_text.index('(', m.start())
    lib_end = find_balanced(sch_text, lib_paren)

    # 이미 sch 에 있는 lib_id 는 중복 추가 방지
    existing_lib_ids = set(re.findall(
        r'(?m)^[\t ]+\(symbol\s+"([^"]+)"',
        sch_text[lib_paren:lib_end + 1],
    ))
    new_definitions = []
    for lib_id, sym_text in needed_syms.items():
        if lib_id in existing_lib_ids:
            print(f'  - {lib_id} already in lib_symbols, skip')
            continue
        new_definitions.append(sym_text)
    inject_block = '\n\n' + '\n\n'.join(new_definitions) + '\n'
    sch_text = sch_text[:lib_end] + inject_block + sch_text[lib_end:]

    # 3) 인스턴스 빌드. lib_id 는 extends 의 경우 부모 사용, Value 로 자식 이름 덮어씀.
    #    좌표는 GRID (1.27mm) 배수로 snap → ERC endpoint_off_grid 회피.
    instances = []
    for lib_id, _lib_file, ref, value, footprint, x, y, rot in COMPONENTS:
        actual_lib_id = component_actual_lib[lib_id]
        pins = get_pin_numbers(needed_syms[actual_lib_id])
        sx, sy = snap(x), snap(y)
        instances.append(
            make_instance(actual_lib_id, ref, value, footprint, sx, sy, rot, pins)
        )
        print(f'  + instance {ref} ({value}) @ ({sx},{sy}) pins={len(pins)} via {actual_lib_id}')

    # 4) 메인 sch 의 마지막 닫는 ) 직전에 인스턴스 inject
    last_close = sch_text.rstrip().rfind(')')
    inserts = '\n\n' + '\n\n'.join(instances) + '\n'
    sch_text = sch_text[:last_close] + inserts + sch_text[last_close:]

    SCH.write_text(sch_text)
    print(f'\nWrote: {SCH.relative_to(REPO)}')
    print(f'Components added: {len(COMPONENTS)}')
    print(f'New lib_symbols definitions: {len(new_definitions)}')


if __name__ == '__main__':
    main()
