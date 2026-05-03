// ============================================================
//  ESP32-S3 LOLIN Mini  -  Full Pin Connectivity Scanner
// ------------------------------------------------------------
//  매트릭스 핀을 미리 지정하지 않고, 보드에서 사용 가능한
//  모든 GPIO 쌍의 연결 상태를 스캔한다.
//
//  알고리즘 :
//    (1) 모든 핀을 INPUT_PULLUP 으로 둔다.
//    (2) 한 핀씩 차례로 OUTPUT-LOW 로 끌어내린다.
//    (3) 나머지 핀을 읽어 LOW 면 두 핀이 연결된 것.
//    (4) 다이오드가 있으면 한 방향에서만 CONNECTED 가 보인다
//        (DRIVE = cathode 쪽 핀일 때 forward-bias).
//    (5) 다이오드가 없는 직결이면 양방향 모두 CONNECTED.
//
//  제외 핀 (사용 시 부팅/USB/플래시 깨짐) :
//    0  : BOOT 버튼 (스트래핑)
//    3  : JTAG/스트래핑
//    19 : USB D-
//    20 : USB D+
//    26~32 : 내부 SPI flash / PSRAM
//    45, 46 : 스트래핑
//
//  주의 (포함하긴 했지만 알아두기) :
//    43 : UART0 TX  - 부팅 직후 50ms 동안 ROM 부트로더 메시지가 토해짐
//    44 : UART0 RX  - 부팅시 내부 풀업 활성
//    41, 42, 47, 48 : LOLIN S3 Mini 표준 헤더에는 노출 안 됨.
//                     보드에 라벨이 있을 때만 의미 있음.
// ============================================================

#include <Arduino.h>

// ESP32-S3 에서 안전하게 GPIO 로 쓸 수 있는 핀 전체
// (LOLIN S3 Mini 헤더에 없는 핀은 그냥 floating 상태로 무해하게 무시됨)
static const uint8_t SCAN_PINS[] = {
     1,  2,  4,  5,  6,  7,  8,  9, 10, 11,
    12, 13, 14, 16, 17, 18, 21, 33, 34, 35,
    36, 37, 38, 39, 40, 41, 42, 43, 44, 47,
    48
};
static const size_t NUM_PINS = sizeof(SCAN_PINS) / sizeof(SCAN_PINS[0]);

// ── 상태 / 디바운스 ──────────────────────────────────────────
static const uint8_t  DEBOUNCE_MS    = 8;
static const uint32_t HEARTBEAT_MS   = 5000;
static const uint16_t SETTLE_US      = 30;     // OUTPUT 전환 후 안정화

// prevConn[i][j] : "i 를 LOW 로 구동했을 때 j 가 LOW 였는가" 의 최근 commit 값
static bool     prevConn[NUM_PINS][NUM_PINS];
static uint32_t lastChangeMs[NUM_PINS][NUM_PINS];
static uint32_t lastHeartbeatMs = 0;

// ── 출력 헬퍼 ───────────────────────────────────────────────
static void printPin(uint8_t pin) {
    if (pin < 10) Serial.print(' ');
    Serial.print(pin);
}

static void printBanner() {
    Serial.println();
    Serial.println(F("================================================="));
    Serial.println(F(" ESP32-S3 LOLIN Mini - Full Pin Connectivity Scan"));
    Serial.println(F("================================================="));
    Serial.print  (F(" 감시 핀 ("));
    Serial.print  (NUM_PINS);
    Serial.print  (F("개) : "));
    for (size_t i = 0; i < NUM_PINS; i++) {
        Serial.print(SCAN_PINS[i]);
        if (i + 1 < NUM_PINS) Serial.print(F(", "));
    }
    Serial.println();
    Serial.println(F(" 제외        : 0,3,19,20,26-32,45,46 (USB/flash/strap)"));
    Serial.println(F(" 주의        : 43=U0TXD(부팅시 ROM 메시지 출력), 44=U0RXD"));
    Serial.println();
    Serial.println(F(" 어디든 두 핀이 닿으면 'DRIVE xx → READ yy : CONNECTED'"));
    Serial.println(F(" 다이오드면 한 방향만, 직결이면 양 방향 모두 잡힘."));
    Serial.println();
}

static void printEvent(uint8_t drive, uint8_t read_, bool connected, uint32_t now) {
    Serial.print(F("["));
    Serial.print(now);
    Serial.print(F("ms] DRIVE GPIO"));
    printPin(drive);
    Serial.print(F("  →  READ GPIO"));
    printPin(read_);
    Serial.print(F("  :  "));
    Serial.println(connected ? F("CONNECTED  ✓") : F("open"));
}

// ── 핀 셋업 ─────────────────────────────────────────────────
static void resetAllPins() {
    for (size_t i = 0; i < NUM_PINS; i++) {
        pinMode(SCAN_PINS[i], INPUT_PULLUP);
    }
}

// ── 스캔 1 사이클 ───────────────────────────────────────────
static void scanAllPairs(uint32_t now) {
    for (size_t i = 0; i < NUM_PINS; i++) {
        // i 번 핀만 OUTPUT-LOW, 나머지는 INPUT_PULLUP 유지
        pinMode(SCAN_PINS[i], OUTPUT);
        digitalWrite(SCAN_PINS[i], LOW);
        delayMicroseconds(SETTLE_US);

        for (size_t j = 0; j < NUM_PINS; j++) {
            if (j == i) continue;
            bool connected = (digitalRead(SCAN_PINS[j]) == LOW);

            if (connected != prevConn[i][j]) {
                if (now - lastChangeMs[i][j] >= DEBOUNCE_MS) {
                    prevConn[i][j]     = connected;
                    lastChangeMs[i][j] = now;
                    printEvent(SCAN_PINS[i], SCAN_PINS[j], connected, now);
                }
            }
        }

        // 다음 핀을 위해 다시 풀업으로 복귀
        pinMode(SCAN_PINS[i], INPUT_PULLUP);
        delayMicroseconds(SETTLE_US);
    }
}

// ── setup / loop ───────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(1500);  // USB CDC enumeration

    resetAllPins();
    for (size_t i = 0; i < NUM_PINS; i++) {
        for (size_t j = 0; j < NUM_PINS; j++) {
            prevConn[i][j]     = false;
            lastChangeMs[i][j] = 0;
        }
    }

    printBanner();
    lastHeartbeatMs = millis();
}

void loop() {
    uint32_t now = millis();
    scanAllPairs(now);

    if (now - lastHeartbeatMs >= HEARTBEAT_MS) {
        lastHeartbeatMs = now;
        Serial.print(F("."));
    }

    delay(1);
}
