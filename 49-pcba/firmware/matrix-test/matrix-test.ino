// ============================================================
//  49-pcba  Matrix Test  (ESP32-S3 LOLIN S3 Mini 기준)
// ------------------------------------------------------------
//  핀 배치 (사용자 지정)
//    ROW0..ROW3   : GPIO  1,  2,  3,  4   (4개)
//    COL0..COL15  : GPIO 43, 33, 44, 37, 36, 38, 35, 34,
//                        18, 21, 16, 17,  7,  8,  9, 10 (16개)
//
//  매트릭스 모양 : 4 row × 16 col = 64 위치
//
//  다이오드 방향을 모르므로 두 방향 모두 스캔한다.
//    Phase A (COL→ROW) : COL 한 개를 OUTPUT-LOW,  ROW 읽기
//    Phase B (ROW→COL) : ROW 한 개를 OUTPUT-LOW,  COL 읽기
//  검출되는 방향이 "정상" 다이오드 방향이다.
//
//  ESP32-S3 핀 주의 (현재 매트릭스 기준)
//    GPIO 19/20  = USB D-/D+ (CDC) — 매트릭스에 미포함 ✓
//    GPIO 26~32  = 내장 SPI flash  — 매트릭스에 미포함 ✓
//    GPIO 43     = U0TXD  COL0     — 부팅 직후 ROM 부트로더 메시지가
//                                    이 핀에 잠시 토해진다. 평소엔 풀업으로 HIGH.
//                                    펌웨어 실행 후엔 GPIO 로 정상 동작.
//    GPIO 44     = U0RXD  COL2     — 부팅시 내부 풀업 활성. 무해.
// ============================================================

#include <Arduino.h>

static const uint8_t ROW_PINS[] = { 1, 2, 3, 4 };
static const uint8_t COL_PINS[] = {
    43, 33, 44, 37, 36, 38, 35, 34,
    18, 21, 16, 17,  7,  8,  9, 10
};
static const uint8_t NUM_ROWS = sizeof(ROW_PINS) / sizeof(ROW_PINS[0]);
static const uint8_t NUM_COLS = sizeof(COL_PINS) / sizeof(COL_PINS[0]);

// ── 디바운스 / 타이밍 ────────────────────────────────────────
static const uint8_t  DEBOUNCE_MS  = 8;
static const uint16_t SETTLE_US    = 30;     // OUTPUT 전환 후 안정화
static const uint32_t HEARTBEAT_MS = 5000;

// 상태 (Phase 별로 따로 추적)
static bool     stateC2R[NUM_COLS][NUM_ROWS];   // COL→ROW
static bool     stateR2C[NUM_ROWS][NUM_COLS];   // ROW→COL
static uint32_t lastChangeC2R[NUM_COLS][NUM_ROWS];
static uint32_t lastChangeR2C[NUM_ROWS][NUM_COLS];
static uint32_t lastHeartbeat = 0;

// ── 출력 ────────────────────────────────────────────────────
static void printPin(uint8_t pin) {
    if (pin < 10) Serial.print(' ');
    Serial.print(pin);
}

static void printBanner() {
    Serial.println();
    Serial.println(F("==================================================="));
    Serial.println(F(" 49-pcba  Matrix Test  (ESP32-S3)"));
    Serial.println(F("==================================================="));
    Serial.print  (F(" ROWS (")); Serial.print(NUM_ROWS); Serial.print(F(") : "));
    for (uint8_t r = 0; r < NUM_ROWS; r++) {
        Serial.print(F("GPIO")); Serial.print(ROW_PINS[r]);
        if (r + 1 < NUM_ROWS) Serial.print(F(", "));
    }
    Serial.println();
    Serial.print  (F(" COLS (")); Serial.print(NUM_COLS); Serial.print(F(") : "));
    for (uint8_t c = 0; c < NUM_COLS; c++) {
        Serial.print(F("GPIO")); Serial.print(COL_PINS[c]);
        if (c + 1 < NUM_COLS) Serial.print(F(", "));
    }
    Serial.println();
    Serial.println();
    Serial.println(F(" 두 방향 모두 스캔 → 다이오드 방향에 따라 한 방향만 잡힘"));
    Serial.println(F("   C2R : COL 구동 LOW → ROW 읽기 (다이오드 anode=ROW, cathode=COL)"));
    Serial.println(F("   R2C : ROW 구동 LOW → COL 읽기 (다이오드 anode=COL, cathode=ROW)"));
    Serial.println();
    Serial.println(F(" 출력 형식 :"));
    Serial.println(F("   [ms]  DIR  ROW#/COL#  (GPIOxx/GPIOyy)  PRESSED|released"));
    Serial.println();
}

