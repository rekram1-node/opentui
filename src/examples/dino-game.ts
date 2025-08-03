#!/usr/bin/env bun

import {
  CliRenderer,
  createCliRenderer,
  TextRenderable,
  GroupRenderable,
  type ParsedKey,
  RGBA,
  ThreeCliRenderer,
} from "../index"
import { getKeyHandler } from "../ui/lib/KeyHandler"
import { setupStandaloneDemoKeys } from "./lib/standalone-keys"
import { SpriteUtils } from "../3d/SpriteUtils"
import * as THREE from "three"

// @ts-ignore
import dinoRun1Path from "./assets/DinoRun1.png" with { type: "image/png" }
// @ts-ignore
import dinoRun2Path from "./assets/DinoRun2.png" with { type: "image/png" }
// @ts-ignore
import dinoDuck1Path from "./assets/DinoDuck1.png" with { type: "image/png" }
// @ts-ignore
import dinoDuck2Path from "./assets/DinoDuck2.png" with { type: "image/png" }
// @ts-ignore
import largeCactus1Path from "./assets/LargeCactus1.png" with { type: "image/png" }
// @ts-ignore
import largeCactus3Path from "./assets/LargeCactus3.png" with { type: "image/png" }

interface DinoGameState {
  renderer: CliRenderer
  parentContainer: GroupRenderable
  ground: TextRenderable
  groundTextureElements: TextRenderable[]
  clouds: TextRenderable[]
  titleText: TextRenderable
  instructionsText: TextRenderable
  scoreText: TextRenderable
  keyHandler: ((key: ParsedKey) => void) | null
  engine: ThreeCliRenderer | null
  scene: THREE.Scene | null
  camera: THREE.OrthographicCamera | null
  dinoSprite: THREE.Sprite | null
  dinoSprite2: THREE.Sprite | null
  dinoDuckSprite: THREE.Sprite | null
  dinoDuckSprite2: THREE.Sprite | null
  animationTime: number
  isRunning: boolean
  isDucking: boolean
  gameStarted: boolean
  groundScrollOffset: number
  score: number
  scoreTimer: number
  cacti: THREE.Sprite[]
  cactusSpawnTimer: number
  nextCactusDistance: number
  gameOver: boolean
  gameOverText: TextRenderable
  restartText: TextRenderable
}

let gameState: DinoGameState | null = null

