# 初探嵌入式 Rust


这段时间在实习和个人项目中学习 STM32 上嵌入式 Rust 的一些总结

## 资料

- [The Book](https://doc.rust-lang.org/book/): 熟悉 Rust 语法, 其中并发部分的 channel 和 Mutex, Cell, RefCell 等, 在嵌入式中有类似的用法
- [Discovery](https://docs.rust-embedded.org/discovery/): 写博客时发现这本书有了使用 micro:bit 的[新版](https://docs.rust-embedded.org/discovery/microbit/), 我读的是使用 STM32F3Discovery 的[旧版](https://docs.rust-embedded.org/discovery/f3discovery/)
- [The Embedded Rust Book](https://docs.rust-embedded.org/book/): 有嵌入式开发经验可以跳过 discovery 直接看这本. 我买了 F3 板子所以直接跑在板子上没有用 QEMU
- [RTIC](https://rtic.rs): 一个裸机多任务框架, 更好地共享 Rust 变量. 我看的时候是 v0.5, 现在已经出到 1.0 了, 可喜可贺.
- [ferrous-systems's blog](https://ferrous-systems.com/blog/all/): 这家公司的博客介绍了许多 Rust 在嵌入式开发中的技巧, 获益匪浅. 尤其是实现了一个 [async/await executor](https://github.com/ferrous-systems/async-on-embedded)

## 环境搭建

### Rust 工具链

这里使用 rustup 安装了 msvc 工具链的 rust

按需下载对应平台的 core, 否则无法编译:

```shell
rustup target add thumbv6m-none-eabi        #  Cortex-M0 and Cortex-M0+
rustup target add thumbv7m-none-eabi        #  Cortex-M3
rustup target add thumbv7em-none-eabi       #  Cortex-M4 and Cortex-M7 (no FPU)
rustup target add thumbv7em-none-eabihf     #  Cortex-M4F and Cortex-M7F (with FPU)
```

### 调试工具

我使用包管理器 [scoop](https://github.com/ScoopInstaller/Scoop), 以下工具`scoop install` 即可

- arm-none-eabi-gdb
- openocd

此外,如果使用 ST-LINK, 需要手动安装驱动

[这篇文章](https://zhuanlan.zhihu.com/p/51872048)末尾提供了使用 vscode 调试的方法, 我觉得 gdb 命令行就够用了, 因此没有尝试

## Hello World

仅限 cortex-m 内核, 其他平台未研究

```shell
cargo generate --git https://github.com/rust-embedded/cortex-m-quickstart
```

1. 修改 .cargo/config.toml
1. 修改 memory.x 一般 STM32 FLASH 起始地址在 0x08000000, RAM 在 0x20000000. 芯片手册里如果有多段 RAM, 取第一段的大小
1. 修改 openocd.cfg, 可用的配置文件可以在 openocd 的安装目录下找到
1. 在项目目录下执行`openocd`, 不要关闭这个终端
1. 另起一个终端,执行`cargo run`, 观察是否收到输出

## PAC & HAL

[PAC]^(Peripheral Access Crate) 一般由 [svd2rust](https://crates.io/crates/svd2rust) 根据 ARM 厂商提供的[SVD]^(CMSIS System View Description)文件自动生成, 提供了寄存器操作的基本包装, API 用法如:

```rust
pwm.ctl.modify(|r, w| w.globalsync0().clear_bit());
```

[HAL]^(Hardware Abstract Layer) 在 PAC 基础上遵循 [embedded-hal](https://crates.io/crates/embedded-hal) 编写. 但至少 STM32 各系列的实现程度并不高, 并且进度各不相同, 导致同样的外设在 f1, f4 系列上的代码可能大不一样, 各芯片的 driver crate 也不一定都能使用. 部分外设如 FSMC, 因为 hal 没有编写相关部分, 几乎只能靠手动配置寄存器并引入 unsafe 块才能使用

## 起手式(裸机)

````rust
#![no_main] /* main使用entry宏引入 */
#![no_std] /* 不使用std因为不可用 */

use panic_semihosting as _; /* 选择panic处理方式, 不接调试器semihosting会卡死 */
// use panic_halt as _;
// use panic_abort as _; /* 需要nightly工具链 */

// use cortex_m::asm; /* 如果需要直接使用汇编指令 */
use cortex_m_rt::entry;
// use cortex_m_semihosting::hprintln; /* semihosting下的println!宏, 方便调试 */

// use core::fmt::Write; /* 如果使用串口调试, 使用write!宏向串口tx输出 */

use hal::{
    delay::Delay, /* 常用的延时 */
    pac, /* hal包装过的pac */
    prelude::*,
};
use stm32f1xx_hal as hal; /* 导入一个hal */

#[entry]
fn main() -> ! {
    let (dp, cp) = (
        /* dp:device peripherals, 指MCU厂商扩展的外设 */
        pac::Peripherals::take().unwrap(),
        /* cp: core peripherals, 指ARM自带的外设 */
        cortex_m::Peripherals::take().unwrap(),
    );

    /* 配置时钟 */
    let (mut flash, mut rcc) = (dp.FLASH.constrain(), dp.RCC.constrain());
    let clocks = rcc.cfgr.use_hse(8.mhz()).freeze(&mut flash.acr);

    /* 初始化delay对象, 这里用系统时钟SYST */
    let mut delay = Delay::new(cp.SYST, clocks);

    /* gpio抽象, 各hal略有不同 */
    let (mut gpioa, mut gpiob) = (dp.GPIOA.split(&mut rcc.apb2), dp.GPIOB.split(&mut rcc.apb2));

    loop{
        /* do something */
    }
}
```
````

## safe 全局变量

我们都知道操作 `static mut` 是 unsafe 的, 大量的编程规范要求尽量减少使用全局变量. 但嵌入式环境下往往无法避免. 一个更好的方法是规划好变量的作用范围后使用 [RTIC](https://rtic.rs/). 不过这里先讲一下简单的做法和原理

- [`Atomic`](https://doc.rust-lang.org/std/sync/atomic/index.html) 是平台支持下最优雅的做法, 简洁, 安全. 缺点是不能进行有复杂逻辑的操作, 且仅支持几种基本数据类型, 不过一般需求下够用了.
- `Mutex<RefCell<T>>` 配合临界区使用. 需要`use cortex_m::interrupt::{self, Mutex};`. 可以包装更复杂的数据类型, 包括外设. 但会引入大量语法噪音. [使用方法](https://docs.rust-embedded.org/book/concurrency/index.html#sharing-peripherals)大致为:

  1.  声明一个 `static FOO:Mutex<RefCell<Option<T>>> = Mutex::new(RefCell::new(None));`
  2.  在 main 中初始化外设并在临界区中使用 `interrupt::free(|cs| FOO.borrow(cs).replace(Some(T)));` 移动所有权给全局变量 `FOO`
  3.  使用时同样需要进入临界区后, 使用 `FOO.borrow(cs).borrow()` 获取`RefCell`后再 `as_ref()` 才能得到内部的 T

  我几乎从不使用这种方法, 心累手也累, 复杂项目直接上 RTIC 完事儿

这部分相当让人抓狂, 许多在 C 语言中可以直接写的部分要包上好多层, 即便我知道它是安全的.

## RTIC

我很想管 RTIC 叫抢占式调度框架, 如果搭配内存分配器, 用起来和抢占式的 rtos 没啥区别. 然而它其实只是个前后台系统, 靠设置中断优先级来管理任务, 并不具有上下文切换的能力. 用它的原因就在于它包装了上述复杂的 `Mutex<RefCell<Option<T>>>`, 并可以将空闲的硬中断注册为可以有参数和容量的多个软中断.

然而, 缺点来自于它使用了大量的宏, 导致无论 RLS 还是 RA 都不能很好的支持自动补全和类型. 有些报错会一直显示却不影响正常编译... 真正编不过时又找不到报错的原因. 因此我经常先在裸机上搭好一些外设驱动框架, 调试好类型后再复制进 RTIC 项目.

## 内存分配器

[alloc-cortex-m](https://crates.io/crates/alloc-cortex-m): 需要 nightly 工具链, [用法](https://github.com/rust-embedded/alloc-cortex-m/blob/master/examples/global_alloc.rs)

使用内存分配器后, 可以像有 std 一样使用方便地使用 `vec!` 等. 可以先通过 FSMC 配置好外部 RAM 后将其内存起始地址指向 RAM

## RTOS

我尝试过[drone](https://www.drone-os.com/), WSL 和 Linux 物理机都试过, 然而连 hello world 都没能跑起来... 它似乎也没在更新了

另外还有[Tock OS](https://book.tockos.org/), 但外设驱动需要自行编写, 官方的 ST [demo](https://www.tockos.org/hardware/) 只有 f3disco 和两个 f4nucleo, 并没有尝试过

RTOS 方面估计很难超越 μCOS 和 FreeRTOS, 大量芯片驱动都有现成的 C 代码, Rust 这边还只能用爱发电. OS 能否和现有的 hal 框架兼容还是个问题

## 常用 crate

- [heapless](https://crates.io/crates/heapless): 提供了静态内存分配的常用数据类型
  - HistoryBuffer: 可用于平滑滤波
  - spsc::Queue: 消息队列
  - String:: 方便输出调试信息
- [bitbang-hal](https://crates.io/crates/bitbang-hal): 提供了软件模拟的 I2C, USART, SPI
- [nb](https://crates.io/crates/nb): 虽然名字叫做 non-block 但更多用 block!宏来等待外设工作完成, 例如:
  ```rust
  block!(Serial.write(byte))?;
  ```
- [micromath](https://crates.io/crates/micromath): 提供了嵌入式环境下可能缺失的某些 F32 操作

## 总结

个人项目的话, Embedded Rust 只能说差强人意. 小芯片 debug 编译二进制太大, 没法调试. 语法噪音也是相当烦人. 我利用几个芯片的 crate 写了个[平衡车](https://github.com/EzekielDaun/rs-balancing-bot)玩, 过段时间会专门介绍

实习中用 rust 写了一些小板子的验证 demo, 逻辑简单的话用 hal 分分钟就能起个项目. 也用 RTIC 尝试过复杂项目, 有这么几个问题:

1. 本质仍然是前后台, 复杂任务调度比较烧脑
2. 运行速度比 μCOSⅢ 慢不少, 写了个简单的串口环回, 能慢将近一半. 或许是我时钟没配好...也可能人家商业公司在关中断这块儿确实优化的好. 尝试了两天, 还是改用 μCOS 了, 因为即便我这个实习生写出来也以后没人接手维护...