static void printEvent(const char* dir, uint8_t row, uint8_t col, bool pressed, uint32_t now) {
    Serial.print(F("["));
    Serial.print(now);
    Serial.print(F("ms] "));
    Serial.print(dir);
    Serial.print(F("  ROW"));
    Serial.print(row);
    Serial.print(F("/COL"));
    if (col < 10) Serial.print(' ');
    Serial.print(col);
    Serial.print(F("  (GPIO"));
    printPin(ROW_PINS[row]);
    Serial.print(F("/GPIO"));
    printPin(COL_PINS[col]);
    Serial.print(F(")  "));
    Serial.println(pressed ? F("PRESSED  ✓") : F("released"));
}

// ── 핀 모드 헬퍼 ────────────────────────────────────────────
static void allInputPullup() {
    for (uint8_t r = 0; r < NUM_ROWS; r++) pinMode(ROW_PINS[r], INPUT_PULLUP);
    for (uint8_t c = 0; c < NUM_COLS; c++) pinMode(COL_PINS[c], INPUT_PULLUP);
}

// ── Phase A : COL → ROW ─────────────────────────────────────
static void scanC2R(uint32_t now) {
    // ROW: 입력 풀업, COL: 출력 (한 번에 하나만 LOW)
    for (uint8_t r = 0; r < NUM_ROWS; r++) pinMode(ROW_PINS[r], INPUT_PULLUP);

    for (uint8_t c = 0; c < NUM_COLS; c++) {
        pinMode(COL_PINS[c], OUTPUT);
        digitalWrite(COL_PINS[c], LOW);
        delayMicroseconds(SETTLE_US);

        for (uint8_t r = 0; r < NUM_ROWS; r++) {
            bool pressed = (digitalRead(ROW_PINS[r]) == LOW);
            if (pressed != stateC2R[c][r]) {
                if (now - lastChangeC2R[c][r] >= DEBOUNCE_MS) {
                    stateC2R[c][r]     = pressed;
                    lastChangeC2R[c][r] = now;
                    printEvent("C2R", r, c, pressed, now);
                }
            }
        }

        pinMode(COL_PINS[c], INPUT_PULLUP);
        delayMicroseconds(SETTLE_US);
    }
}

// ── Phase B : ROW → COL ─────────────────────────────────────
static void scanR2C(uint32_t now) {
    for (uint8_t c = 0; c < NUM_COLS; c++) pinMode(COL_PINS[c], INPUT_PULLUP);

    for (uint8_t r = 0; r < NUM_ROWS; r++) {
        pinMode(ROW_PINS[r], OUTPUT);
        digitalWrite(ROW_PINS[r], LOW);
        delayMicroseconds(SETTLE_US);

        for (uint8_t c = 0; c < NUM_COLS; c++) {
            bool pressed = (digitalRead(COL_PINS[c]) == LOW);
            if (pressed != stateR2C[r][c]) {
                if (now - lastChangeR2C[r][c] >= DEBOUNCE_MS) {
                    stateR2C[r][c]     = pressed;
                    lastChangeR2C[r][c] = now;
                    printEvent("R2C", r, c, pressed, now);
                }
            }
        }

        pinMode(ROW_PINS[r], INPUT_PULLUP);
        delayMicroseconds(SETTLE_US);
    }
}

// ── setup / loop ───────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(1500);  // USB CDC enumeration

    allInputPullup();

    for (uint8_t c = 0; c < NUM_COLS; c++)
        for (uint8_t r = 0; r < NUM_ROWS; r++) {
            stateC2R[c][r] = false; lastChangeC2R[c][r] = 0;
        }
    for (uint8_t r = 0; r < NUM_ROWS; r++)
        for (uint8_t c = 0; c < NUM_COLS; c++) {
            stateR2C[r][c] = false; lastChangeR2C[r][c] = 0;
        }

    printBanner();
    lastHeartbeat = millis();
}

void loop() {
    uint32_t now = millis();

    scanC2R(now);
    scanR2C(now);

    if (now - lastHeartbeat >= HEARTBEAT_MS) {
        lastHeartbeat = now;
        Serial.print(F("."));
    }

    delay(1);
}