export async function run(renderer: CliRenderer): Promise<void> {
  renderer.setBackgroundColor("#F7F7F7") // Light gray/white background like Chrome dino
  renderer.start()

  const parentContainer = new GroupRenderable("dino-game-container", {
    x: 0,
    y: 0,
    zIndex: 10,
    visible: true,
  })
  renderer.add(parentContainer)

  // Create 3D rendering context for sprites
  const { frameBuffer } = renderer.createFrameBuffer("dino-3d", {
    width: renderer.terminalWidth,
    height: renderer.terminalHeight,
    x: 0,
    y: 0,
    zIndex: 5,
  })

  const engine = new ThreeCliRenderer(renderer, {
    width: renderer.terminalWidth,
    height: renderer.terminalHeight,
    focalLength: 1,
    backgroundColor: RGBA.fromValues(0.97, 0.97, 0.97, 1.0), // Match background but opaque
  })
  await engine.init()

  const scene = new THREE.Scene()

  // Create orthographic camera for 2D sprite rendering (matching working example)
  const aspectRatio = engine.aspectRatio
  const frustumSize = 1 // Use same frustum size as working example
  const camera = new THREE.OrthographicCamera(
    (frustumSize * aspectRatio) / -2, // left
    (frustumSize * aspectRatio) / 2, // right
    frustumSize / 2, // top
    frustumSize / -2, // bottom
    0.1, // near
    1000, // far
  )
  camera.position.z = 5
  scene.add(camera)
  engine.setActiveCamera(camera)

  // Load both dino sprites for running animation
  const dinoSprite = await SpriteUtils.fromFile(dinoRun1Path, {
    materialParameters: {
      alphaTest: 0.5, // Higher threshold to cut off semi-transparent pixels at feet
      transparent: true,
      depthWrite: false,
    },
  })

  const dinoSprite2 = await SpriteUtils.fromFile(dinoRun2Path, {
    materialParameters: {
      alphaTest: 0.5,
      transparent: true,
      depthWrite: false,
    },
  })

  const dinoDuckSprite = await SpriteUtils.fromFile(dinoDuck1Path, {
    materialParameters: {
      alphaTest: 0.5,
      transparent: true,
      depthWrite: false,
    },
  })

  const dinoDuckSprite2 = await SpriteUtils.fromFile(dinoDuck2Path, {
    materialParameters: {
      alphaTest: 0.5,
      transparent: true,
      depthWrite: false,
    },
  })

  // Simple approach: position dino in 3D world coordinates
  // Ground is at 75% down the screen, so in 3D world that's -0.25 (since 0.75 - 0.5 = 0.25 below center)
  const worldGroundY = -0.25

  // Position dino standing on the ground - sprite center should be above ground level
  const dinoWorldY = worldGroundY + 0.08 // Dino center slightly above ground (adjusted for smaller size)
  const dinoPosition = { x: (frustumSize * aspectRatio) / -2 + 0.2, y: dinoWorldY, z: 0 }
  const dinoScale = { x: 0.15, y: 0.15, z: 0.15 } // Reduced from 0.2 to make dino smaller

  dinoSprite.position.set(dinoPosition.x, dinoPosition.y, dinoPosition.z)
  dinoSprite.scale.set(dinoScale.x, dinoScale.y, dinoScale.z)

  dinoSprite2.position.set(dinoPosition.x, dinoPosition.y, dinoPosition.z)
  dinoSprite2.scale.set(dinoScale.x, dinoScale.y, dinoScale.z)

  // Position ducking sprites at same height as running sprites
  // Use smaller scale for ducking sprites to match visual size of running sprites
  const duckScale = { x: dinoScale.x * 0.8, y: dinoScale.y * 0.8, z: dinoScale.z * 0.8 }

  const duckWorldY = dinoPosition.y - 0.02 // Slightly lower than running position

  dinoDuckSprite.position.set(dinoPosition.x, duckWorldY, dinoPosition.z)
  dinoDuckSprite.scale.set(duckScale.x, duckScale.y, duckScale.z)

  dinoDuckSprite2.position.set(dinoPosition.x, duckWorldY, dinoPosition.z)
  dinoDuckSprite2.scale.set(duckScale.x, duckScale.y, duckScale.z)

  // Start with first running sprite visible
  scene.add(dinoSprite)
  dinoSprite2.visible = false
  scene.add(dinoSprite2)

  // Add ducking sprites (initially hidden)
  dinoDuckSprite.visible = false
  dinoDuckSprite2.visible = false
  scene.add(dinoDuckSprite)
  scene.add(dinoDuckSprite2)

  // Load cactus sprites for obstacles
  const cactus1Template = await SpriteUtils.fromFile(largeCactus1Path, {
    materialParameters: {
      alphaTest: 0.5,
      transparent: true,
      depthWrite: false,
    },
  })

  const cactus3Template = await SpriteUtils.fromFile(largeCactus3Path, {
    materialParameters: {
      alphaTest: 0.5,
      transparent: true,
      depthWrite: false,
    },
  })

  // Cactus obstacle system
  const cacti: THREE.Sprite[] = []
  let cactusSpawnTimer = 0
  let nextCactusDistance = 800 + Math.random() * 400 // Initial spawn distance (0.8-1.2 seconds at 60fps)
  const CACTUS_SCROLL_SPEED = 0.008 // Speed cacti move towards dino
  const MIN_CACTUS_SPACING = 800 // Minimum time between cacti (ms)
  const MAX_CACTUS_SPACING = 1800 // Maximum time between cacti (ms)
  const CACTUS_SCALE = 0.12 // Scale for cactus sprites

  let animationTime = 0
  let isRunning = true
  let isDucking = false
  let gameStarted = false
  let gameOver = false
  let score = 0
  let scoreTimer = 0

  // Physics-based jump state
  let jumpVelocity = 0 // Current vertical velocity
  let isJumping = false
  const JUMP_INITIAL_VELOCITY = 0.02 // Initial upward velocity when jumping
  const GRAVITY = 0.0008 // Gravity acceleration (pulls dino down)

  // Scrolling state
  let groundScrollOffset = 0
  const GROUND_SCROLL_SPEED = 1.5 // Faster for foreground

  // Create ground line with texture (like Chrome dino)
  const groundY = Math.floor(renderer.terminalHeight * 0.75) // Ground at 75% down
  // Main ground line
  const ground = new TextRenderable("ground", {
    content: "─".repeat(renderer.terminalWidth), // Horizontal line across screen
    x: 0,
    y: groundY,
    fg: "#535353", // Dark gray
    zIndex: 2,
  })
  parentContainer.add(ground)

  // Ground texture with vertical jitter (like Chrome dino game)
  const createGroundTextureLines = (width: number, height: number = 2) => {
    const lines: string[] = []
    for (let row = 0; row < height; row++) {
      let line = ""
      for (let col = 0; col < width; col++) {
        const rand = Math.random()
        // Vary density by row - more sparse as we go down
        const density = Math.max(0.4, 0.7 - row * 0.2)

        if (rand < density * 0.6) {
          line += "·" // Small dot
        } else if (rand < density * 0.8) {
          line += "-" // Small dash
        } else if (rand < density * 0.9) {
          line += "." // Period for variation
        } else {
          line += " " // Empty space
        }
      }
      lines.push(line)
    }
    return lines
  }

  // Create multiple texture lines for vertical jitter
  const textureLines = createGroundTextureLines(renderer.terminalWidth, 2)
  const groundTextureElements: TextRenderable[] = []

  textureLines.forEach((line, index) => {
    const textureElement = new TextRenderable(`ground-texture-${index}`, {
      content: line,
      x: 0,
      y: groundY + 1 + index,
      fg: "#535353", // Dark gray
      zIndex: 2,
    })
    parentContainer.add(textureElement)
    groundTextureElements.push(textureElement)
  })

  // Add some clouds in the background at various heights
  const cloudLines = ["⠀⠀⠀⣀⡀⠀⢀⠀⠀⠀", "⠀⣀⠚⠀⠁⠈⠀⠹⣄⠀", "⠸⣀⡀⠀⠀⠀⠀⢀⡸⠃", "⠀⠀⠳⠴⠒⠶⠞⠁⠀⠀"]

  // Cloud positions - randomized and spread out horizontally
  const cloudPositions = [
    { x: 0.05, y: 0.08 + Math.random() * 0.06 }, // Far left
    { x: 0.25, y: 0.12 + Math.random() * 0.08 }, // Left
    { x: 0.45, y: 0.06 + Math.random() * 0.1 }, // Center-left
    { x: 0.65, y: 0.14 + Math.random() * 0.07 }, // Center-right
    { x: 0.85, y: 0.09 + Math.random() * 0.09 }, // Right
    { x: 0.15, y: 0.2 + Math.random() * 0.05 }, // Lower left
    { x: 0.75, y: 0.22 + Math.random() * 0.06 }, // Lower right
  ]

  const clouds: TextRenderable[] = []

  cloudPositions.forEach((pos, cloudIndex) => {
    const cloudX = Math.floor(renderer.terminalWidth * pos.x)
    const cloudY = Math.floor(renderer.terminalHeight * pos.y)

    cloudLines.forEach((line, lineIndex) => {
      const cloudLine = new TextRenderable(`cloud-${cloudIndex}-line-${lineIndex}`, {
        content: line,
        x: cloudX,
        y: cloudY + lineIndex,
        fg: "#AAAAAA", // Light gray clouds
        zIndex: 1,
      })
      parentContainer.add(cloudLine)
      clouds.push(cloudLine)
    })
  })

  // Add title
  const titleContent = "DINO GAME"
  const titleText = new TextRenderable("title", {
    content: titleContent,
    x: Math.floor(renderer.terminalWidth / 2) - Math.floor(titleContent.length / 2),
    y: 2,
    fg: "#535353", // Dark gray text
    zIndex: 10,
  })
  parentContainer.add(titleText)

  // Add instructions
  const instructionsContent = "Press SPACE to start running"
  const instructionsText = new TextRenderable("instructions", {
    content: instructionsContent,
    x: Math.floor(renderer.terminalWidth / 2) - Math.floor(instructionsContent.length / 2),
    y: 4,
    fg: "#535353", // Dark gray text
    zIndex: 10,
  })
  parentContainer.add(instructionsText)

  // Add score display (Chrome dino style - top right, bigger)
  const scoreContent = "SCORE: 00000"
  const scoreText = new TextRenderable("score", {
    content: scoreContent,
    x: renderer.terminalWidth - scoreContent.length - 2, // Right aligned with padding
    y: 2,
    fg: "#535353", // Dark gray text
    zIndex: 10,
  })
  parentContainer.add(scoreText)

  // Add game over text (initially hidden) - using ASCII art style like the original
  const gameOverContent = "G A M E   O V E R"
  const gameOverText = new TextRenderable("game-over", {
    content: gameOverContent,
    x: Math.floor(renderer.terminalWidth / 2) - Math.floor(gameOverContent.length / 2),
    y: Math.floor(renderer.terminalHeight / 2),
    fg: "#535353", // Dark gray to match game style
    zIndex: 15,
    visible: false, // Hidden initially
  })
  parentContainer.add(gameOverText)

  // Add restart instruction below
  const restartContent = "Press SPACE to restart"
  const restartText = new TextRenderable("restart-instruction", {
    content: restartContent,
    x: Math.floor(renderer.terminalWidth / 2) - Math.floor(restartContent.length / 2),
    y: Math.floor(renderer.terminalHeight / 2) + 2,
    fg: "#535353", // Dark gray to match game style
    zIndex: 15,
    visible: false, // Hidden initially
  })
  parentContainer.add(restartText)

  // Track ducking state with timeout-based release detection
  let duckingTimeout: NodeJS.Timeout | null = null
  const DUCKING_TIMEOUT = 100 // ms - if no down key pressed within this time, stop ducking

  // Handle keyboard input
  const keyHandler = (key: ParsedKey) => {
    switch (key.name) {
      case "space":
        if (gameOver) {
          // Restart the game
          gameOver = false
          gameStarted = false
          score = 0
          scoreTimer = 0
          cactusSpawnTimer = 0
          nextCactusDistance = 800 + Math.random() * 400
          isJumping = false
          isDucking = false
          jumpVelocity = 0
          animationTime = 0

          // Reset dino position
          dinoSprite.position.y = dinoWorldY
          dinoSprite2.position.y = dinoWorldY
          dinoDuckSprite.position.y = duckWorldY
          dinoDuckSprite2.position.y = duckWorldY

          // Clear all cacti
          cacti.forEach((cactus) => scene.remove(cactus))
          cacti.length = 0

          // Reset UI
          gameOverText.visible = false
          restartText.visible = false
          instructionsText.content = "Press SPACE to start running"
          instructionsText.x = Math.floor(renderer.terminalWidth / 2) - Math.floor(instructionsText.content.length / 2)
          scoreText.content = "SCORE: 00000"

          console.log("Game restarted!")
        } else if (!gameStarted) {
          // Start the game
          gameStarted = true
          instructionsText.content = "Press SPACE to jump, DOWN to duck"
          instructionsText.x = Math.floor(renderer.terminalWidth / 2) - Math.floor(instructionsText.content.length / 2)
          console.log("Game started!")
        } else if (!gameOver) {
          // Start jump if not already jumping and not ducking
          if (!isJumping && !isDucking) {
            isJumping = true
            jumpVelocity = JUMP_INITIAL_VELOCITY // Give initial upward velocity
            console.log("Jump started!")
          }
        }
        break
      case "down":
        if (gameStarted && !isJumping) {
          if (!isDucking) {
            isDucking = true
            console.log("Ducking started!")
          }

          // Reset the timeout - keep ducking as long as down key is being pressed
          if (duckingTimeout) {
            clearTimeout(duckingTimeout)
          }
          duckingTimeout = setTimeout(() => {
            isDucking = false
            console.log("Ducking stopped!")
            duckingTimeout = null
          }, DUCKING_TIMEOUT)
        }
        break
      default:
        // Any other key stops ducking (simulates key release)
        if (isDucking && key.name !== "down") {
          isDucking = false
          if (duckingTimeout) {
            clearTimeout(duckingTimeout)
            duckingTimeout = null
          }
          console.log("Ducking stopped by other key!")
        }
        break
    }
  }
  getKeyHandler().on("keypress", keyHandler)

  // Helper function to create a new cactus sprite
  const createCactus = (template: THREE.Sprite, x: number): THREE.Sprite => {
    const cactus = template.clone()
    cactus.material = template.material.clone()
    cactus.position.set(x, worldGroundY + 0.06, 0) // Position on ground
    cactus.scale.set(CACTUS_SCALE, CACTUS_SCALE, CACTUS_SCALE)
    scene.add(cactus)
    return cactus
  }

  // Helper function to check collision between dino and cactus
  const checkCollision = (dinoSprite: THREE.Sprite, cactus: THREE.Sprite): boolean => {
    const dinoBox = {
      x: dinoSprite.position.x - dinoScale.x * 0.4, // Slightly smaller hitbox for fairness
      y: dinoSprite.position.y - dinoScale.y * 0.4,
      width: dinoScale.x * 0.8,
      height: dinoScale.y * 0.8,
    }

    const cactusBox = {
      x: cactus.position.x - CACTUS_SCALE * 0.4,
      y: cactus.position.y - CACTUS_SCALE * 0.4,
      width: CACTUS_SCALE * 0.8,
      height: CACTUS_SCALE * 0.8,
    }

    return (
      dinoBox.x < cactusBox.x + cactusBox.width &&
      dinoBox.x + dinoBox.width > cactusBox.x &&
      dinoBox.y < cactusBox.y + cactusBox.height &&
      dinoBox.y + dinoBox.height > cactusBox.y
    )
  }

  // Add 3D rendering and animation to frame callback
  renderer.setFrameCallback(async (deltaTime: number) => {
    // Update scrolling when game has started and is not over
    if (gameStarted && !gameOver) {
      // Update cactus spawning timer
      cactusSpawnTimer += deltaTime

      // Spawn new cactus if it's time
      if (cactusSpawnTimer >= nextCactusDistance) {
        // Choose random cactus type
        const template = Math.random() < 0.5 ? cactus1Template : cactus3Template
        const rightEdge = (frustumSize * aspectRatio) / 2 + 0.2 // Start off-screen to the right
        const newCactus = createCactus(template, rightEdge)
        cacti.push(newCactus)

        // Reset timer and set next spawn distance
        cactusSpawnTimer = 0
        nextCactusDistance = MIN_CACTUS_SPACING + Math.random() * (MAX_CACTUS_SPACING - MIN_CACTUS_SPACING)
      }

      // Update cactus positions (move them left) and check collisions
      for (let i = cacti.length - 1; i >= 0; i--) {
        const cactus = cacti[i]
        cactus.position.x -= CACTUS_SCROLL_SPEED

        // Check collision with dino (use the currently visible dino sprite)
        if (!gameOver) {
          const activeDinoSprite = isDucking
            ? dinoDuckSprite.visible
              ? dinoDuckSprite
              : dinoDuckSprite2
            : dinoSprite.visible
              ? dinoSprite
              : dinoSprite2

          if (checkCollision(activeDinoSprite, cactus)) {
            // Game over!
            gameOver = true
            gameOverText.visible = true // Show game over text
            restartText.visible = true // Show restart instruction
            console.log("Game Over! Final score:", score)
          }
        }

        // Remove cacti that have moved off-screen to the left
        const leftEdge = (frustumSize * aspectRatio) / -2 - 0.2
        if (cactus.position.x < leftEdge) {
          scene.remove(cactus)
          cacti.splice(i, 1)
        }
      }
      // Update score timer and increment score faster (every 100ms) - only if game is not over
      if (!gameOver) {
        scoreTimer += deltaTime
        if (scoreTimer >= 100) {
          // 100ms = 0.1 second (10 times faster)
          score += 1
          scoreTimer = 0
          // Update score display with Chrome dino style formatting (5 digits, zero-padded)
          scoreText.content = `SCORE: ${score.toString().padStart(5, "0")}`
        }
      }

      // Update ground texture positions (faster foreground effect) - only if game is not over
      if (!gameOver) {
        groundScrollOffset += GROUND_SCROLL_SPEED
        const scrollPixels = Math.floor(groundScrollOffset)

        groundTextureElements.forEach((element) => {
          // Shift the content by creating a new scrolled version
          const originalContent = element.content
          const shiftAmount = scrollPixels % originalContent.length
          element.content = originalContent.slice(shiftAmount) + originalContent.slice(0, shiftAmount)
        })
      }
    }

    // Update physics-based jump
    if (isJumping) {
      // Apply gravity to velocity (always pulls down)
      jumpVelocity -= GRAVITY

      // Update position based on velocity
      const currentHeight = dinoSprite.position.y - dinoWorldY
      const newHeight = currentHeight + jumpVelocity

      // Check if dino has landed (reached ground level or below)
      if (newHeight <= 0) {
        // Land on ground - sprites return to their ground positions
        dinoSprite.position.y = dinoWorldY
        dinoSprite2.position.y = dinoWorldY
        dinoDuckSprite.position.y = duckWorldY
        dinoDuckSprite2.position.y = duckWorldY
        isJumping = false
        jumpVelocity = 0
        console.log("Jump finished!")
      } else {
        // Still in air - update positions maintaining relative heights
        const newY = dinoWorldY + newHeight
        const newDuckY = duckWorldY + newHeight
        dinoSprite.position.y = newY
        dinoSprite2.position.y = newY
        dinoDuckSprite.position.y = newDuckY
        dinoDuckSprite2.position.y = newDuckY
        console.log(
          `Jump: velocity=${jumpVelocity.toFixed(4)}, height=${newHeight.toFixed(3)}, spriteY=${newY.toFixed(3)}`,
        )
      }
    }

    // Update animation only if game has started and is not over
    if (isRunning && gameStarted && !gameOver) {
      animationTime += deltaTime
      const animationSpeed = 200 // milliseconds per frame

      if (animationTime >= animationSpeed) {
        if (isDucking) {
          // Hide running sprites, show ducking sprites
          dinoSprite.visible = false
          dinoSprite2.visible = false

          // Toggle between ducking sprites
          if (dinoDuckSprite.visible) {
            dinoDuckSprite.visible = false
            dinoDuckSprite2.visible = true
          } else {
            dinoDuckSprite.visible = true
            dinoDuckSprite2.visible = false
          }
        } else {
          // Hide ducking sprites, show running sprites
          dinoDuckSprite.visible = false
          dinoDuckSprite2.visible = false

          // Toggle between running sprites
          if (dinoSprite.visible) {
            dinoSprite.visible = false
            dinoSprite2.visible = true
          } else {
            dinoSprite.visible = true
            dinoSprite2.visible = false
          }
        }
        animationTime = 0
      }
    }

    await engine.drawScene(scene, frameBuffer, deltaTime)
  })

  // Handle resize
  renderer.on("resize", (width: number, height: number) => {
    // Update framebuffer
    frameBuffer.resize(width, height)

    // Update 3D camera
    const newAspectRatio = engine.aspectRatio
    camera.left = (frustumSize * newAspectRatio) / -2
    camera.right = (frustumSize * newAspectRatio) / 2
    camera.top = frustumSize / 2
    camera.bottom = frustumSize / -2
    camera.updateProjectionMatrix()

    // Update ground line
    const newGroundY = Math.floor(height * 0.75)
    ground.content = "─".repeat(width)
    ground.y = newGroundY

    // Update ground texture elements
    const newTextureLines = createGroundTextureLines(width, 2)
    groundTextureElements.forEach((element, index) => {
      element.content = newTextureLines[index] || ""
      element.y = newGroundY + 1 + index
    })

    // Update cloud positions
    cloudPositions.forEach((pos, cloudIndex) => {
      const cloudX = Math.floor(width * pos.x)
      const cloudY = Math.floor(height * pos.y)

      cloudLines.forEach((_, lineIndex) => {
        const cloudLine = clouds.find((c) => c.id === `cloud-${cloudIndex}-line-${lineIndex}`)
        if (cloudLine) {
          cloudLine.x = cloudX
          cloudLine.y = cloudY + lineIndex
        }
      })
    })

    // Update title position
    titleText.x = Math.floor(width / 2) - Math.floor(titleText.content.length / 2)

    // Update instructions position
    instructionsText.x = Math.floor(width / 2) - Math.floor(instructionsText.content.length / 2)

    // Update score position (keep right-aligned)
    scoreText.x = width - scoreText.content.length - 2
  })

  gameState = {
    renderer,
    parentContainer,
    ground,
    groundTextureElements,
    clouds,
    titleText,
    instructionsText,
    scoreText,
    keyHandler,
    engine,
    scene,
    camera,
    dinoSprite,
    dinoSprite2,
    dinoDuckSprite,
    dinoDuckSprite2,
    animationTime,
    isRunning,
    isDucking,
    gameStarted,
    groundScrollOffset,
    score,
    scoreTimer,
    cacti,
    cactusSpawnTimer,
    nextCactusDistance,
    gameOver,
    gameOverText,
    restartText,
  }
}

