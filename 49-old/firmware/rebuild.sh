#!/bin/sh
# ============================================================
#  rebuild.sh  -  컴파일 + 업로드 (모니터는 별도)
# ------------------------------------------------------------
#  사용 :  sh rebuild.sh
#  포트 강제 :  PORT=/dev/cu.usbmodemXXX sh rebuild.sh
#
#  업로드만 한다. 모니터는 sh start.sh 로 따로 띄워야 함.
#  → RST 누를 때 모니터 프로세스가 죽는 문제 회피.
# ============================================================
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/_lib.sh"

SKETCH_DIR="$SCRIPT_DIR/matrix-test"
BOARD_FQBN="esp32:esp32:lolin_s3_mini:CDCOnBoot=cdc,USBMode=hwcdc"
ESP32_INDEX_URL="https://espressif.github.io/arduino-esp32/package_esp32_index.json"

# ── 1. 시리얼 포트 ──────────────────────────────────────────
PORT="$(detect_port)"
if [ -z "$PORT" ]; then
    err "시리얼 포트를 찾을 수 없어. ESP32-S3 보드를 USB 로 연결한 뒤 다시 실행해."
    exit 1
fi
ok "시리얼 포트 : $PORT"

# ── 2. arduino-cli 확인 / 설치 ──────────────────────────────
if ! command -v arduino-cli >/dev/null 2>&1; then
    warn "arduino-cli 가 없네. brew 로 설치할게."
    if ! command -v brew >/dev/null 2>&1; then
        err "Homebrew 도 없어. https://brew.sh 참고해서 brew 부터 설치해줘."
        exit 1
    fi
    brew install arduino-cli
    ok "arduino-cli 설치 완료"
fi
info "arduino-cli : $(arduino-cli version | head -n1)"

# ── 3. ESP32 코어 확인 / 설치 ───────────────────────────────
if ! arduino-cli core list 2>/dev/null | grep -q '^esp32:esp32'; then
    warn "ESP32 보드 패키지 미설치. 첫 설치라 5~10 분 걸릴 수 있어."
    arduino-cli config init --overwrite >/dev/null 2>&1 || true
    arduino-cli config add board_manager.additional_urls "$ESP32_INDEX_URL" >/dev/null 2>&1 \
        || arduino-cli config set board_manager.additional_urls "$ESP32_INDEX_URL"
    arduino-cli core update-index
    arduino-cli core install esp32:esp32
    ok "ESP32 코어 설치 완료"
else
    info "ESP32 코어 OK : $(arduino-cli core list | grep '^esp32:esp32' | awk '{print $2}')"
fi

# ── 4. 컴파일 ───────────────────────────────────────────────
info "컴파일중 ($SKETCH_DIR)"
arduino-cli compile \
    --fqbn "$BOARD_FQBN" \
    --warnings none \
    "$SKETCH_DIR"
ok "컴파일 성공"

# ── 5. 업로드 (실패 시 수동 부트로더 모드 안내) ─────────────
try_upload() {
    arduino-cli upload \
        -p "$1" \
        --fqbn "$BOARD_FQBN" \
        "$SKETCH_DIR"
}

upload_with_retry() {
    attempt=1
    max_attempts=4
    while [ "$attempt" -le "$max_attempts" ]; do
        info "업로드 시도 $attempt/$max_attempts → $PORT"
        if try_upload "$PORT"; then
            ok "플래시 완료"
            return 0
        fi

        warn "업로드 실패. ESP32-S3 의 USB CDC 가 부트로더 진입을 못 한 거야."
        echo
        color '1;33' "  ┌──────────────────────────────────────────────┐"
        color '1;33' "  │  LOLIN S3 Mini 수동 부트로더 진입            │"
        color '1;33' "  ├──────────────────────────────────────────────┤"
        color '1;33' "  │  1) [0] (BOOT) 버튼을 누른 채로              │"
        color '1;33' "  │  2) [RST] 버튼을 한 번 짧게 눌렀다 뗀다      │"
        color '1;33' "  │  3) [0] (BOOT) 버튼을 뗀다                   │"
        color '1;33' "  │  → 보드가 다운로드 모드로 들어감             │"
        color '1;33' "  └──────────────────────────────────────────────┘"
        echo

        if [ "$attempt" -eq "$max_attempts" ]; then
            err "최대 재시도 초과. 보드/케이블 확인 후 다시 실행해."
            return 1
        fi

        printf "준비되면 Enter (건너뛰려면 Ctrl+C) … "
        read _ignore || true

        NEW_PORT="$(detect_port)"
        if [ -n "$NEW_PORT" ]; then
            if [ "$NEW_PORT" != "$PORT" ]; then
                info "포트가 $PORT → $NEW_PORT 으로 바뀌었어"
            fi
            PORT="$NEW_PORT"
        fi

        attempt=$((attempt + 1))
    done
    return 1
}

upload_with_retry || exit 1

echo
ok "업로드 완료"
echo
color '1;35' "다음 단계 :"
echo "  1) 보드의 [RST] 버튼을 짧게 한 번 눌러 새 펌웨어를 실행"
echo "  2) sh start.sh   ← 시리얼 모니터 시작"
echo
