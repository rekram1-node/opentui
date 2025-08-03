# OpenTUI Documentation

OpenTUI is a powerful TypeScript library for building terminal user interfaces (TUIs) with advanced features including 2D/3D graphics, physics, animations, and flexible layout systems.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Basic Usage](#basic-usage)
4. [Renderables](#renderables)
5. [UI Elements & Layout](#ui-elements--layout)
6. [Input Handling](#input-handling)
7. [Graphics & Animation](#graphics--animation)
8. [Physics Integration](#physics-integration)
9. [Building a Dino Game](#building-a-dino-game)
10. [Advanced Features](#advanced-features)
11. [API Reference](#api-reference)

## Getting Started

### Installation

```bash
bun install @opentui/core
```

### Build Requirements

OpenTUI uses Zig for high-performance rendering. Build the native components:

```bash
bun run build:prod  # Production build
bun run build:dev   # Development build
```

### Basic Setup

```typescript
import { createCliRenderer } from "@opentui/core"

const renderer = await createCliRenderer({
  targetFps: 60,
  exitOnCtrlC: true,
})

renderer.setBackgroundColor("#001122")
renderer.start()
```

## Core Concepts

### Renderer

The `CliRenderer` is the main engine that manages the terminal, handles input, and renders all content at a specified frame rate.

### Renderables

Everything visible in OpenTUI is a `Renderable` - a hierarchical object that can be positioned, styled, and rendered to the terminal buffer.

### Layout System

OpenTUI uses Facebook's Yoga layout engine for flexible, CSS-like layouts with flexbox support.

### Event System

Built on Node.js EventEmitter, providing mouse events, keyboard input, and custom events.

## Basic Usage

### Creating Your First App

```typescript
import { createCliRenderer, TextRenderable, BoxRenderable, RGBA } from "@opentui/core"

async function main() {
  const renderer = await createCliRenderer({
    targetFps: 30,
    exitOnCtrlC: true,
  })

  // Create a background box
  const background = new BoxRenderable("background", {
    x: 0,
    y: 0,
    width: renderer.terminalWidth,
    height: renderer.terminalHeight,
    bg: "#001122",
    zIndex: 0,
  })

  // Create some text
  const title = new TextRenderable("title", {
    content: "Hello OpenTUI!",
    x: 10,
    y: 5,
    zIndex: 1,
    fg: "#FFFFFF",
  })

  renderer.add(background)
  renderer.add(title)
  renderer.start()
}

main()
```

## Renderables

### Base Renderable Class

All visual elements inherit from `Renderable`:

```typescript
import { Renderable, OptimizedBuffer, RGBA } from "@opentui/core"

class CustomRenderable extends Renderable {
  protected renderSelf(buffer: OptimizedBuffer): void {
    // Custom rendering logic
    buffer.drawText("Custom content", this.x, this.y, RGBA.fromValues(1, 1, 1, 1))
  }
}

const custom = new CustomRenderable("my-custom", {
  x: 10,
  y: 5,
  width: 20,
  height: 3,
  zIndex: 1,
  visible: true,
})
```

### Built-in Renderables

#### TextRenderable

For displaying text with colors and attributes:

```typescript
const text = new TextRenderable("text", {
  content: "Hello World",
  x: 10,
  y: 5,
  zIndex: 1,
  fg: "#FFFFFF", // Foreground color
  bg: "#000000", // Background color
  attributes: 0, // Text attributes (bold, italic, etc.)
  tabStopWidth: 4, // Tab width
})
```

#### BoxRenderable

For drawing boxes with borders:

```typescript
const box = new BoxRenderable("box", {
  x: 5,
  y: 5,
  width: 30,
  height: 10,
  bg: "#001122",
  zIndex: 1,
  borderStyle: "single", // "single", "double", "rounded", "heavy"
  border: true, // or array of sides: ["top", "bottom"]
  borderColor: "#FFFFFF",
  title: "My Box",
  titleAlignment: "center", // "left", "center", "right"
})
```

#### FrameBufferRenderable

For custom drawing with frame buffers:

```typescript
const frameBuffer = renderer.createFrameBuffer("my-fb", {
  width: 50,
  height: 20,
  x: 10,
  y: 5,
  zIndex: 1,
})

// Draw to the frame buffer
frameBuffer.frameBuffer.clear(RGBA.fromInts(0, 0, 0, 255))
frameBuffer.frameBuffer.drawText("Custom drawing", 5, 5, RGBA.fromInts(255, 255, 255, 255))
```

#### StyledTextRenderable

For rich text with styling:

```typescript
import { t, bold, fg, bg } from "@opentui/core"

const styledText = renderer.createStyledText("styled", {
  fragment: t`${bold(fg("#FF0000")("Error:"))} ${fg("#FFFFFF")("Something went wrong")}`,
  width: 50,
  height: 10,
  x: 10,
  y: 5,
  zIndex: 1,
})
```

## UI Elements & Layout

### Layout System

OpenTUI uses Yoga for CSS-like flexbox layouts:

```typescript
import { Layout, ContainerElement, FlexDirection, Align, Justify } from "@opentui/core"

const mainLayout = new Layout("main", {
  x: 0,
  y: 0,
  width: renderer.terminalWidth,
  height: renderer.terminalHeight,
  zIndex: 1,
})

const container = new ContainerElement("container", {
  flexDirection: FlexDirection.Row,
  alignItems: Align.Center,
  justifyContent: Justify.SpaceBetween,
  flexGrow: 1,
  padding: { top: 2, right: 2, bottom: 2, left: 2 },
})

mainLayout.add(container)
renderer.add(mainLayout)
```

### UI Elements

#### InputElement

For text input with validation:

```typescript
import { InputElement, InputElementEvents } from "@opentui/core"

const input = new InputElement("name-input", {
  x: 10,
  y: 5,
  width: 30,
  height: 3,
  zIndex: 1,
  placeholder: "Enter your name...",
  maxLength: 50,
  borderStyle: "single",
  focusedBorderColor: "#00AAFF",
})

input.on(InputElementEvents.CHANGE, (value: string) => {
  console.log("Input changed:", value)
})

input.focus() // Give focus to start typing
```

#### SelectElement

For dropdown/list selection:

```typescript
import { SelectElement, SelectElementEvents } from "@opentui/core"

const select = new SelectElement("options", {
  x: 10,
  y: 5,
  width: 40,
  height: 15,
  zIndex: 1,
  options: [
    { name: "Option 1", description: "First option", value: "opt1" },
    { name: "Option 2", description: "Second option", value: "opt2" },
  ],
  showDescription: true,
  wrapSelection: true,
})

select.on(SelectElementEvents.ITEM_SELECTED, (index: number, option: any) => {
  console.log("Selected:", option.value)
})
```

### Custom Elements

Create custom UI elements by extending `BufferedElement`:

```typescript
import { BufferedElement, ElementOptions } from "@opentui/core"

class ProgressBar extends BufferedElement {
  private progress: number = 0

  constructor(id: string, options: ElementOptions) {
    super(id, options)
  }

  setProgress(value: number): void {
    this.progress = Math.max(0, Math.min(1, value))
    this.needsRefresh = true
  }

  protected refreshContent(contentX: number, contentY: number, contentWidth: number, contentHeight: number): void {
    if (!this.frameBuffer) return

    const fillWidth = Math.floor(contentWidth * this.progress)
    const centerY = Math.floor(contentHeight / 2)

    // Draw progress bar
    for (let x = 0; x < contentWidth; x++) {
      const char = x < fillWidth ? "█" : "░"
      this.frameBuffer.drawText(char, contentX + x, contentY + centerY, this.textColor)
    }
  }
}
```

## Input Handling

### Keyboard Input

```typescript
import { getKeyHandler, type ParsedKey } from "@opentui/core"

const keyHandler = getKeyHandler()

keyHandler.on("keypress", (key: ParsedKey) => {
  console.log("Key pressed:", key.name, key.raw)

  switch (key.name) {
    case "space":
      // Handle spacebar
      break
    case "up":
    case "down":
    case "left":
    case "right":
      // Handle arrow keys
      break
    case "enter":
      // Handle enter
      break
    case "escape":
      // Handle escape
      break
  }

  // Check modifiers
  if (key.ctrl && key.name === "c") {
    process.exit(0)
  }
})
```

### Mouse Input

```typescript
import { MouseEvent, MouseButton } from "@opentui/core"

class ClickableElement extends Renderable {
  protected onMouseEvent(event: MouseEvent): void {
    switch (event.type) {
      case "down":
        if (event.button === MouseButton.LEFT) {
          console.log("Left click at", event.x, event.y)
        }
        break
      case "over":
        console.log("Mouse over")
        break
      case "out":
        console.log("Mouse out")
        break
      case "drag":
        console.log("Dragging")
        break
    }
  }
}
```

## Graphics & Animation

### 3D Graphics with WebGPU

```typescript
import { WGPURenderer, createCanvas } from "@opentui/core"

// Create a 3D canvas
const canvas = createCanvas(renderer, {
  width: 80,
  height: 40,
  x: 10,
  y: 5,
})

// Use Three.js for 3D scenes
import * as THREE from "three"

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000)
const geometry = new THREE.BoxGeometry()
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
const cube = new THREE.Mesh(geometry, material)

scene.add(cube)
camera.position.z = 5

// Animation loop
renderer.setFrameCallback(async (deltaTime: number) => {
  cube.rotation.x += 0.01
  cube.rotation.y += 0.01

  canvas.render(scene, camera)
})
```

### Sprite Animation

```typescript
import { SpriteAnimator, SpriteResourceManager } from "@opentui/core"

const spriteManager = new SpriteResourceManager()
await spriteManager.loadSprite("player", "assets/player.png", {
  frameWidth: 32,
  frameHeight: 32,
  animations: {
    idle: { frames: [0, 1, 2, 3], duration: 1000 },
    run: { frames: [4, 5, 6, 7], duration: 500 },
  },
})

const animator = new SpriteAnimator(spriteManager.getSprite("player"))
animator.play("idle")

// In your render loop
renderer.setFrameCallback(async (deltaTime: number) => {
  animator.update(deltaTime)
  // Render the current frame
})
```

### Timeline Animation

```typescript
import { Timeline } from "@opentui/core"

const timeline = new Timeline()

// Animate position
timeline.to(myRenderable, { x: 100, y: 50 }, 1000) // 1 second
timeline.to(myRenderable, { x: 200 }, 500) // Then move right

// Animate with easing
timeline.to(
  myRenderable,
  {
    x: 0,
    y: 0,
  },
  1000,
  {
    easing: "easeInOutQuad",
    onComplete: () => console.log("Animation complete!"),
  },
)

timeline.play()
```

## Physics Integration

### 2D Physics with Rapier

```typescript
import { RapierPhysicsAdapter } from "@opentui/core"

const physics = new RapierPhysicsAdapter()

// Create physics bodies
const groundBody = physics.createRigidBody({
  type: "fixed",
  position: { x: 0, y: renderer.terminalHeight - 2 },
})

const groundCollider = physics.createCollider({
  shape: "cuboid",
  width: renderer.terminalWidth,
  height: 2,
  body: groundBody,
})

const playerBody = physics.createRigidBody({
  type: "dynamic",
  position: { x: 10, y: 10 },
})

const playerCollider = physics.createCollider({
  shape: "cuboid",
  width: 2,
  height: 4,
  body: playerBody,
})

// Update physics in render loop
renderer.setFrameCallback(async (deltaTime: number) => {
  physics.step(deltaTime / 1000) // Convert to seconds

  // Update renderable positions from physics
  const playerPos = physics.getBodyPosition(playerBody)
  playerRenderable.x = playerPos.x
  playerRenderable.y = playerPos.y
})
```

## Building a Dino Game

Here's a complete example of a simple dino game:

```typescript
import {
  createCliRenderer,
  TextRenderable,
  BoxRenderable,
  getKeyHandler,
  RGBA,
  type ParsedKey,
  type CliRenderer,
} from "@opentui/core"

class DinoGame {
  private renderer: CliRenderer
  private dino: TextRenderable
  private obstacles: BoxRenderable[] = []
  private ground: BoxRenderable
  private score: TextRenderable

  private dinoY: number = 0
  private dinoVelocityY: number = 0
  private isJumping: boolean = false
  private gameSpeed: number = 2
  private currentScore: number = 0
  private gameRunning: boolean = true

  private readonly GRAVITY = 0.8
  private readonly JUMP_FORCE = -15
  private readonly GROUND_Y: number

  constructor(renderer: CliRenderer) {
    this.renderer = renderer
    this.GROUND_Y = renderer.terminalHeight - 5
    this.dinoY = this.GROUND_Y

    this.setupGame()
    this.setupInput()
    this.startGameLoop()
  }

  private setupGame(): void {
    this.renderer.setBackgroundColor("#87CEEB") // Sky blue

    // Create ground
    this.ground = new BoxRenderable("ground", {
      x: 0,
      y: this.GROUND_Y + 2,
      width: this.renderer.terminalWidth,
      height: 3,
      bg: "#8B4513", // Brown
      zIndex: 1,
      border: false,
    })

    // Create dino
    this.dino = new TextRenderable("dino", {
      content: "🦕",
      x: 10,
      y: this.dinoY,
      zIndex: 10,
      fg: "#00FF00",
    })

    // Create score display
    this.score = new TextRenderable("score", {
      content: "Score: 0",
      x: this.renderer.terminalWidth - 15,
      y: 2,
      zIndex: 10,
      fg: "#000000",
    })

    this.renderer.add(this.ground)
    this.renderer.add(this.dino)
    this.renderer.add(this.score)
  }

  private setupInput(): void {
    const keyHandler = getKeyHandler()

    keyHandler.on("keypress", (key: ParsedKey) => {
      if (!this.gameRunning) return

      switch (key.name) {
        case "space":
        case "up":
          this.jump()
          break
        case "escape":
          this.gameRunning = false
          this.renderer.stop()
          break
      }
    })
  }

  private jump(): void {
    if (!this.isJumping) {
      this.isJumping = true
      this.dinoVelocityY = this.JUMP_FORCE
    }
  }

  private startGameLoop(): void {
    this.renderer.setFrameCallback(async (deltaTime: number) => {
      if (!this.gameRunning) return

      this.updateDino()
      this.updateObstacles()
      this.checkCollisions()
      this.updateScore()
      this.spawnObstacles()
    })

    this.renderer.start()
  }

  private updateDino(): void {
    if (this.isJumping) {
      this.dinoVelocityY += this.GRAVITY
      this.dinoY += this.dinoVelocityY

      if (this.dinoY >= this.GROUND_Y) {
        this.dinoY = this.GROUND_Y
        this.dinoVelocityY = 0
        this.isJumping = false
      }
    }

    this.dino.y = Math.floor(this.dinoY)
  }

  private updateObstacles(): void {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i]
      obstacle.x -= this.gameSpeed

      if (obstacle.x + obstacle.width < 0) {
        this.renderer.remove(obstacle.id)
        this.obstacles.splice(i, 1)
        this.currentScore += 10
      }
    }
  }

  private spawnObstacles(): void {
    if (Math.random() < 0.02) {
      // 2% chance per frame
      const obstacle = new BoxRenderable(`obstacle-${Date.now()}`, {
        x: this.renderer.terminalWidth,
        y: this.GROUND_Y - 2,
        width: 3,
        height: 4,
        bg: "#8B4513", // Brown
        zIndex: 5,
        border: false,
      })

      this.obstacles.push(obstacle)
      this.renderer.add(obstacle)
    }
  }

  private checkCollisions(): void {
    const dinoRect = {
      x: this.dino.x,
      y: this.dino.y,
      width: 2,
      height: 2,
    }

    for (const obstacle of this.obstacles) {
      const obstacleRect = {
        x: obstacle.x,
        y: obstacle.y,
        width: obstacle.width,
        height: obstacle.height,
      }

      if (this.isColliding(dinoRect, obstacleRect)) {
        this.gameOver()
        break
      }
    }
  }

  private isColliding(rect1: any, rect2: any): boolean {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    )
  }

  private updateScore(): void {
    this.score.content = `Score: ${this.currentScore}`

    // Increase game speed over time
    this.gameSpeed = 2 + this.currentScore / 100
  }

  private gameOver(): void {
    this.gameRunning = false

    const gameOverText = new TextRenderable("game-over", {
      content: `GAME OVER! Final Score: ${this.currentScore}`,
      x: Math.floor(this.renderer.terminalWidth / 2) - 15,
      y: Math.floor(this.renderer.terminalHeight / 2),
      zIndex: 20,
      fg: "#FF0000",
    })

    this.renderer.add(gameOverText)
  }
}

// Start the game
async function main() {
  const renderer = await createCliRenderer({
    targetFps: 60,
    exitOnCtrlC: false,
  })

  new DinoGame(renderer)
}

main()
```

## Advanced Features

### Post-Processing Effects

```typescript
import { filters } from "@opentui/core"

// Add blur effect
renderer.addPostProcessFn((buffer, deltaTime) => {
  filters.blur(buffer, 1.0)
})

// Add custom effect
renderer.addPostProcessFn((buffer, deltaTime) => {
  // Custom post-processing logic
  for (let y = 0; y < buffer.getHeight(); y++) {
    for (let x = 0; x < buffer.getWidth(); x++) {
      const pixel = buffer.getPixel(x, y)
      // Modify pixel...
      buffer.setPixel(x, y, pixel)
    }
  }
})
```

### Console Integration

```typescript
// Access the built-in console
renderer.console.log("Debug message")
renderer.console.error("Error message")
renderer.console.toggle() // Show/hide console

// Console is accessible with backtick (`) key by default
```

### Performance Monitoring

```typescript
renderer.configureDebugOverlay({
  enabled: true,
  corner: DebugOverlayCorner.topRight,
})

// Get performance stats
const stats = renderer.getStats()
console.log(`FPS: ${stats.fps}, Frame Time: ${stats.averageFrameTime}ms`)
```

## API Reference

### Core Classes

#### CliRenderer

- `createCliRenderer(config?: CliRendererConfig): Promise<CliRenderer>`
- `start(): void` - Start the render loop
- `stop(): void` - Stop the renderer
- `pause(): void` - Pause rendering
- `add(renderable: Renderable): void` - Add a renderable
- `remove(id: string): void` - Remove a renderable
- `setBackgroundColor(color: ColorInput): void`
- `setFrameCallback(callback: (deltaTime: number) => Promise<void>): void`

#### Renderable

- `constructor(id: string, options: RenderableOptions)`
- `add(child: Renderable): void` - Add child renderable
- `remove(id: string): void` - Remove child renderable
- `destroy(): void` - Clean up resources
- Properties: `x`, `y`, `width`, `height`, `zIndex`, `visible`

#### RGBA

- `RGBA.fromValues(r: number, g: number, b: number, a?: number): RGBA`
- `RGBA.fromInts(r: number, g: number, b: number, a?: number): RGBA`
- Properties: `r`, `g`, `b`, `a` (0-1 range)

### Layout System

#### Layout

- `constructor(id: string, options: LayoutOptions)`
- `resize(width: number, height: number): void`

#### Element

- `focus(): void` - Give focus to element
- `blur(): void` - Remove focus from element
- `isFocused(): boolean` - Check if element has focus
- `setBackgroundColor(color: ColorInput): void`
- `setTextColor(color: ColorInput): void`

### Input Elements

#### InputElement

- `getValue(): string` - Get current input value
- `setValue(value: string): void` - Set input value
- `focus(): void` / `blur(): void` - Focus management
- Events: `INPUT`, `CHANGE`, `ENTER`, `FOCUSED`, `BLURRED`

#### SelectElement

- `getSelectedIndex(): number` - Get selected option index
- `setSelectedIndex(index: number): void` - Set selected option
- `getSelectedOption(): SelectOption | null` - Get selected option
- Events: `ITEM_SELECTED`, `SELECTION_CHANGED`

### Constants

#### TextAttributes

- `NONE`, `BOLD`, `DIM`, `ITALIC`, `UNDERLINE`, `BLINK`, `INVERSE`, `HIDDEN`, `STRIKETHROUGH`

#### MouseButton

- `LEFT`, `MIDDLE`, `RIGHT`, `WHEEL_UP`, `WHEEL_DOWN`

#### FlexDirection

- `Row`, `Column`, `RowReverse`, `ColumnReverse`

#### Align

- `Auto`, `FlexStart`, `Center`, `FlexEnd`, `Stretch`, `Baseline`, `SpaceBetween`, `SpaceAround`

This documentation provides a comprehensive guide to using OpenTUI for building terminal applications, including the specific example of a dino game. The library offers powerful features for creating rich, interactive terminal experiences with modern web technologies.
