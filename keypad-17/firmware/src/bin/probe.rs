#![no_std]
#![no_main]

use esp_backtrace as _;
use esp_hal::delay::Delay;
use esp_hal::gpio::{Flex, InputConfig, Pull};
use esp_println::println;

esp_bootloader_esp_idf::esp_app_desc!();

const PIN_COUNT: usize = 13;
const NAMES: [u8; PIN_COUNT] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 21];
const SETTLE_US: u32 = 50;
const SWEEP_PAUSE_MS: u32 = 5;

#[esp_hal::main]
fn main() -> ! {
    let p = esp_hal::init(esp_hal::Config::default());
    let delay = Delay::new();

    let mut pins: [Flex<'_>; PIN_COUNT] = [
        Flex::new(p.GPIO0),
        Flex::new(p.GPIO1),
        Flex::new(p.GPIO2),
        Flex::new(p.GPIO3),
        Flex::new(p.GPIO4),
        Flex::new(p.GPIO5),
        Flex::new(p.GPIO6),
        Flex::new(p.GPIO7),
        Flex::new(p.GPIO8),
        Flex::new(p.GPIO9),
        Flex::new(p.GPIO10),
        Flex::new(p.GPIO20),
        Flex::new(p.GPIO21),
    ];

    let input_cfg = InputConfig::default().with_pull(Pull::Down);
    for pin in pins.iter_mut() {
        pin.apply_input_config(&input_cfg);
        pin.set_input_enable(true);
        pin.set_output_enable(false);
    }
    delay.delay_millis(20);

    println!("=== PROBE idle check: all pins input pull-down ===");
    for (i, pin) in pins.iter().enumerate() {
        if pin.is_high() {
            println!("STUCK-HIGH GPIO{}", NAMES[i]);
        }
    }
    println!("=== PROBE scanning: press keys one by one, slowly ===");

    let mut prev = [[false; PIN_COUNT]; PIN_COUNT];
    loop {
        for i in 0..PIN_COUNT {
            pins[i].set_high();
            pins[i].set_output_enable(true);
            delay.delay_micros(SETTLE_US);
            for j in 0..PIN_COUNT {
                if j == i {
                    continue;
                }
                let now = pins[j].is_high();
                if now != prev[i][j] {
                    prev[i][j] = now;
                    if now {
                        println!("PAIR+ COL=GPIO{} ROW=GPIO{}", NAMES[i], NAMES[j]);
                    } else {
                        println!("PAIR- COL=GPIO{} ROW=GPIO{}", NAMES[i], NAMES[j]);
                    }
                }
            }
            pins[i].set_output_enable(false);
            pins[i].set_low();
        }
        delay.delay_millis(SWEEP_PAUSE_MS);
    }
}
