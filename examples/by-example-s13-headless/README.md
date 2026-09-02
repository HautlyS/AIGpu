# by-example §13 headless test

Runnable main API (`aigpu`) example for by-example §13 headless test. The Vitest file uses `aigpu/node` so it can run in the Docker GPU harness; browser code is the same except for `init() + surface(gpu, canvas)` and `surface`.
