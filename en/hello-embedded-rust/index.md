# A First Step in STM32 Embedded Rust


A brief summary for recent learning about embedded rust in internship and projects.

## Resources

- [The Book](https://doc.rust-lang.org/book/): Basic rust grammar. Pay attention to `Channel`, `Mutex`, `Cell`, `RefCell` etc. in the concurrency section, which are also useful in embedded rust.
- [Discovery](https://docs.rust-embedded.org/discovery/): There is a [new version](https://docs.rust-embedded.org/discovery/microbit/) using micro:bit when I write this blog. I was reading the [STM32F3Discovery](https://docs.rust-embedded.org/discovery/f3discovery/) version.
- [The Embedded Rust Book](https://docs.rust-embedded.org/book/): If you are experienced in embedded systems, you can jump right in to this book. I have the F3 board so I didn't use QEMU.
- [RTIC](https://rtic.rs): A concurrent framework on bare metal. Better handle rust variables with ownerships. When I learned it was v0.5. Good to see that 1.0 has been released.
- [ferrous-systems' blog](https://ferrous-systems.com/blog/all/): This company introduced many technologies into embedded rust, includes testing, debugging etc. The most impressive is that they implement a [async/await executor](https://github.com/ferrous-systems/async-on-embedded).

## Environment

### Rust Toolchain

Here I installed the nightly version of msvc toolchain using rustup.

Download core for different target platforms. Otherwise would be unable to compile:

```shell
rustup target add thumbv6m-none-eabi        #  Cortex-M0 and Cortex-M0+
rustup target add thumbv7m-none-eabi        #  Cortex-M3
rustup target add thumbv7em-none-eabi       #  Cortex-M4 and Cortex-M7 (no FPU)
rustup target add thumbv7em-none-eabihf     #  Cortex-M4F and Cortex-M7F (with FPU)
```

### Debugging Tools

I am using the [scoop](https://github.com/ScoopInstaller/Scoop) package manager. So just `scoop install` the following tools:

- arm-none-eabi-gdb
- openocd

Besides, if using ST-LINK, manually install the driver.

[This link (Chinese)](https://zhuanlan.zhihu.com/p/51872048) integrated debugging tools into vscode. Haven't tried since CLI is enough.

## Hello World

`cortex-m` only. Other platforms untested.

```shell
cargo generate --git https://github.com/rust-embedded/cortex-m-quickstart
```

1. modify `.cargo/config.toml`
1. modify `memory.x`. Usualy STM32 has the FLASH address on `0x08000000`, RAM address on `0x20000000`. If you see multiple RAMs in the manual, take the first one's size.
1. modify `openocd.cfg`, available configuring scripts could be found under openocd's root directory
1. run `openocd` at your project directory, keep this terminal open
1. open a new terminal window, `cargo run`, see if there's any output

## PAC & HAL

[PAC]^(Peripheral Access Crate) is usually generated automatically by [svd2rust](https://crates.io/crates/svd2rust), according to the [SVD]^(CMSIS System View Description) file from suppliers, wraps basic operation on registers. The API is like:

```rust
pwm.ctl.modify(|r, w| w.globalsync0().clear_bit());
```

[HAL]^(Hardware Abstract Layer) is based on the PAC, (partly) implements [embedded-hal](https://crates.io/crates/embedded-hal). The STM32 series have some different implementations among each other, making the code for the same peripheral usually not interchangeable. You may not use all the driver crates since it requires some traits that the HAL doesn't implement, or you have to use unsafe blocks to directly manipulate registers.

## To Start with (Bare Metal)

````rust
#![no_main] /* use entry macro */
#![no_std] /* std not available */

use panic_semihosting as _; /* choose panic handler, need a debugger or it would block */
// use panic_halt as _;
// use panic_abort as _; /* need nightly toolchain */

// use cortex_m::asm; /* if need to use assembly */
use cortex_m_rt::entry;
// use cortex_m_semihosting::hprintln; /* println! with semihosting, makes debugging easier */

// use core::fmt::Write; /* if instead using serial port, use write! to write into serial's tx */

use hal::{
    delay::Delay, /* delay function */
    pac,
    prelude::*,
};
use stm32f1xx_hal as hal; /* import a hal */

#[entry]
fn main() -> ! {
    let (dp, cp) = (
        /* dp: device peripherals that the MCU designer provided */
        pac::Peripherals::take().unwrap(),
        /* cp: core peripherals that comes with ARM core */
        cortex_m::Peripherals::take().unwrap(),
    );

    /* Setup the clock tree */
    let (mut flash, mut rcc) = (dp.FLASH.constrain(), dp.RCC.constrain());
    let clocks = rcc.cfgr.use_hse(8.mhz()).freeze(&mut flash.acr);

    /* Use SYST or other clock sources to initialize the delay object */
    let mut delay = Delay::new(cp.SYST, clocks);

    /* gpio abstraction, depends on the hal */
    let (mut gpioa, mut gpiob) = (dp.GPIOA.split(&mut rcc.apb2), dp.GPIOB.split(&mut rcc.apb2));

    loop{
        /* do something */
    }
}
```
````

## Safe Global Variables

We all know that modifying a `static mut` variable is unsafe in rust. Tons of style guides require for less global variables as possible. However, they are commonly used in embedded systems as we are doing low level coding and the whole program is not that complex. A better way in rust is using [RTIC](https://rtic.rs/). But here we start from the basics.

- [`Atomic`](https://doc.rust-lang.org/std/sync/atomic/index.html) is the best way if the platform supports atomic operations. Simple and safe. Disadvantages are that there cannot be complex logic, and only a few primitive types are supported.
- `Mutex<RefCell<T>>` with critical section. Need to `use cortex_m::interrupt::{self, Mutex};`. Can wrap up complex data types, including abstract for peripherals. But it makes a lot of noise in your code. The [usage](https://docs.rust-embedded.org/book/concurrency/index.html#sharing-peripherals)is roughly:

  1.  declare a `static FOO:Mutex<RefCell<Option<T>>> = Mutex::new(RefCell::new(None));`
  2.  initialize peripherals in the start of your `main()` and then open a critical section `interrupt::free(|cs| FOO.borrow(cs).replace(Some(T)));`, move the ownership to the global variable `FOO`
  3.  to use in other places, after entering a critical section, use `FOO.borrow(cs).borrow()` to get the inner `RefCell` then `as_ref()` to get the wrapped `T`

  I nearly never use this way as it's too complex and mentally exhausting. In a large project just use RTIC.

This part usually makes me mad, as you have to use a bunch of layers to wrap up things that you could directly write in C, even if I know that there shouldn't be any problem.

## RTIC

I really want to call RTIC a preemptive scheduler. If together with a memory allocator, it works just like a preemptive RTOS. However it's just a foreground/background system, managing tasks by setting interrupt priorities, without a context switching function. The reason we choose it is that it wraps up the complex `Mutex<RefCell<Option<T>>>` usage, and it can register unoccupied hardware interrupts as software interrupts with arguments and capacity.

However, because it uses a lot of macros, neither [RLS]^(Rust Language Server) nor [RA]^(Rust Analyzer) can perfectly auto-complete and lint. So I usually code on bare metal first, making the type right, and then copy and paste into the RTIC project.

## Memory Allocator

[alloc-cortex-m](https://crates.io/crates/alloc-cortex-m): need nightly toolchain. [usage](https://github.com/rust-embedded/alloc-cortex-m/blob/master/examples/global_alloc.rs)

With a memory allocator, we can conveniently use `vec!` etc. The allocator can be config to use external memory after setting up FSMC.

## RTOS

I have tried [drone](https://www.drone-os.com/) on both WSL and Linux PC but failed to run a hello-world... BTW it seems no longer maintained.

Also, there is [Tock OS](https://book.tockos.org/), but you have to write peripheral drivers. The official ST [demo](https://www.tockos.org/hardware/) only have f3disco and two f4nucleo board, and neither have I tried.

I am not optimistic about RTOS in Rust, as many existing drivers are in C. Not to mention the compatibility with existing hal.

## Useful Crates

- [heapless](https://crates.io/crates/heapless)
- [bitbang-hal](https://crates.io/crates/bitbang-hal)
- [nb](https://crates.io/crates/nb): although the name is short for non-block, it is usually used to block the code to wait for peripherals. Usage:
  ```rust
  block!(Serial.write(byte))?;
  ```
- [micromath](https://crates.io/crates/micromath): provide operations on floating point numbers that may be missing in no_std environment

## Conclusion

Embedded rust is definitely acceptable for personal projects. A few disadvantages are:

- large binaries in debug mode. I have a [balancing-bot](https://github.com/EzekielDaun/rs-balancing-bot) project in which I would tell you more later.
- annoying grammar noise

I tried embedded rust for some tiny boards' verifying demo. If the logic isn't too complex, you can complete the whole project in just a few minutes. I have also tried RTIC for large projects and found a few problems:

1. basically foreground/background system, bothersome when design complex scheduling.
2. much slower that μCOSⅢ. I made a simple serial loop-back, and it could be 50% slower! Maybe I didn't properly config the clock... Or micrium optimized a lot in handling interrupts. I give up in 2 days, turned to μCOS, because even if I complete it, no one could maintain it lol.

Rust's awesome trait abstraction and embedded-hal as a unified interface, make general driver crates possible. My balancing bot project was done mainly by using crates, which proved the power of these abstractions. This is also the reason STM32's standard peripheral library and HAL library are so popular in China. However, it inevitably brings extra code with performance trade-off, although you can depend on LLVM, but who knows. Although embedded-hal defines some traits, when out of these traits, hals are usually implemented differently, for example, the GPIO API in STM32F1XX_HAL is very different than in STM32F4XX_HAL. The last thing is only my guess. C++ also has virtual functions, where defining a unified interface is definitely possible. Why they don't use C++? The virtual table may have performance loss, but the compiler could choose other implementation since compilers for embedded chips are commonly hacked by these companies with some magic.

