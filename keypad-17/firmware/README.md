# keypad-17 firmware — RMK (ESP32-C3 SuperMini, BLE)

17키 핸드와이어 넘패드의 펌웨어. rmk 0.8 + esp-hal 1.0(no_std, `riscv32imc-unknown-none-elf`), BLE 전용(`usb_enable = false` — C3 는 USB HID 불가). 설정은 전부 `keyboard.toml`(+`vial.json`), 코드는 `#[rmk_keyboard]` 매크로 한 줄이다.

## 확정 핀맵 (probe 실측, 2026-07-12)

| 구분        | 핀 (물리 순서)                           |
| ----------- | ---------------------------------------- |
| COL 좌→우   | GPIO3 · GPIO2 · GPIO1 · GPIO0            |
| ROW 위→아래 | GPIO21 · GPIO20 · GPIO10 · GPIO5 · GPIO6 |

- 다이오드 col2row(검은 띠가 가로줄 쪽). 2u 세로키는 아랫행 배선: **+ = (2,3), Enter = (4,3)**.
- **GPIO2·8·9 는 보드 외부 풀업이라 ROW 로 사용 불가**(COL 출력은 가능). 상세: `docs/memory/rmk-esp32c3.md`.

## 빌드·플래시

```sh
cargo build --release
espflash flash --port /dev/cu.usbmodemXXXX --non-interactive target/riscv32imc-unknown-none-elf/release/keypad17
espflash monitor --port /dev/cu.usbmodemXXXX
```

- RMK(BLE) 실행 중엔 sync 실패가 잦다 → USB 재연결 직후 1초 간격 재시도. **플래시 중단 금지**(부트루프 — 재플래시로 복구).
- **keymap 변경이 반영 안 되면**: storage 가 옛 keymap 을 영속화한 것. `espflash erase-region --port ... 0x3F0000 0x10000` 후 호스트에서 기기 제거(Forget)·재페어링.

## 진단 펌웨어 (probe)

```sh
cargo build --release --bin probe
espflash flash --port ... target/riscv32imc-unknown-none-elf/release/probe
sh watch-probe.sh
```

13핀을 순회 구동하며 실제 도통 쌍을 `PAIR+ COL=GPIOx ROW=GPIOy` 로 출력한다(유휴 STUCK-HIGH 리포트 포함). 배선 역추적·냉납/다이오드 방향 판정용 — 키를 누르면 그 키의 실배선이 그대로 찍힌다.
