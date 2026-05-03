# ============================================================
#  공용 헬퍼 (rebuild.sh / start.sh 에서 source)
# ============================================================

color() { printf '\033[%sm%s\033[0m\n' "$1" "$2"; }
info()  { color '1;36' "▶ $1"; }
ok()    { color '1;32' "✓ $1"; }
warn()  { color '1;33' "⚠ $1"; }
err()   { color '1;31' "✗ $1"; }

# 시리얼 포트 자동 탐색 (PORT 환경변수가 있으면 그 값을 그대로 사용)
detect_port() {
    if [ -n "${PORT:-}" ]; then
        printf '%s' "$PORT"
        return
    fi
    for p in /dev/cu.usbmodem* /dev/cu.SLAB_USBtoUART* /dev/cu.wchusbserial*; do
        [ -e "$p" ] && { printf '%s' "$p"; return; }
    done
    printf ''
}
