# RMK + ESP32-C3 SuperMini 운용 지식 (keypad-17 실전에서 확립)

## 스택

- rmk 0.8 (crates.io) + esp-hal 1.0 no_std, target `riscv32imc-unknown-none-elf`(stable rustc), BLE 전용(`usb_enable = false` — C3 는 USB-Serial-JTAG 만 있어 USB HID 불가).
- 프로젝트 생성: `rmkit create --keyboard-toml-path ... --vial-json-path ...` (keyboard.toml + vial.json → 템플릿에서 호환 버전 고정).
- 빌드/플래시: `cargo build --release` → `espflash flash --port /dev/cu.usbmodemXXXX --non-interactive target/.../release/<name>`.

## 핀 제약 (SuperMini 보드 실측)

- **GPIO2·8·9 는 온보드 외부 풀업**(부트스트랩·BOOT 버튼·LED)이라 유휴에서 STUCK-HIGH → **매트릭스 ROW(풀다운 입력)로 사용 불가**. RMK `matrix.rs` 는 출력 `set_high`→입력 `is_high`(액티브 하이·풀다운) 하드코딩이라 펌웨어 우회 불가.
- COL(푸시풀 출력)로는 GPIO2 등 풀업 핀도 사용 가능.
- GPIO20·21(UART0 기본핀)은 ROW 입력으로 정상 동작(esp-println 은 USB-Serial-JTAG 사용).
- keypad-17 확정: `col_pins = [GPIO3, GPIO2, GPIO1, GPIO0]`(좌→우), `row_pins = [GPIO21, GPIO20, GPIO10, GPIO5, GPIO6]`(위→아래).

## 함정: storage 가 keymap 을 영속화한다

- `[storage] enabled = true` 면 **첫 부팅 때 keymap 이 플래시 스토리지(마지막 64KB, 0x3F0000)에 저장**되고, 이후 재플래시해도 **스토리지의 옛 keymap 이 컴파일된 새 keymap 보다 우선**한다. (앱 파티션 밖이라 `espflash flash` 로 안 지워짐)
- 증상: 매트릭스는 새 좌표로 감지(`KeyPos { row, col }` 로그)되는데 키코드가 옛 배치/`No`.
- 해결: `espflash erase-region --port ... 0x3F0000 0x10000` 후 리부트. **BLE 본드도 함께 지워지므로 호스트에서 기기 제거(Forget) 후 재페어링 필요.**

## 진단 펌웨어 (probe)

- `src/bin/probe.rs` — 13핀 Flex 순회: 각 핀 출력 HIGH → 나머지 풀다운 입력 감지. 유휴 STUCK-HIGH 리포트 + `PAIR+ COL=GPIOx ROW=GPIOy`(다이오드 방향으로 COL/ROW 자동 판별).
- 실배선 역추적·냉납/다이오드 방향 판정에 사용: 키를 누르면 실제 도통 쌍이 그대로 출력된다. 라이브 뷰: `watch-probe.sh`(espflash monitor 로그 tail).
- 판정 사례: 직결하면 되는데 다이오드 달면 안 됨 = 다이오드 역방향/사망. 스위치 다리 단락에 무반응 = 다리 밖 체인(조인트·버스) 문제.

## 플래시 연결 팁

- RMK(BLE) 실행 중엔 espflash sync 가 자주 실패 → **USB 재연결 직후 1초 간격 재시도 루프**가 잘 잡힘. 부트루프 상태에선 오히려 즉시 잡힘.
- **플래시 도중 중단 금지** — 앱 이미지가 깨져 부트루프(`invalid segment length`)에 빠진다. 재플래시로 복구.
