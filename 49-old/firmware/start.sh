#!/bin/sh
# ============================================================
#  start.sh  -  시리얼 모니터만 실행
# ------------------------------------------------------------
#  사용 :  sh start.sh
#  포트 강제 :  PORT=/dev/cu.usbmodemXXX sh start.sh
#
#  업로드/컴파일 없이 모니터만. 보드의 [RST] 를 누른 직후에
#  실행하면 부팅 배너부터 깔끔하게 볼 수 있다.
#  Ctrl+C 로 종료 → 다시 실행해도 무방.
# ============================================================
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/_lib.sh"

BAUD="${BAUD:-115200}"

# ── 1. 시리얼 포트 ──────────────────────────────────────────
PORT="$(detect_port)"
if [ -z "$PORT" ]; then
    err "시리얼 포트를 찾을 수 없어. ESP32-S3 보드를 USB 로 연결해."
    exit 1
fi
ok "시리얼 포트 : $PORT  ($BAUD baud)"

# ── 2. arduino-cli 존재 확인 ────────────────────────────────
if ! command -v arduino-cli >/dev/null 2>&1; then
    err "arduino-cli 가 없어. 'sh rebuild.sh' 를 먼저 실행해서 설치해."
    exit 1
fi

# ── 3. 모니터 ──────────────────────────────────────────────
echo
color '1;35' "==========================================="
color '1;35' "  Matrix Scanner Live  (Ctrl+C 로 종료)"
color '1;35' "==========================================="

# 보드가 RST 등으로 재열거되어 포트 path 가 바뀌면 monitor 가 끊긴다.
# 끊겨도 자동 재연결 — 사용자가 Ctrl+C 로 명시 종료할 때까지 루프.
while true; do
    NOW_PORT="$(detect_port)"
    if [ -z "$NOW_PORT" ]; then
        warn "포트 사라짐 — 1초 후 재탐색 (Ctrl+C 로 종료)"
        sleep 1
        continue
    fi
    if [ "$NOW_PORT" != "$PORT" ]; then
        warn "포트가 $PORT → $NOW_PORT 으로 바뀌었어"
        PORT="$NOW_PORT"
    fi

    arduino-cli monitor -p "$PORT" --config "baudrate=$BAUD" || true

    warn "모니터 끊김 — 보드 재열거 대기 (1초 후 재연결)"
    sleep 1
done