export function destroy(renderer: CliRenderer): void {
  if (gameState) {
    if (gameState.keyHandler) {
      getKeyHandler().off("keypress", gameState.keyHandler)
    }

    // Clean up 3D resources
    if (gameState.dinoSprite && gameState.scene) {
      gameState.scene.remove(gameState.dinoSprite)
    }
    if (gameState.dinoSprite2 && gameState.scene) {
      gameState.scene.remove(gameState.dinoSprite2)
    }
    if (gameState.dinoDuckSprite && gameState.scene) {
      gameState.scene.remove(gameState.dinoDuckSprite)
    }
    if (gameState.dinoDuckSprite2 && gameState.scene) {
      gameState.scene.remove(gameState.dinoDuckSprite2)
    }

    // Clean up cacti
    if (gameState.cacti && gameState.scene) {
      gameState.cacti.forEach((cactus) => {
        gameState!.scene!.remove(cactus)
      })
    }

    if (gameState.engine) {
      gameState.engine.destroy()
    }

    renderer.remove("dino-game-container")
    renderer.remove("dino-3d")
    renderer.clearFrameCallbacks()

    gameState = null
  }
}

if (import.meta.main) {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    targetFps: 60,
  })

  await run(renderer)
  setupStandaloneDemoKeys(renderer)
}
