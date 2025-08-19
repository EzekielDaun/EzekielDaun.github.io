# Balancing Bot


In this post, I am going to share my experience in developing a balancing bot. As I haven't formally learned any courses about the control system, I could not guarantee the correctness of all the points.

## The Cascade PID Controller for the Bot

### PID

There are too much explanation about the PID [controller](https://en.wikipedia.org/wiki/PID_controller). So I will just share my own understanding.

You must have tried to play a song with a steel ruler, watching it vibrate, become weaker and weaker and finally stop. The ruler can vibrate because it has some elasticity, while this vibration becomes weaker and weaker since there is some sort of damping. A spring with a damper could solve most problems, and this is actually what a PD controller does. The second-order ODEs could explain:

$$
my''+cy'+ky=f(t)
$$

Assume that $m, c, k$ are all positive. The solutions of the characteristic equation $r_1 , r_2$ have a real negative part $\frac{-c}{2m}$. So the general solution of the ODE $y=K_1 e^{r_1 t} + K_2 e^{r_2 t}$ must converge. The ideal case is the critical damping, where $r_1 = r_2$ and the general solution becomes $y=Ke^{rt} + Kte^{rt}$.

Therefore, a PD controller could be considered as adding a spring and a damper to the system to make it stable. However, with some constant external load, the controlled value will eventually stabilize at some deviation from the target, depending on the `P` parameter. The integration part `I` is introduced to cancel this kind of steady-state error.

### The Angle Loop

Take the bot's angle as the input of the PD controller. When the bot inclines, we accelerate the base to catch up the head, and vice versa. However, with only the angle loop, even if well-tuned, the bot could eventually accelerate in one direction, because the motor has a maximum speed. When the bot is perpendicular to the ground, it doesn't mean that the bot has no speed. Because of the small P output, the motor behaves like a brake, making the robot rapidly nods to the ground, resulting in an even larger angle than before.

### The Speed Loop

To solve this problem, the speed loop is introduced. It takes the speed of the robot as input, outputs to the angle loop as the zero angle. When the robot has a positive speed, it makes the angle loop's zero angle decline, thus, generate a negative output to cancel this positive speed. The angle loop uses PD, and the speed loop use PI, since we are not interesting in the changing rate of speed.

The tuning of two controllers could be a little harder. It's obvious that we need to tune the angle loop first because it directly controls the actuator. The ideal process is tuning the angle loop's P parameter first for a fast response, and then the angle loop's D parameter until the bot could stand for a while, finally the speed loop.

## The Story from Interrupt

### RaspberryPi

I always think that Arduino is more like a toy, because of the lack of useful applications. But RPi, which has GPIO ports too, is also a more playable **Linux** PC! So I bought the cheapest RPi model 4B with 2 GB RAM to make this bot. I mainly use the C language and [Wiring Pi](http://wiringpi.com). The other hardware and kits are from [taobao](https://item.taobao.com/item.htm?spm=a1z10.1-c.w4004-10676576509.5.2d6922d9W5CQkh&id=45470143481). As a mechanical engineering student, I drew a acrylic board to position them. They were connected by jumping wires and a breadboard. Alright, let's drive them first:

- DC Motor<br>
  The driver is the common L298N. In brief we use 2 pins for direction, and an extra PWM pin for the output voltage. It's very easy to use [WiringPi](http://wiringpi.com)'s hardware PWM [function](http://wiringpi.com/reference/core-functions/) to drive RPi's pwm0 and pwm1.
- MPU6050<br>
  A six-DoF accelerometer and gyroscope, with integrated [DMP]^(Digital Motion Processor) that can output the fused orientation in quaternion, saving the load on MCU. However, it could not be used with common I2C instructions described in the manual. An official embedded motion driver provides the code for using DMP on MSP430. The core is passing a bunch of mysterious numbers through I2C to turn on the DMP function. I spent a lot of time looking for a RPi's DMP library and only got [this](https://github.com/richardghirst/PiBits/tree/master/MPU6050-Pi-Demo) library in C++. Although it's possible to port the motion driver to RPi, this might be too hard for me, a newbie at that time. Anyway, let's write some C in C++.
- Encoder<br>
  It generates two square waves with 90° phase latency, with a fixed number of rising/falling edges in each round. When there is an edge in one wave, by reading the voltage level of the other wave, the direction could be determined. Magic! It often works with interrupts on RPi.

WiringPi wraps up convenient functions to register interrupt handlers:

```C
int wiringPiISR (int pin, int edgeType,  void (*function)(void)) ;
```

Pass in the function pointer, the registered function could then be called when the interrupt occurs. Notice that this function pointer takes void and returns void. How could it communicate to other codes? The answer is global variable:

```C
long long COUNT;
void myISR(void);

void myISR(void){
    COUNT++;
}

int main(void){
    wiringPiSetup();
    /* Some code */
    wiringPiISR(pin, INT_EDGE_BOTH, myISR);
    /* Some code */
}
```

Therefore, when the interrupt occurs, `COUNT` would increment. Since the encoder counts very fast, I declared the type of `COUNT` as `long long` (64 Bits on RPi). ~~No!!!!~~

Here we go. I successfully drive the motor and encoder!~~Actually?~~ And we can elegantly press `q` in SSH to quit. Everything goes well and there is only the control part to do. I'll put my C code at this stage:

motor.h

```C
#include <pthread.h>
#include <stdbool.h>
#include <stdlib.h>
#include <unistd.h>
#include <wiringPi.h>

#define PIN_MOTOR1 26
#define PIN_MOTOR1_IN1 6
#define PIN_MOTOR1_IN2 27
#define PIN_MOTOR1_OUT1 28
#define PIN_MOTOR1_OUT2 29
#define PIN_MOTOR2 23
#define PIN_MOTOR2_IN1 22
#define PIN_MOTOR2_IN2 21
#define PIN_MOTOR2_OUT1 24
#define PIN_MOTOR2_OUT2 25
#define START_POWER 120

typedef struct smotor {
  const short PIN;
  const short PIN_IN1;
  const short PIN_IN2;
  const short PIN_OUT1;
  const short PIN_OUT2;
  const short DIR;
  const void (*run)();
  const int (*readSpd)();
  long long lastPos;
} Motor;

int motorInit(void);

static void motor(Motor *pmotor, int power);
static int readSpd(Motor *);
static void readEnc1A(void);
static void readEnc1B(void);
static void readEnc2A(void);
static void readEnc2B(void);

Motor leftWheel;
Motor rightWheel;
```

motor.c

```C
#include "motor.h"

int motorInit(void) {
  if (!wiringPiSetup()) {
    /* set interrupt response */
    wiringPiISR(PIN_MOTOR1_OUT1, INT_EDGE_BOTH, &readEnc1A);
    wiringPiISR(PIN_MOTOR1_OUT2, INT_EDGE_BOTH, &readEnc1B);
    wiringPiISR(PIN_MOTOR2_OUT1, INT_EDGE_BOTH, &readEnc2A);
    wiringPiISR(PIN_MOTOR2_OUT2, INT_EDGE_BOTH, &readEnc2B);
    /* set pin mode */
    pinMode(PIN_MOTOR1, PWM_OUTPUT);
    pinMode(PIN_MOTOR1_IN1, OUTPUT);
    pinMode(PIN_MOTOR1_IN2, OUTPUT);
    pinMode(PIN_MOTOR1_OUT1, INPUT);
    pinMode(PIN_MOTOR1_OUT2, INPUT);
    pinMode(PIN_MOTOR2, PWM_OUTPUT);
    pinMode(PIN_MOTOR2_IN1, OUTPUT);
    pinMode(PIN_MOTOR2_IN2, OUTPUT);
    pinMode(PIN_MOTOR2_OUT1, INPUT);
    pinMode(PIN_MOTOR2_OUT2, INPUT);

    return 0;
  } else {
    return -1;
  };
};
void motor(Motor *pmotor, int power) {
  digitalWrite(pmotor->PIN_IN1, ((power * pmotor->DIR) > 0));
  digitalWrite(pmotor->PIN_IN2, ((power * pmotor->DIR) < 0));
  pwmWrite(pmotor->PIN, abs(power) + START_POWER);
};
int readSpd(Motor *pmotor) {
  long long pos = pmotor->lastPos;
  usleep(5000);
  return (pmotor->lastPos) - pos;
};

void readEnc1A(void) {
  (leftWheel.lastPos) -=
      leftWheel.DIR *
      (((digitalRead(PIN_MOTOR1_OUT1) == digitalRead(PIN_MOTOR1_OUT2)) << 1) -
       1);
  /* equivalent to
  (motor1.lastPos) += motor1.DIR * ((digitalRead(PIN_MOTOR1_OUT1) ==
  digitalRead(PIN_MOTOR1_OUT2)) ? -1 : 1);
  */
};
void readEnc1B(void) {
  (leftWheel.lastPos) +=
      leftWheel.DIR *
      (((digitalRead(PIN_MOTOR1_OUT1) == digitalRead(PIN_MOTOR1_OUT2)) << 1) -
       1);
};
void readEnc2A(void) {
  (rightWheel.lastPos) -=
      rightWheel.DIR *
      (((digitalRead(PIN_MOTOR2_OUT1) == digitalRead(PIN_MOTOR2_OUT2)) << 1) -
       1);
};
void readEnc2B(void) {
  (rightWheel.lastPos) +=
      rightWheel.DIR *
      (((digitalRead(PIN_MOTOR2_OUT1) == digitalRead(PIN_MOTOR2_OUT2)) << 1) -
       1);
};

Motor leftWheel = {
    PIN_MOTOR1,      PIN_MOTOR1_IN1,  PIN_MOTOR1_IN2,
    PIN_MOTOR1_OUT1, PIN_MOTOR1_OUT2, .DIR = 1,
    motor,           readSpd,         .lastPos = 0,
};
Motor rightWheel = {
    PIN_MOTOR2,      PIN_MOTOR2_IN1,  PIN_MOTOR2_IN2,
    PIN_MOTOR2_OUT1, PIN_MOTOR2_OUT2, .DIR = -1,
    motor,           readSpd,         .lastPos = 0,
};
```

main.c

```C
#include "motor.h"
#include <stdio.h>

void *usrInterrupt(void *arg);

char usrInput = ' ';

int main(void) {
  if (!motorInit()) { // PIN Definition
    /* set high priority  */
    piHiPri(10);
    pthread_t th_usr_interrupt;
    char *th_usr_interrupt_arg = &usrInput;
    if (pthread_create(&th_usr_interrupt, NULL, usrInterrupt,
                       th_usr_interrupt_arg)) {
      return -1;
    }

    int t0 = millis();
    while (usrInput != 'q') {
      leftWheel.run(&leftWheel, 500);
      rightWheel.run(&rightWheel, 500);
      printf("%lli|%lli\n", leftWheel.lastPos, rightWheel.lastPos);

      delay(100);
    };
    pthread_detach(th_usr_interrupt);

    /* turn off all outputs */
    pwmWrite(PIN_MOTOR1, 0);
    pwmWrite(PIN_MOTOR2, 0);
    digitalWrite(PIN_MOTOR1_IN1, LOW);
    digitalWrite(PIN_MOTOR1_IN2, LOW);
    digitalWrite(PIN_MOTOR2_IN1, LOW);
    digitalWrite(PIN_MOTOR2_IN2, LOW);

    printf("Done!\n");
  }
  return 0;
};

/*------------ threads --------------*/
void *usrInterrupt(void *arg) {
  printf("Type in 'q' to quit.\n");
  while (*(char *)arg != 'q') {
    scanf("%c", arg);
  };
};

```

Because of the DMP problem that I mentioned before, I was planning to migrate to C++. After reading some [tutorials](https://www.runoob.com/cplusplus/cpp-tutorial.html), I was feeling good to have a `C with class` level in C++. After all, I could treat a class as a struct, right?

The total structure is: 4 IRQ handlers setting encoder counter global variables; a speed measuring thread that loops with a fixed time interval and writes the different in encoder counters to the speed global variables; the main thread would do one step of PID control if receive a data from MPU6050.

So, I defined a `Motor` class, with member `short pin_x` for motor driver, `long long pos` for encoder counter, `int spd` for saving the measured speed, member function `void Motor::run(int pow)`, as well as `void Motor::enc(int phase)` to be called by the interrupt handler. To wrap up all the details, I make all members that could be private `private`~~wtf!?~~. And `Base` class with two `Motor`s and an `MPU6050`. Because `Motor` nearly has its all members private, I also defined the `Base` as a friend class of `Motor`, as well as a lot of friend functions to make WiringPi be able to register interrupts in `main()`, to make speed measuring thread be able to access the `Motor`s, etc. To be safe, I use `int piHiPri (int priority)` to make the speed measuring thread the highest priority. Since the interrupt handler was declared as `(void*) f(void)`, I have to make 4 different wrapper functions to wrap up the actual handler member functions.

Eventually, it passed the compiler. WTF!? The speed readings from the encoder could sometimes jump up to some super large numbers, even if the motor is actually not running. The weirdest is that I could not even be able to **stably reproduce** that! I was greatly exhausted by that. Since the speed measurement is the very first thing in the speed loop, I couldn't have any progress until it is addressed. I couldn't have any idea about that because, in theory, this should have no difference from the previous C version. Finally, after doing tests and trials for the whole day, I gave up.

But I vaguely felt that I may wrap too many abstractions.

### Rust and Concurrent Programming

My short winter break came to an end, and I failed in my first trial to make this bot. Later, in my free time besides online courses, I coincidentally met the Rust programming language. I felt good having a quick glance at [the book](https://doc.rust-lang.org/stable/book/) and spent about three weeks thoroughly reading it. Its special `Ownership` and `Borrow Checker` impressed me very much.

They define:

> - At any given time, you can have either **one mutable reference** or **any number of immutable references**.
> - References must always be valid.

The second point is easy to understand. In C/C++, never use a freed pointer. But the first one... Wait, how did I implement my speed measuring thread?

Let's give an end to this problem: **[race condition](https://en.wikipedia.org/wiki/Race_condition)**. My Raspbian is a 32-bit version, where a `long long int` is a 64-bit signed integer. In other words, almost all operations towards it could not be completed in a single assembly instruction. Therefore, when the speed measuring thread partly change the counter but not complete yet, it might be preempted by the scheduler to the main thread. Now reading(loading) this counter in main could generate a race condition. The reason that the C version worked is that it only prints the counter without spawning another thread. The IRQ handler runs really fast and could never be preempted by other threads, while the interrupt frequency isn't that high to frequently preempt the reading process in the main thread. ~~When I check the makefiles, I found the C version was compiled with -O3 while the C++ version had no optimization option at all~~

So, what are the proper ways to do that?

1. Atomic Operations<br>
   An atomic operation will never be preempted. The bad thing is that it depends on your CPU instruction set and the compiler, and usually, it can only operate data type no longer than the CPU's word size. For `Ordering`, if we only need it to be atomic (usually in single-thread application) without considering the [memory consistency](https://en.wikipedia.org/wiki/Consistency_model), just choose `Ordering::Relax`, which is also the best choice for a counter. In multi-thread models, you first need to understand your memory model, then choose the [ordering](https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html). Usually the most strict is `Ordering::SeqCst`.
2. Mutex\RwLock (for normal threads\tasks)<br>
   For sharing resources between multiple threads with an OS/RTOS, these two locks are recommended. See details in [the book](https://doc.rust-lang.org/book/ch16-03-shared-state.html). Once failed in pending the lock, the thread could give up their time slice back to the scheduler for other threads.
3. Critical Section(IRQ Handler)<br>
   Since interrupts can always preempt the running thread unless you allow an IRQ handler to check the resource's availability first and not to handle when the resource is occupied, the above locks in normal threads will not actually work. Some CPUs could temporarily disable all the interrupts, so that the running thread would not be preempted. If using Rust, `Mutex`, `RefCell` etc. are needed to pass compiling, see [the embedded rust book](https://docs.rust-embedded.org/book/concurrency/index.html#sharing-peripherals).
4. Buffer<br>
   Another clever way is to use the memory to communicate. A probable implementation for a ring buffer could have an array and head&tail pointers. We could let the tx to have the ownership of the head, rx to have the tail. Increment the corresponding pointer after each operation. As long as the array is long enough and the the rx could handle faster than tx in average, we won't miss any messages.

If I were to redesign the speed measuring login in RPi, I would use an `AtomicI32` in IRQ for the encoder counter, a `RwLock<RefCell<_>>` for the speed global variable. To make no race conditions.

However, in my later internship, I learned STM32, a common model is F103C8T6@72MHz, which is definitely enough for a balancing bot. Compared with the RPi4B, which requires a 5V3A power supply and I deliberately bought a [battery extension board](https://www.waveshare.com/product/modules/others/power-relays/ups-hat.htm) for it, making it super bulky. The STM32 has a [QEI]^(Quadrature Encoder Interface) option in Timer peripherals that allows us to read the speed by a timer interrupt invoked "read and reset" operation. However when I implemented this in Rust, I spent an additional timer for software virtual I2C, which makes it no free timers for that interrupt... Finally I have to measure speed in the main loop with delay function.

## Sensor Fusion

Remember the DMP in MPU6050? Since I didn't found a workable DMP library (called crate in Rust) in Rust, I used the raw data from the sensor. To get the angle, just simply compare the direction of the acceleration with gravity. The MPU6050 crate has already implemented this function [get_acc_angles(&mut self) -> Result<Vector2<f32>, Mpu6050Error<E>>](https://docs.rs/mpu6050/0.1.5/mpu6050/struct.Mpu6050.html#method.get_acc_angles).

Combined with the [PID crate](https://crates.io/crates/pid_control) with the angle data as P input, gyro data as D input, I got my code compiled in less than an hour. I have to praise Rust that in 99% cases, a code passed compiling could **directly run** without critical bugs. I tilted the bot and it responded well as expected, which prove that the polarities of each parameter are all correct. But I struggled in tuning for three days without any progress... Even the most basic position loop works really bad. The best I tried could merely stand for around 10s. I tried to fix the wheels to make it a simply reversed pendulum and see what would happen. WTF!? It failed to be stable as well...There must be some critical problems...

I logged all the data and found the calculated angle a very noisy signal. But it was still unstable even I manually smoothed it...

Well, I have to admit that it actually make sense. Because the bot is moving, there have to be an additional acceleration adding to the gravity, which makes the calculated angle unreliable.

So how to get the angle? Here are some answers:

### Complementary Filter

$$
\theta = k \cdot \theta_{\text{acc}} + (1-k)\cdot \int{{\omega}dt}
$$

By integrating the angular speed reading $\omega$, we could get another angle measurement $\theta_\text{gyro}$. Of course this angle should have some error caused by the integrating implementation. The angle measured by comparing acceleration with gravity is notated as $\theta_\text{acc}$. We can assign different weights to both values, take the weighted sum as the result. Actual implementation could use recursion:

$$
\theta_{i+1} = k \cdot \theta_{\text{acc}} + (1-k)\cdot ({\theta_{i} + \omega dt})
$$

We can also dynamically adjust the weight. For example, when the accelerometer has a large reading, the gyro should be more reliable; when the gyro has a small reading, the accelerometer should be more reliable.

At first, I was planning to use Rust on STM32 to implement a complementary filter. Because as mentioned before, I had run up all the timers and had to use delay in the main loop, the practice showed that the actual delay time would vary, which made it hard to decide the $dt$ to be multiplied. I don't want this project to be even harder, so finally I decided to return to C, with off-the-shelf DMP driver on STM32.

### Kalman Filter

The most famous filter in the control theorem. However, I was not able to understand it at this time. I tried the existing rust crate [adskalman](https://crates.io/crates/adskalman) but failed because the binaries are too large to flash.

I wish sometime in future I could complete this section.

## Summary

The final bot with C and DMP is shown in the following picture. I'm not going to put the final code as it was done in limited time with very bad quality.

![The Bot](example.gif)

It wouldn't be hard to build a balancing bot as long as you understand the theory behind it. Actually, the most time-spending part was dealing with hardware and learning concurrent programming with a non-linear control flow. If I had chosen Arduino first, with tons of online Arduino resources, I may not meet Rust and STM32. Looking back on this long journey from RPi, I sincerely appreciate myself for getting these interesting experiences and knowledge.

