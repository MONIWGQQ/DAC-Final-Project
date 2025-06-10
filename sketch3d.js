// p5.js 3D Mountain Terrain Demo (WEBGL)
// Generate a rotatable mountain terrain patch with soft style and gradient sky
let cols, rows;
let scl = 10; // Smaller grid size for more detailed fragments
let w = 1200; // Terrain width
let h = 900;  // Terrain height
let terrain = [];

// Animal sound system
let animalSounds = {
  // Sound objects will be loaded in preload()
  dog: {
    bark: null,
    whine: null,
    pant: null
  },
  cow: {
    moo: null,
    chew: null
  },
  sheep: {
    baa: null,
    bleat: null
  },
  rabbit: {
    squeak: null,
    thump: null
  },
  ambient: {
    birds: null,
    wind: null
  }
};

// Sound playing control
let soundSettings = {
  enabled: true,
  volume: 0.3,
  animalSoundCooldown: {},  // Prevent sounds from playing too frequently
  lastSoundTime: {},        // Track last sound time for each animal
  soundInterval: 3000       // Minimum interval between sounds (milliseconds)
};

// Flood fill state variables for water bodies
let flooded = null;
let floodQueue = [];

// House parameters
const houseGridX = 10;
const houseGridY = 10;
const houseSize = 7; // Consistent with collision detection
const houseAvoidRadius = Math.max(20, Math.ceil((houseSize * 3.5) * (10 / scl))); // Further increase avoidance radius, minimum 20

// House door parameters
let houseDoor = {
  isOpen: false,        // Whether door is open
  openAngle: 0,         // Current door angle (0 = closed, PI/2 = fully open)
  targetAngle: 0,       // Target door angle
  animationSpeed: 0.1,  // Door animation speed
  canInteract: false,   // Whether pumpkin can interact with door
  side: 'east'          // Door position: 'east' (right side)
};

// Fountain parameters
let fountain = {
  gridX: 50,           // Fountain X position (grid coordinates)
  gridY: 50,           // Fountain Y position (grid coordinates)
  baseRadius: 30,      // Base radius
  particles: [],       // Water droplet particle array
  time: 0,            // Time counter
  active: true        // Whether fountain is active
};

// === Free Camera Parameters ===
let freeCam = {
  // Camera position
  x: 0,
  y: 0, 
  z: 500,
  
  // Target point (usually scene center)
  targetX: 0,
  targetY: 0,
  targetZ: 0,
  
  // Spherical coordinate parameters
  distance: 800,     // Distance to target
  angleHorizontal: 0, // Horizontal angle (around Z-axis)
  angleVertical: -0.3, // Vertical angle (pitch)
  
  // Control parameters
  rotateSpeed: 0.005,   // Rotation speed
  zoomSpeed: 1.1,       // Zoom speed
  minDistance: 200,     // Minimum distance
  maxDistance: 2000     // Maximum distance
};

// === Scene Parameters (Legacy translate mode parameters, kept for compatibility) ===
// Using more intuitive angle units
let rotationX = -75; // X-axis rotation (degrees: -90 to 0, -90 is top-down view, 0 is side view)
let rotationY = 0; // Y-axis rotation (degrees: -180 to 180, negative values turn left, positive turn right)
let rotationZ = 0; // Z-axis rotation (degrees: -180 to 180, controls terrain tilt)
let terrainScale = 0.700; // Terrain scale ratio
let offsetX = -200;     // X-axis offset
let offsetY = -70;   // Y-axis offset
let offsetZ = -370;  // Z-axis offset

// Mouse interaction variables
let mouseStartX = 0;
let mouseStartY = 0;
let isDragging = false;
let isShiftPressed = false; // Used to control Z-axis rotation
let isAltPressed = false;   // Used to control position offset

// Keyboard control variables
let isLeftPressed = false;
let isRightPressed = false;
let isUpPressed = false;
let isDownPressed = false;
let moveSpeed = 10; // Movement speed

// Calculate radian values (internal use)
let angleX, angleY, angleZ;

// Object lists
let treeList = [];
let grassList = [];
let stoneList = []; 
let bgGraphics;
let hillsList = []; // New: hill list
let sheepList = [];
let rabbitList = []; // New: rabbit list
let cowList = []; // New: cow list // New: sheep flock list
let lampList = []; // New lamp array

// Fence data
let fenceArea = {
  centerX: 0,      // Center X coordinate (grid)
  centerY: 0,      // Center Y coordinate (grid)
  width: 15,       // Width (grid units)
  height: 15,      // Height (grid units)
  postHeight: 30,  // Fence post height
  postSpacing: 3,  // Fence post spacing (grid units)
  railHeight: 15,  // Rail height
  gateWidth: 4,    // Gate width
  gatePos: 0,      // Gate position (0-3: North East South West)
  posts: [],       // Fence post array
  rails: [],       // Rail array
  isPlaced: false  // Whether placed
};

// Pumpkin character variables
let pumpkinMan = {
  gridX: 30,     // Grid coordinate X
  gridY: 30,     // Grid coordinate Y
  height: 0,     // Height (based on terrain)
  size: 15,      // Pumpkin size
  moveSpeed: 0.5,  // Movement speed (slowed down for testing)
  rotationY: 0,  // Facing direction
  eyesColor: [255, 255, 0], // Eye color
  mouthColor: [30, 30, 30],  // Mouth color
  springTurns: 4, // Number of spring eye turns
  springRadius: 0.08, // Spring eye radius coefficient
  springHeight: 0.2,  // Spring eye height coefficient
  isJumping: false,   // Whether jumping
  jumpHeight: 0,      // Current jump height
  jumpPhase: 0,       // Jump phase (0-1)
  maxJumpHeight: 60,  // Maximum jump height
  jumpSpeed: 0.05     // Jump speed
};

// Bridge parameters
let bridge = {
  centerCol: 30,      // Bridge center X coordinate (column)
  width: 4,           // Bridge width (grid units)
  length: 12,         // Bridge length (grid units)
  height: 20,         // Bridge height (above water), reduced from 30 to 20
  planksCount: 10,    // Number of bridge planks
  railingHeight: 15   // Railing height
};

// Second bridge parameters - different style bridge
let bridge2 = {
  centerCol: 70,      // Second bridge center X coordinate (column) - placed on other side of river
  width: 5,           // Bridge width slightly larger
  length: 14,         // Bridge length slightly larger
  height: 25,         // Bridge height slightly higher
  planksCount: 12,    // More bridge planks
  railingHeight: 18,  // Higher railing
  style: 'stone',     // Stone bridge style, different from wooden bridge
  waterLevel: -20     // Maintain same water level as first bridge
};

// Boat item parameters
let boatItem = {
  gridX: 10,        // Boat X coordinate (default at bridge center)
  gridY: 10,         // Boat Y coordinate (default at bridge center)
  height: 0,        // Height (based on terrain)
  size: 40,         // Boat size
  collected: false, // Whether collected
  active: true,     // Whether active
  rotation: 0,      // Rotation angle
  bobHeight: 0,     // Vertical bobbing height
  glowIntensity: 0  // Glow intensity
};

// Emergency state parameters
let emergency = {
  active: false,    // Whether emergency state is active
  timer: 0,         // Emergency state timer (seconds)
  maxTime: 7,      // Maximum duration (seconds), reduced to 7 for faster animation
  waterLevel: 0,    // Current water level height
  maxWaterLevel: 0, // Maximum water level height (wall height)
  pumpkinSaved: false, // Whether pumpkin is rescued
  boatRideActive: false, // Whether pumpkin is on boat
  boatX: 0,         // Rescue boat X coordinate
  boatY: 0,         // Rescue boat Y coordinate
  boatHeight: 0,    // Rescue boat height
  fragmentTimer: 0  // Terrain fragmentation timer
};

// L-key emergency mode parameters
let fountainChallenge = {
  active: false,    // Whether fountain challenge is active
  timer: 0,         // Challenge timer (seconds)
  maxTime: 10,      // Maximum time limit (10 seconds)
  pumpkinTouchedFountain: false, // Whether pumpkin touched fountain
  grayScaleMode: false,   // Whether entered grayscale mode
  allObjectsFrozen: false // Whether all objects are frozen
};

// Camera mode (true for follow view, false for free view)
let followCamera = true;

// Terrain style options
let terrainStyle = 'mountains'; 

// Wall data variable declarations
let walls = [];

// Add pumpkin viewpoint offset variables
let pumpkinViewOffsetX = 0;  // Horizontal viewpoint offset
let pumpkinViewOffsetY = 0;  // Vertical viewpoint offset
let pumpkinViewDistance = 90; // View distance

// Add key state variables, track whether keys have been processed
let leftKeyPressed = false;
let rightKeyPressed = false;
let targetRotation = 0; // Target rotation angle
let isRotating = false; // Whether currently rotating

// New: global variables for fragment data
let fragmentPieces = [];
let fragmentActive = false;
let fragmentStartTime = 0;
const FRAGMENT_DURATION = 50; // Fragmentation animation lasts 50 seconds

// Add floating text effect array
let floatingTexts = [];

// HTML text elements
let countdownText;
let gameInfoText;
let gameInstructionsText;

// Preload function - Load animal sounds
function preload() {
  // Note: You need to add actual sound files to your project
  // For now, we'll create placeholder sound loading
  console.log("Loading animal sounds...");
  
  // Try to load sounds, but handle errors gracefully
  try {
    // Dog sounds
    // animalSounds.dog.bark = loadSound('sounds/dog_bark.mp3');
    // animalSounds.dog.whine = loadSound('sounds/dog_whine.mp3');
    // animalSounds.dog.pant = loadSound('sounds/dog_pant.mp3');
    
    // Cow sounds
    // animalSounds.cow.moo = loadSound('sounds/cow_moo.mp3');
    // animalSounds.cow.chew = loadSound('sounds/cow_chew.mp3');
    
    // Sheep sounds
    // animalSounds.sheep.baa = loadSound('sounds/sheep_baa.mp3');
    // animalSounds.sheep.bleat = loadSound('sounds/sheep_bleat.mp3');
    
    // Rabbit sounds
    // animalSounds.rabbit.squeak = loadSound('sounds/rabbit_squeak.mp3');
    // animalSounds.rabbit.thump = loadSound('sounds/rabbit_thump.mp3');
    
    // Ambient sounds
    // animalSounds.ambient.birds = loadSound('sounds/birds.mp3');
    // animalSounds.ambient.wind = loadSound('sounds/wind.mp3');
    
    console.log("Sound loading completed (placeholder mode)");
  } catch (error) {
    console.log("Sound files not found, running without audio");
    soundSettings.enabled = false;
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL, { depth: true }); // Ensure depth buffer is enabled
  pixelDensity(2); // Improve anti-aliasing effect
  frameRate(30); // Reduce frame rate to decrease rendering load
  
  // Convert degrees to radians
  angleX = radians(rotationX);
  angleY = radians(rotationY);
  angleZ = radians(rotationZ);
  
  cols = w / scl;
  rows = h / scl;
  
  // Initialize terrain
  for (let x = 0; x < cols; x++) {
    terrain[x] = [];
    for (let y = 0; y < rows; y++) {
      terrain[x][y] = 0; // Initialize
    }
  }
  
  // Generate static terrain once
  generateStaticTerrain();
  
  // Initialize grass, trees and stones (kept but not rendered)
  initializeDecorativeObjects();

  // Initialize wall data - define wall positions after terrain creation
  walls = [
    // Format: {startX, startY, endX, endY, door position (0-1 ratio), wall height}
    // North wall (top)
    {startX: 0, startY: 0, endX: cols-1, endY: 0, doorPos: 0.5, height: 100},
    // East wall (right)
    {startX: cols-1, startY: 0, endX: cols-1, endY: rows-1, doorPos: 0.5, height: 100},
    // South wall (bottom)
    {startX: cols-1, startY: rows-1, endX: 0, endY: rows-1, doorPos: 0.5, height: 100},
    // West wall (left)
    {startX: 0, startY: rows-1, endX: 0, endY: 0, doorPos: 0.5, height: 100}
  ];

  // Initialize wall doors
  initializeWalls();

  // Initialize pumpkin character position
  updatePumpkinHeight();

  // Initialize pumpkin's rotation to face away from the camera
  pumpkinMan.rotationY = PI; // Start facing away
  
  // Initialize bridge - set bridge position at river center
  bridge.riverRow = Math.floor(rows / 2); // River position (middle row)
  bridge.entryClearWidth = bridge.width * 2.5; // Define bridge entrance width (wider than bridge)
  bridge.entryClearLength = 20; // Define bridge entrance extension length
  bridge.treeFreeZone = true; // Ensure trees near bridge will be cleared
  
  // Initialize second bridge - same river position but different center point
  bridge2.riverRow = bridge.riverRow; // Ensure on the same river
  bridge2.entryClearWidth = bridge2.width * 2.5; // Define bridge entrance width
  bridge2.entryClearLength = 25; // Define bridge entrance extension length
  bridge2.treeFreeZone = true; // Ensure trees near bridge will be cleared
  
  // Initialize boat item position
  initializeBoatItem();
  
  // Initialize fence and sheep flock
  initializeFenceAndSheep();
  
  // Initialize rabbits and cows
  initializeRabbitsAndCows();
  
  // Ensure no trees in bridge entrance area
  clearTreesNearBridge();
  
  // Ensure no trees around house
  clearTreesNearHouse();
  
  // Ensure no obstacles around bridge
  clearObstaclesNearBridge();
  
  // Add lamp initialization
  initializeLamps();
  
  // Create HTML text elements
  countdownText = createElement('h1', '');
  countdownText.style('position', 'absolute');
  countdownText.style('color', 'white');
  countdownText.style('font-size', '12px');
  countdownText.style('text-align', 'center');
  countdownText.style('width', '100%');
  countdownText.style('top', '40%');
  countdownText.style('transform', 'translateY(-50%)');
  countdownText.style('display', 'none');
  countdownText.style('z-index', '1000');
  countdownText.style('text-shadow', '1px 1px 2px black');
  countdownText.style('font-weight', 'bold');
  countdownText.style('background', 'rgba(0,0,0,0.7)');
  countdownText.style('padding', '5px');
  countdownText.style('border-radius', '4px');
  countdownText.style('border', '1px solid rgba(255,255,255,0.3)');

  gameInfoText = createElement('div', '');
  gameInfoText.style('position', 'absolute');
  gameInfoText.style('color', 'yellow');
  gameInfoText.style('font-size', '2px');
  gameInfoText.style('top', '5px');
  gameInfoText.style('left', '5px');
  gameInfoText.style('background', 'none');
  gameInfoText.style('padding', '0px');
  gameInfoText.style('z-index', '1000');
  gameInfoText.style('font-family', 'monospace');
  gameInfoText.style('text-shadow', '1px 1px 2px black');

  // Test text removed, keeping only gameplay instructions

  // Create gameplay instructions
  gameInstructionsText = createElement('div', '');
  gameInstructionsText.style('position', 'absolute');
  gameInstructionsText.style('color', 'white');
  gameInstructionsText.style('font-size', '2px');
  gameInstructionsText.style('top', '15px');
  gameInstructionsText.style('left', '5px');
  gameInstructionsText.style('background', 'none');
  gameInstructionsText.style('padding', '0px');
  gameInstructionsText.style('z-index', '1000');
  gameInstructionsText.style('font-family', 'monospace');
  gameInstructionsText.style('line-height', '0.9');
  gameInstructionsText.style('max-width', '80px');
  gameInstructionsText.style('text-shadow', '1px 1px 2px black');


}

// Initialize decorative objects
function initializeDecorativeObjects() {
  // Add collision detection helper functions
  function isOverlapping(x1, y1, r1, x2, y2, r2) {
    let distance = dist(x1, y1, x2, y2);
    return distance < (r1 + r2 + 2); // Add extra safety distance to prevent objects from being too close
  }
  
  // Track positions and radii of all placed objects
  let placedObjects = [];
  
  // Add house to placedObjects
  placedObjects.push({x: houseGridX, y: houseGridY, r: houseAvoidRadius});
  
  // Check if position is available
  function isPositionAvailable(x, y, radius) {
    for (let obj of placedObjects) {
      if (isOverlapping(x, y, radius, obj.x, obj.y, obj.r)) {
        return false;
      }
    }
    
    // Avoid placing objects near bridges
    let bridgeX = bridge.centerCol;
    let bridgeY = bridge.riverRow || Math.floor(rows / 2); // Ensure value exists during initialization
    let safeDistance = bridge.width + 10; // Increase safety distance based on bridge width
    
    // Check if within bridge safety zone
    if (abs(x - bridgeX) < safeDistance && 
        y >= bridgeY - bridge.length/2 - safeDistance && 
        y <= bridgeY + bridge.length/2 + safeDistance) {
      return false; // Do not place objects near bridge
    }
    
    // Add special protection for bridge entrances
    // Add wider safety areas at both ends of bridge entrance to ensure access is not blocked
    let bridgeEntryWidth = bridge.width * 2.5; // Bridge entrance width is wider
    let bridgeEntryLength = 20; // Bridge entrance extension length
    
    // North bridge entrance area
    if (abs(x - bridgeX) < bridgeEntryWidth && 
        y >= bridgeY - bridge.length/2 - bridgeEntryLength && 
        y <= bridgeY - bridge.length/2) {
      return false; // Do not place objects at north bridge entrance
    }
    
    // South bridge entrance area
    if (abs(x - bridgeX) < bridgeEntryWidth && 
        y >= bridgeY + bridge.length/2 && 
        y <= bridgeY + bridge.length/2 + bridgeEntryLength) {
      return false; // Do not place objects at south bridge entrance
    }
    
    // Avoid placing objects near river
    if (abs(y - bridgeY) < 12) { // Increase safety distance around river
      return false; // Do not place objects near river
    }
    
    // Avoid placing objects around house
    let distToHouse = dist(x, y, houseGridX, houseGridY);
    if (distToHouse < houseAvoidRadius) {
      return false;
    }
    
    return true;
  }
  
  // Try to find available position
  function findAvailablePosition(minX, maxX, minY, maxY, radius, maxAttempts = 100) { // Increase attempt count
    let attempts = 0;
    let x, y;
    
    while (attempts < maxAttempts) {
      x = int(random(minX, maxX));
      y = int(random(minY, maxY));
      
      if (isPositionAvailable(x, y, radius)) {
        // Record position
        placedObjects.push({x: x, y: y, r: radius * 1.2}); // Increase recorded radius to provide more space
        return {x, y};
      }
      
      attempts++;
    }
    
    // Try larger area nearby
    attempts = 0;
    while (attempts < maxAttempts) {
      x = int(random(max(0, minX-10), min(cols-1, maxX+10)));
      y = int(random(max(0, minY-10), min(rows-1, maxY+10)));
      
      if (isPositionAvailable(x, y, radius)) {
        // Record position
        placedObjects.push({x: x, y: y, r: radius * 1.2});
        return {x, y};
      }
      
      attempts++;
    }
    
    // If really can't find position, return a random position (may overlap)
    console.warn("Unable to find non-overlapping position, selecting random position");
    x = int(random(minX, maxX));
    y = int(random(minY, maxY));
    placedObjects.push({x: x, y: y, r: radius});
    return {x, y};
  }

  // Generate trees (increase quantity and shape diversity)
  treeList = [];
  let numTrees = 14; // Increase tree count to compensate for removed cylindrical trees
  let maxTreeR = 32; // Scaled up 4x (originally 8)
  let treeMargin = ceil(maxTreeR / scl) + 2;
  
  // Randomly generate trees
  for (let i = 0; i < numTrees; i++) {
    let treeR = random(8, 24);
    let collisionRadius = treeR * 1.2; // Tree collision radius is 1.2 times the tree radius
    
    // Find available position
    let pos = findAvailablePosition(treeMargin, cols - treeMargin, treeMargin, rows - treeMargin, collisionRadius);
    let x = pos.x;
    let y = pos.y;
    
    let treeH, shapeType, treeColor;
    
    // Randomly determine tree shape type, only cone and sphere
    let rShape = random();
    if (rShape < 0.7) { // 70% probability for cone-shaped trees
      shapeType = 'cone';
      treeH = random(80, 180);
      treeR = random(12, 32);
      let t = random();
      treeColor = lerpColor(color(30, 80, 30), color(40, 160, 40), t);
      if (random() < 0.2) treeColor = color(90, 60, 30);
    } else { // 30% probability for sphere-shaped trees
      shapeType = 'sphere';
      treeH = random(32, 60);
      treeR = treeH * random(0.8, 1.2);
      let t = random();
      treeColor = lerpColor(color(50, 150, 50), color(100, 200, 100), t);
      if (random() < 0.1) treeColor = color(180,180,80);
    }
    
    treeList.push({ x, y, px: x * scl, py: y * scl, pz: 0, treeH, treeR, treeColor, shapeType });
  }
  
  // Generate stones
  stoneList = [];
  let stoneMargin = 2;
  for (let i = 0; i < 10; i++) {
    let stoneSize = random(6, 14); // 4x larger (originally 1.5-3.5)
    // Stone collision radius equals stone size
    let pos = findAvailablePosition(stoneMargin, cols - stoneMargin, stoneMargin, rows - stoneMargin, stoneSize);
    
    let gridX = pos.x;
    let gridY = pos.y;
    let stoneColor = color(120 + random(-20, 20), 110 + random(-20, 20), 100 + random(-20, 20), 230);
    stoneList.push({ gridX, gridY, size: stoneSize, color: stoneColor });
  }
  
  // Generate grass
  grassList = [];
  let grassMargin = 2; // Grass boundary safety distance
  for (let i = 0; i < 10; i++) {
    let size = random(12, 28); // Grass size 4x larger (originally 3-7)
    // Grass collision radius is 0.8 times grass size
    let pos = findAvailablePosition(grassMargin, cols - grassMargin, grassMargin, rows - grassMargin, size * 0.8);
    
    let x = pos.x;
    let y = pos.y;
    let px = x * scl;
    let py = y * scl;
    let pz = 0; // Set to 0 first, get terrain height during draw
    let offsetX = random(-8, 8); // 4x larger (originally -2 to 2)
    let offsetY = random(-8, 8); // 4x larger
    // Grass color and shape determined during setup
    let baseCol = lerpColor(color(40, 180, 40, 220), color(80, 255, 80, 180), random());
    if (random() < 0.08) baseCol = color(180, 180, 60, 180);
    if (random() < 0.04) baseCol = color(120, 90, 30, 180);
    let shapeType = 'ellipsoid'; // Fixed as ellipsoid
    grassList.push({x, y, px, py, pz, size, color: baseCol, offsetX, offsetY, shapeType});
  }

  // Create gradient background texture
  bgGraphics = createGraphics(windowWidth, windowHeight);
  for (let y = 0; y < bgGraphics.height; y++) {
    let inter = map(y, 0, bgGraphics.height, 0, 1);
    let c = lerpColor(color(255,100,50), color(80,20,40), inter);
    bgGraphics.stroke(c);
    bgGraphics.line(0, y, bgGraphics.width, y);
  }
}

// Generate static terrain height
function generateStaticTerrain() {
  let seed = random(1000); // Random seed
  noiseSeed(seed);
  
  // Note: We will use a two-step approach
  // 1. First generate normal noise terrain
  // 2. Then force create a completely flat river and bridge area
  
  // Step 1: Generate base terrain
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let noiseVal = noise(x * 0.15, y * 0.15);
      terrain[x][y] = map(noiseVal, 0, 1, -50, 50); // Reduce overall terrain height range
    }
  }
  
  // Step 2: Force flatten river area
  let riverRow = Math.floor(rows / 2);
  bridge.riverRow = riverRow;
  
  // Set fixed height values
  let waterLevel = -40; // Water surface height, restore original water level
  let bankLevel = -25;  // River bank height, above water surface
  let terrainLevel = -20; // General terrain height, slightly above riverbank
  
  // First flatten the entire central area as "safe zone"
  let safeZoneWidth = 40; // Safe zone width (grid units)
  for (let y = riverRow - safeZoneWidth/2; y <= riverRow + safeZoneWidth/2; y++) {
    for (let x = 0; x < cols; x++) {
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        if (abs(y - riverRow) < 3) {
          // River area
          terrain[x][y] = waterLevel;
        } else if (abs(y - riverRow) < 6) {
          // River bank
          terrain[x][y] = bankLevel;
        } else {
          // General terrain within safe zone
          terrain[x][y] = terrainLevel;
        }
      }
    }
  }
  
  // Special handling for bridge area, ensure bridge ends and surroundings are completely flat
  let bridgeCol = bridge.centerCol;
  let bridgeLength = bridge.length;
  let bridgeWidth = bridge.width;
  
  // Flattened area around bridge
  let bridgeAreaRadius = 20;
  for (let y = riverRow - bridgeAreaRadius; y <= riverRow + bridgeAreaRadius; y++) {
    for (let x = bridgeCol - bridgeAreaRadius; x <= bridgeCol + bridgeAreaRadius; x++) {
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        let distToBridge = dist(x, y, bridgeCol, riverRow);
        
        if (distToBridge < bridgeAreaRadius) {
          if (abs(y - riverRow) < 3) {
            // River area
            terrain[x][y] = waterLevel;
          } else {
            // Terrain around bridge
            terrain[x][y] = terrainLevel;
          }
        }
      }
    }
  }
  
  // Ensure bridge ends are completely flat
  // North bridge head
  for (let y = riverRow - bridgeLength/2 - 5; y < riverRow - 3; y++) {
    for (let x = bridgeCol - bridgeWidth - 5; x <= bridgeCol + bridgeWidth + 5; x++) {
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        terrain[x][y] = terrainLevel;
      }
    }
  }
  
  // South bridge head
  for (let y = riverRow + 3; y < riverRow + bridgeLength/2 + 5; y++) {
    for (let x = bridgeCol - bridgeWidth - 5; x <= bridgeCol + bridgeWidth + 5; x++) {
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        terrain[x][y] = terrainLevel;
      }
    }
  }
  
  // To ensure the bridge is properly placed, we also set the bridge's water level and terrain height
  bridge.waterLevel = waterLevel;
  bridge.terrainLevel = terrainLevel;
  
  // Set the same water level and terrain height for the second bridge
  bridge2.waterLevel = waterLevel;
  bridge2.terrainLevel = terrainLevel;
  
  // Clear hills list for regeneration
  hillsList = [];
  
  // Flatten the first bridge area
  flattenBridgeArea();
  
  // Flatten second bridge area
  flattenBridge2Area();
  
  // Step 3: Add hills in areas far from rivers and bridges
  generateHills();
  
  console.log(`Terrain generation complete: water level=${waterLevel}, bank height=${bankLevel}, terrain height=${terrainLevel}`);
}

// New: Generate hills function
function generateHills() {
  let riverRow = bridge.riverRow;
  let bridgeCol = bridge.centerCol;
  let safeDistance = 35; // Increase safe distance from rivers and bridges
  let bridgeEntrySafeDistance = 45; // Additional safety distance for bridge entrance
  
  // Create 3-5 hills, reduce hill count to decrease trees on hills
  let numHills = floor(random(3, 6));
  
  for (let i = 0; i < numHills; i++) {
    // Randomly select hill position, avoiding river and bridge areas
    let hillX, hillY;
    let validLocation = false;
    let attempts = 0;
    
    while (!validLocation && attempts < 50) {
      hillX = floor(random(10, cols - 10));
      
      // Choose position above or below river
      if (random() < 0.5) {
        hillY = floor(random(10, riverRow - safeDistance));
      } else {
        hillY = floor(random(riverRow + safeDistance, rows - 10));
      }
      
      // Check distance to bridge
      let distToBridge = dist(hillX, hillY, bridgeCol, riverRow);
      
      // Check if too close to bridge entrance area (north and south sides of bridge)
      let isTooCloseToEntry = false;
      // Check north side bridge entrance
      if (hillY < riverRow && 
          abs(hillX - bridgeCol) < bridgeEntrySafeDistance && 
          hillY > riverRow - bridgeEntrySafeDistance) {
        isTooCloseToEntry = true;
      }
      // Check south side bridge entrance
      if (hillY > riverRow && 
          abs(hillX - bridgeCol) < bridgeEntrySafeDistance && 
          hillY < riverRow + bridgeEntrySafeDistance) {
        isTooCloseToEntry = true;
      }
      
      // Check distance to other hills
      let tooCloseToOtherHills = false;
      for (let hill of hillsList) {
        if (dist(hillX, hillY, hill.x, hill.y) < hill.radius + 15) {
          tooCloseToOtherHills = true;
        break;
      }
    }
    
      if (distToBridge > safeDistance && !tooCloseToOtherHills && !isTooCloseToEntry) {
        validLocation = true;
      }
      
      attempts++;
    }
    
    if (validLocation) {
      // Create hill
      let hillRadius = floor(random(10, 20));
      let hillHeight = random(60, 120); // Hill height
      
      // Record hill information for later placing objects on hills
      hillsList.push({
        x: hillX,
        y: hillY,
        radius: hillRadius,
        height: hillHeight
      });
      
      // Apply hills to terrain
      applyHillToTerrain(hillX, hillY, hillRadius, hillHeight);
    }
  }
  
  // Place additional objects on hills
  placeObjectsOnHills();
}

// Apply hill to terrain
function applyHillToTerrain(centerX, centerY, radius, height) {
  for (let y = centerY - radius; y <= centerY + radius; y++) {
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        // Calculate distance to hill center
        let distance = dist(x, y, centerX, centerY);
        
        if (distance < radius) {
          // Use cosine function to create smooth hill
          let factor = (cos(PI * distance / radius) + 1) / 2;
          
          // Add hill height to existing terrain
          terrain[x][y] += factor * height;
        }
      }
    }
  }
}

// Place objects on hills
function placeObjectsOnHills() {
  for (let hill of hillsList) {
    // Place 1-3 objects on each hill, reduce object count
    let numObjects = floor(random(1, 4));
    
    for (let i = 0; i < numObjects; i++) {
      // Randomly select position within hill range
      let angle = random(TWO_PI);
      let distance = random(hill.radius * 0.3, hill.radius * 0.8); // Don't go too close to edge
      let objX = hill.x + cos(angle) * distance;
      let objY = hill.y + sin(angle) * distance;
      
      // Ensure position is within terrain bounds
      objX = constrain(objX, 0, cols - 1);
      objY = constrain(objY, 0, rows - 1);
      
      // Check distance to house, avoid placing objects near house
      let distToHouse = dist(objX, objY, houseGridX, houseGridY);
      if (distToHouse < houseAvoidRadius * 1.5) { // Use larger radius to ensure safety
        continue; // Skip this position, try next object
      }
      
      // Randomly decide what type of object to place, reduce tree generation probability
      let objectType = random(['tree', 'tree', 'stone', 'stone', 'grass', 'grass', 'grass']);
      
      if (objectType === 'tree') {
        // Trees on hills are taller
        let treeH = random(140, 260);
        let treeR = random(12, 30);
        let treeColor = color(30 + random(40), 80 + random(60), 30 + random(40));
        let shapeType = 'cone';
        
        // Randomly select tree type, only cone and sphere
        if (random() < 0.4) { // 40% chance to generate sphere tree
          shapeType = 'sphere';
          treeH = random(32, 60);
          treeR = treeH * random(0.8, 1.2);
          let t = random();
          treeColor = lerpColor(color(50, 150, 50), color(100, 200, 100), t);
          if (random() < 0.1) treeColor = color(180,180,80);
        } else { // 60% chance to generate cone tree
          shapeType = 'cone';
        }
        
        treeList.push({
          x: objX, y: objY,
          px: objX * scl, py: objY * scl,
          pz: 0, treeH, treeR, treeColor, shapeType
        });
      } else if (objectType === 'stone') {
        // Stones on hills are larger and more prominent
        let stoneSize = random(10, 20);
        let stoneColor = color(120 + random(-20, 20), 110 + random(-20, 20), 100 + random(-20, 20), 230);
        stoneList.push({
          gridX: objX, gridY: objY,
          size: stoneSize, color: stoneColor
        });
      } else if (objectType === 'grass') {
        // Grass on hills
        let size = random(15, 30);
        let x = objX;
        let y = objY;
        let px = x * scl;
        let py = y * scl;
        let pz = 0;
        let offsetX = random(-8, 8);
        let offsetY = random(-8, 8);
        let baseCol = lerpColor(color(40, 180, 40, 220), color(80, 255, 80, 180), random());
        if (random() < 0.3) baseCol = color(200, 180, 60, 180); // Some yellow grass
        let shapeType = 'ellipsoid';
        grassList.push({
          x, y, px, py, pz, size, color: baseCol, offsetX, offsetY, shapeType
        });
      }
    }
    
    // Place a special large stone or landmark on hilltop
    if (random() < 0.6) { // 60% chance to place special stone on hilltop
      let specialStoneSize = random(18, 30);
      let specialStoneColor;
      
      if (random() < 0.3) {
        // Sometimes use special colored stones
        specialStoneColor = color(180 + random(-30, 30), 180 + random(-30, 30), 180 + random(-30, 30), 250);
      } else {
        specialStoneColor = color(120 + random(-20, 20), 110 + random(-20, 20), 100 + random(-20, 20), 230);
      }
      
      stoneList.push({
        gridX: hill.x, gridY: hill.y,
        size: specialStoneSize, color: specialStoneColor
      });
    }
  }
}

// Add function to flatten bridge area
function flattenBridgeArea() {
  let bridgeCol = bridge.centerCol;
  let riverRow = bridge.riverRow;
  let bridgeLength = bridge.length;
  let bridgeWidth = bridge.width;
  
  // Size of flatten area - significantly increase flattening range
  let flattenRadius = 25; // Further expand flattening radius
  
  // Use fixed water level
  let waterLevel = -40; // Lower water level to ensure bridge is not below terrain
  
  // First flatten the entire area near the river
  let riverWidth = 20; // Increase flattening width on both sides of the river
  for (let y = riverRow - riverWidth; y <= riverRow + riverWidth; y++) {
    for (let x = 0; x < cols; x++) {
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        // Determine height based on distance from river center
        let distToRiver = abs(y - riverRow);
        
        if (distToRiver <= 2.5) {
          // River itself
          terrain[x][y] = waterLevel;
        } else if (distToRiver <= 5) {
          // River bank
          terrain[x][y] = waterLevel + 20;
        } else if (distToRiver <= 10) {
          // River bank periphery
          terrain[x][y] = waterLevel + 25;
        } else {
          // Farther areas
          terrain[x][y] = waterLevel + 30;
        }
      }
    }
  }
  
  // Larger range flattening around bridge - especially ensure no hills near bridge
  for (let y = riverRow - bridgeLength; y <= riverRow + bridgeLength; y++) {
    for (let x = bridgeCol - flattenRadius; x <= bridgeCol + flattenRadius; x++) {
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        // Determine height based on distance to bridge center
        let distToBridge = dist(x, y, bridgeCol, riverRow);
        
        if (distToBridge <= flattenRadius * 0.5) {
          // Near area around bridge
          let targetHeight = waterLevel + 15;
          
          // If river area, maintain river height
          if (abs(y - riverRow) <= 2.5) {
            targetHeight = waterLevel;
          }
          
          terrain[x][y] = targetHeight;
        } else if (distToBridge <= flattenRadius) {
          // Farther area, slight smooth transition
          let targetHeight = waterLevel + 15;
          
          // If river area, maintain river height
          if (abs(y - riverRow) <= 2.5) {
            targetHeight = waterLevel;
          }
          
          let blendFactor = map(distToBridge, flattenRadius * 0.5, flattenRadius, 1, 0.7);
          terrain[x][y] = lerp(terrain[x][y], targetHeight, blendFactor);
        }
      }
    }
  }
  
  // Completely flatten area near bridge heads
  // North bridge head
  for (let y = riverRow - bridgeLength/2 - 6; y < riverRow - 2.5; y++) {
    for (let x = bridgeCol - bridgeWidth*1.5; x <= bridgeCol + bridgeWidth*1.5; x++) {
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        terrain[x][y] = waterLevel + 15;
      }
    }
  }
  
  // South bridge head
  for (let y = riverRow + 2.5; y < riverRow + bridgeLength/2 + 6; y++) {
    for (let x = bridgeCol - bridgeWidth*1.5; x <= bridgeCol + bridgeWidth*1.5; x++) {
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        terrain[x][y] = waterLevel + 15;
      }
    }
  }
}

// Function to flatten second bridge area
function flattenBridge2Area() {
  let bridgeCol = bridge2.centerCol;
  let riverRow = bridge2.riverRow;
  let bridgeLength = bridge2.length;
  let bridgeWidth = bridge2.width;
  
  // Size of flatten area - significantly increase flattening range
  let flattenRadius = 30; // Larger flattening radius
  
  // Use fixed water level - use exactly same water level as first bridge
  let waterLevel = bridge.waterLevel || -40; // Force use exactly same water level as first bridge
  
  // Larger range flattening around bridge - ensure no hills near bridge
  for (let y = riverRow - bridgeLength; y <= riverRow + bridgeLength; y++) {
    for (let x = bridgeCol - flattenRadius; x <= bridgeCol + flattenRadius; x++) {
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        // Determine height based on distance to bridge center
        let distToBridge = dist(x, y, bridgeCol, riverRow);
        
        if (distToBridge <= flattenRadius * 0.6) {
          // Near area around bridge
          let targetHeight = waterLevel + 15;
          
          // If river area, maintain river height
          if (abs(y - riverRow) <= 2.5) {
            targetHeight = waterLevel;
          }
          
          terrain[x][y] = targetHeight;
        } else if (distToBridge <= flattenRadius) {
          // Farther area, slight smooth transition
          let targetHeight = waterLevel + 15;
          
          // If river area, maintain river height
          if (abs(y - riverRow) <= 2.5) {
            targetHeight = waterLevel;
          }
          
          let blendFactor = map(distToBridge, flattenRadius * 0.6, flattenRadius, 1, 0.7);
          terrain[x][y] = lerp(terrain[x][y], targetHeight, blendFactor);
        }
      }
    }
  }
  
  // Completely flatten area near bridge heads
  // North bridge head
  for (let y = riverRow - bridgeLength/2 - 8; y < riverRow - 2.5; y++) {
    for (let x = bridgeCol - bridgeWidth*1.8; x <= bridgeCol + bridgeWidth*1.8; x++) {
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        terrain[x][y] = waterLevel + 15;
      }
    }
  }
  
  // South bridge head
  for (let y = riverRow + 2.5; y < riverRow + bridgeLength/2 + 8; y++) {
    for (let x = bridgeCol - bridgeWidth*1.8; x <= bridgeCol + bridgeWidth*1.8; x++) {
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        terrain[x][y] = waterLevel + 15;
      }
    }
  }
}

// Initialize walls and gates
function initializeWalls() {
  // Randomly generate gate positions for each wall (not too close to corners)
  for (let wall of walls) {
    wall.doorPos = random(0.3, 0.7); // Gate position between 30%-70% of wall
    wall.doorWidth = 3; // Gate width (Grid units)
    
    // Calculate actual grid coordinates of gate
    let wallLength = max(
      abs(wall.endX - wall.startX),
      abs(wall.endY - wall.startY)
    );
    
    let doorStart = floor(wallLength * wall.doorPos - wall.doorWidth / 2);
    let doorEnd = doorStart + wall.doorWidth;
    
    // Store actual grid coordinates of gate
    if (wall.startX === wall.endX) { // Vertical wall (east-west wall)
      wall.doorStartY = min(wall.startY, wall.endY) + doorStart;
      wall.doorEndY = min(wall.startY, wall.endY) + doorEnd;
      wall.doorX = wall.startX;
    } else { // Horizontal wall (north-south wall)
      wall.doorStartX = min(wall.startX, wall.endX) + doorStart;
      wall.doorEndX = min(wall.startX, wall.endX) + doorEnd;
      wall.doorY = wall.startY;
    }
  }
}

// Initialize fence area and sheep flock
function initializeFenceAndSheep() {
  console.log("Start initializing fence and sheep...");

  // Reduce fence size for easier placement
  fenceArea.width = 12;       // Width (Grid units)
  fenceArea.height = 12;      // Height (Grid units)
  fenceArea.gateWidth = 4;    // Gate width, explicitly set to prevent reset

  // Get bridge entrance and river position
      let bridgeX = bridge.centerCol;
  let bridgeY = bridge.riverRow || Math.floor(rows / 2);
  
  // Force fix sheep pen position in front of house (south direction)
  let fenceX = houseGridX; // Directly align X coordinate with house
  let fenceY = houseGridY + houseSize + 15; // 15 grids in front of house
  
  console.log("Force fix sheep pen position in front of house (south direction)");
  
  // Check if it will overlap with river or get too close
  let distToRiver = bridgeY - fenceY;
  let safeDistanceToRiver = fenceArea.height/2 + 8; // Maintain safe distance from river
  
  // If too close to river, adjust position backward
  if (distToRiver < safeDistanceToRiver) {
    fenceY = bridgeY - safeDistanceToRiver - 2; // Move back 2 extra grids to ensure not too close
    console.log("Adjust fence position to avoid being too close to river, but keep near river");
  }
  
  // Ensure not exceeding map boundaries
  fenceX = constrain(fenceX, fenceArea.width/2 + 2, cols - fenceArea.width/2 - 2);
  fenceY = constrain(fenceY, fenceArea.height/2 + 2, rows - fenceArea.height/2 - 2);
  
  console.log(`Final fence position: (${fenceX}, ${fenceY})`);
  
  // Calculate fence base height (average terrain height)
  let totalHeight = 0;
  let count = 0;
  
  for (let x = Math.floor(fenceX - fenceArea.width/2); x <= Math.ceil(fenceX + fenceArea.width/2); x++) {
    for (let y = Math.floor(fenceY - fenceArea.height/2); y <= Math.ceil(fenceY + fenceArea.height/2); y++) {
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        totalHeight += terrain[x][y];
        count++;
      }
    }
  }
  
  // Add floating text to indicate sheep pen location
  setTimeout(() => {
    addFloatingText("Sheep Pen", fenceX, fenceY, terrain[Math.floor(fenceX)][Math.floor(fenceY)] + 30, 2000);
  }, 1000);
  
  // Set fence position and properties
  fenceArea.centerX = fenceX;
  fenceArea.centerY = fenceY;
  fenceArea.baseHeight = totalHeight / count;
  fenceArea.isPlaced = true;
  
  // Gate is always on the side of fence facing away from house - fixed as south gate
  fenceArea.gatePos = 2; // South gate, facing away from house
  
  // Add gate status and animation related properties
  fenceArea.gateOpen = false; // Default closed
  fenceArea.gateOpenAmount = 0; // Gate opening degree (0-1)
  fenceArea.gateDetectionRadius = 35; // Range for detecting pumpkin approach
  console.log("Fence gate fixed on south side, facing away from house");
  
  // Clear previous data and generate fence and sheep
  fenceArea.posts = [];
  fenceArea.rails = [];
  sheepList = [];
  
  generateFence();
  generateSheep();
  
  console.log(`Successfully placed fence, center position (${fenceArea.centerX}, ${fenceArea.centerY}), with ${sheepList.length} sheep inside`);
}

// Initialize boat item position
function initializeBoatItem() {
  console.log("Initialize boat item...");
  
  // Place boat at the middle position of bridge
  let bridgeX = bridge.centerCol;
  let bridgeY = bridge.riverRow;
  
  // Calculate bridge center position
  boatItem.gridX = bridgeX;
  boatItem.gridY = bridgeY;
  
  // Calculate boat height - slightly above bridge surface
  let bridgeBaseHeight = getInterpolatedHeight(bridgeX, bridgeY);
  let archHeight = sin(0.5 * PI) * 60; // Bridge arch center height
  let bridgeHeight = bridge.waterLevel + bridge.height + archHeight;
  
  boatItem.height = bridgeHeight + 45; // Reduce height from 80 to 45, allowing pumpkin man to collect by jumping
  boatItem.rotation = 0;
  boatItem.collected = false;
  boatItem.active = true;
  
  // Set initial values for emergency state parameters
  resetEmergencyState();
  
  console.log(`Boat marker position: (${boatItem.gridX}, ${boatItem.gridY}), height: ${boatItem.height}`);
}

// Get interpolated height (handles non-integer coordinates)
function getInterpolatedHeight(x, y) {
  let x1 = Math.floor(x);
  let y1 = Math.floor(y);
  let x2 = Math.ceil(x);
  let y2 = Math.ceil(y);
  
  // Ensure coordinates are within valid range
  x1 = constrain(x1, 0, cols - 1);
  y1 = constrain(y1, 0, rows - 1);
  x2 = constrain(x2, 0, cols - 1);
  y2 = constrain(y2, 0, rows - 1);
  
  // If coordinates are already integers
  if (x1 === x2 && y1 === y2) {
    return terrain[x1][y1];
  }
  
  // Get heights of four corners
  let h00 = terrain[x1][y1];
  let h10 = terrain[x2][y1];
  let h01 = terrain[x1][y2];
  let h11 = terrain[x2][y2];
  
  // Calculate weights for x and y
  let wx = x - x1;
  let wy = y - y1;
  
  // Bilinear interpolation
  let h0 = h00 * (1 - wx) + h10 * wx;
  let h1 = h01 * (1 - wx) + h11 * wx;
  return h0 * (1 - wy) + h1 * wy;
}

// Reset emergency state
function resetEmergencyState() {
  emergency.active = false;
  emergency.timer = 0;
  emergency.initialized = false; // Ensure reset of initialization state
  
  // Reset water surface related states
  flooded = null;
  floodQueue = [];
  
  // Find lowest height in terrain as water starting height
  let minHeight = Infinity;
  for (let x = 0; x < cols; x += 5) {
    for (let y = 0; y < rows; y += 5) {
      if (terrain[x][y] < minHeight) {
        minHeight = terrain[x][y];
      }
    }
  }
  
  // Set water level below terrain lowest point
  emergency.waterStartLevel = minHeight - 20;
  emergency.waterLevel = emergency.waterStartLevel;
  
  // Maximum water level is wall height
  emergency.maxWaterLevel = walls[0].height;
  
  emergency.pumpkinSaved = false;
  emergency.boatRideActive = false;
  emergency.fragmentTimer = 0;
  emergency.lastMilestone = -1;
  emergency.waterPulse = 0;
  
  console.log(`Emergency state reset, initial water level=${emergency.waterStartLevel.toFixed(1)}, max water level=${emergency.maxWaterLevel.toFixed(1)}`);
}

// Check house door interaction
function checkHouseDoorInteraction(houseX, houseY, houseZ) {
  // Calculate side door position (east side of house)
  let doorX = houseX + 100; // Door is on the east side, 100 units from house center
  let doorY = houseY - 50;  // Door is slightly north of house center
  let doorZ = houseZ + 40;  // Door is at house ground level
  
  // Calculate distance from pumpkin to door
  let pumpkinX = pumpkinMan.gridX * scl;
  let pumpkinY = pumpkinMan.gridY * scl;
  let pumpkinZ = pumpkinMan.height;
  
  let distanceToDoor = dist(pumpkinX, pumpkinY, doorX, doorY);
  let heightDifference = abs(pumpkinZ - doorZ);
  
  // Check if pumpkin is close enough to interact with door
  if (distanceToDoor < 30 && heightDifference < 20) {
    houseDoor.canInteract = true;
    
    // Add visual indication that door can be interacted with
    push();
    translate(doorX, doorY, doorZ + 50); // Above the door
    fill(255, 255, 0, 150 + sin(frameCount * 0.1) * 50); // Pulsing yellow
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(12);
    text("Press E to interact", 0, 0);
    
    // Add floating arrow
    push();
    translate(0, 0, -20);
    rotateZ(sin(frameCount * 0.15) * 0.3); // Slight wobble
    fill(255, 255, 0);
    triangle(0, -8, -5, 5, 5, 5);
    pop();
    
    pop();
  } else {
    houseDoor.canInteract = false;
  }
}

// Toggle house door (called when E key is pressed)
function toggleHouseDoor() {
  if (houseDoor.canInteract) {
    houseDoor.isOpen = !houseDoor.isOpen;
    houseDoor.targetAngle = houseDoor.isOpen ? PI/2 : 0; // 90 degrees open, 0 degrees closed
    
    // Add floating text feedback
    let doorX = 10 * scl + 100;
    let doorY = 10 * scl - 50;
    let doorZ = terrain[10][10] + 50 + 50;
    
    if (houseDoor.isOpen) {
      addFloatingText("Door Opened!", doorX, doorY, doorZ, 60);
    } else {
      addFloatingText("Door Closed!", doorX, doorY, doorZ, 60);
    }
    
    console.log(`House door ${houseDoor.isOpen ? 'opened' : 'closed'}`);
  }
}

// Find suitable position for placing fence
function findFencePlacement() {
  console.log("Start searching for fence placement position...");
  
  // Candidate positions
  let candidates = [
    {x: 15, y: 15},   // Map northwest area
    {x: 43, y: 10},   // Map northeast area
    {x: 15, y: 55},   // Map southwest area
    {x: 45, y: 60}    // Map southeast area
  ];
  
  console.log("Candidate positions:", candidates);
  
  // River position
  let riverY = bridge.riverRow;
  let bridgeX = bridge.centerCol;
  
  // Test each candidate position
  console.log("River position:", riverY, "Bridge position:", bridgeX);
  
  for (let candidate of candidates) {
    console.log(`Checking candidate position (${candidate.x}, ${candidate.y})...`);
    let valid = true;
    
    // Check if too close to river and bridge
    let distToBridge = dist(candidate.x, candidate.y, bridgeX, riverY);
    console.log(`Distance to bridge: ${distToBridge}, minimum safe distance: ${fenceArea.width + 10}`);
    
    if (distToBridge < fenceArea.width + 10) {
      console.log("  Position invalid: too close to river and bridge");
      valid = false;
      continue;
    }
    
    // Check if located on hills
    console.log(`Checking hill positions, current hill count: ${hillsList.length}`);
    for (let hill of hillsList) {
      let distToHill = dist(candidate.x, candidate.y, hill.x, hill.y);
      let safeDistance = hill.radius + fenceArea.width/2;
      console.log(`  Distance to hill (${hill.x}, ${hill.y}): ${distToHill}, safe distance: ${safeDistance}`);
      
      if (distToHill < safeDistance) {
        console.log("  Position invalid: too close to hill");
        valid = false;
        break;
      }
    }
    if (!valid) continue;
    
    // Check if there are trees, stones or grass within fence area
    let halfWidth = fenceArea.width / 2;
    let halfHeight = fenceArea.height / 2;
    
    // Check trees
    for (let tree of treeList) {
      if (tree.x > candidate.x - halfWidth && tree.x < candidate.x + halfWidth &&
          tree.y > candidate.y - halfHeight && tree.y < candidate.y + halfHeight) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;
    
    // Check stones
    for (let stone of stoneList) {
      if (stone.gridX > candidate.x - halfWidth && stone.gridX < candidate.x + halfWidth &&
          stone.gridY > candidate.y - halfHeight && stone.gridY < candidate.y + halfHeight) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;
    
    // Check grass
    for (let grass of grassList) {
      if (grass.x > candidate.x - halfWidth && grass.x < candidate.x + halfWidth &&
          grass.y > candidate.y - halfHeight && grass.y < candidate.y + halfHeight) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;
    
    // Check terrain flatness - calculate height difference within area
    let minHeight = 1000;
    let maxHeight = -1000;
    
    console.log(`Checking terrain flatness, area range: (${candidate.x - halfWidth}, ${candidate.y - halfHeight}) - (${candidate.x + halfWidth}, ${candidate.y + halfHeight})`);
    
    for (let x = candidate.x - halfWidth; x <= candidate.x + halfWidth; x++) {
      for (let y = candidate.y - halfHeight; y <= candidate.y + halfHeight; y++) {
        if (x >= 0 && x < cols && y >= 0 && y < rows) {
          let h = terrain[Math.floor(x)][Math.floor(y)];
          minHeight = min(minHeight, h);
          maxHeight = max(maxHeight, h);
        }
      }
    }
    
    console.log(`  Terrain height difference: ${maxHeight - minHeight}, lowest: ${minHeight}, highest: ${maxHeight}, max allowed difference: 25`);
    
    // If height difference is too large, consider terrain not flat enough
    if (maxHeight - minHeight > 25) {
      console.log("  Position invalid: terrain not flat enough");
      valid = false;
      continue;
    }
    
    // Found suitable position
    if (valid) {
      console.log(`Found valid position: (${candidate.x}, ${candidate.y}), base height: ${(minHeight + maxHeight) / 2}`);
      
      fenceArea.centerX = candidate.x;
      fenceArea.centerY = candidate.y;
      fenceArea.baseHeight = (minHeight + maxHeight) / 2;
      fenceArea.isPlaced = true;
      
      // Randomly decide gate position (0-3: north east south west)
      fenceArea.gatePos = floor(random(4));
      console.log(`Set gate position: ${fenceArea.gatePos} (0-north, 1-east, 2-south, 3-west)`);
      
    return;
  }
  }
  
  // If none of the candidate positions above are suitable, try to find position automatically
      let attempts = 0;
  while (attempts < 50 && !fenceArea.isPlaced) {
    let testX = floor(random(fenceArea.width + 5, cols - fenceArea.width - 5));
    let testY = floor(random(fenceArea.height + 5, rows - fenceArea.height - 5));
    
    // Avoid river area
    if (abs(testY - riverY) < fenceArea.height) {
      attempts++;
      continue;
    }
    
    // Check candidate position (simplified version, only check distance to other major objects)
    let tooClose = false;
    
    // Check distance to hills
    for (let hill of hillsList) {
      if (dist(testX, testY, hill.x, hill.y) < hill.radius + fenceArea.width/2) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) {
      attempts++;
      continue;
    }
    
    // Check distance to trees
    for (let tree of treeList) {
      if (dist(testX, testY, tree.x, tree.y) < fenceArea.width/2) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) {
        attempts++;
      continue;
    }
    
    // Position is valid, set fence position
    fenceArea.centerX = testX;
    fenceArea.centerY = testY;
    fenceArea.baseHeight = terrain[testX][testY];
    fenceArea.isPlaced = true;
    fenceArea.gatePos = floor(random(4));
    break;
  }
}

// Generate fence
function generateFence() {
  fenceArea.posts = [];
  fenceArea.rails = [];
  
  // Calculate fence boundaries
  let left = fenceArea.centerX - fenceArea.width / 2;
  let right = fenceArea.centerX + fenceArea.width / 2;
  let top = fenceArea.centerY - fenceArea.height / 2;
  let bottom = fenceArea.centerY + fenceArea.height / 2;
  
  // Generate fence posts around the perimeter, skip gate positions
  // North fence (top)
  let gateStartX = 0, gateEndX = 0, gateStartY = 0, gateEndY = 0;
  
  // Calculate gate position
  if (fenceArea.gatePos === 0) { // North gate
    gateStartX = fenceArea.centerX - fenceArea.gateWidth / 2;
    gateEndX = fenceArea.centerX + fenceArea.gateWidth / 2;
    gateStartY = top;
    gateEndY = top;
  } else if (fenceArea.gatePos === 1) { // East gate
    gateStartX = right;
    gateEndX = right;
    gateStartY = fenceArea.centerY - fenceArea.gateWidth / 2;
    gateEndY = fenceArea.centerY + fenceArea.gateWidth / 2;
  } else if (fenceArea.gatePos === 2) { // South gate
    gateStartX = fenceArea.centerX - fenceArea.gateWidth / 2;
    gateEndX = fenceArea.centerX + fenceArea.gateWidth / 2;
    gateStartY = bottom;
    gateEndY = bottom;
  } else if (fenceArea.gatePos === 3) { // West gate
    gateStartX = left;
    gateEndX = left;
    gateStartY = fenceArea.centerY - fenceArea.gateWidth / 2;
    gateEndY = fenceArea.centerY + fenceArea.gateWidth / 2;
  }
  
  // Save gate position information for collision detection
  fenceArea.gate = {
    startX: gateStartX,
    startY: gateStartY,
    endX: gateEndX,
    endY: gateEndY
  };
  
  // Generate fence posts
  for (let x = left; x <= right; x += fenceArea.postSpacing) {
    // North fence posts (skip gate)
    if (fenceArea.gatePos !== 0 || x < gateStartX || x > gateEndX) {
      fenceArea.posts.push({
        x: x,
        y: top,
        height: fenceArea.postHeight
      });
    }
    
    // South fence posts (skip gate)
    if (fenceArea.gatePos !== 2 || x < gateStartX || x > gateEndX) {
      fenceArea.posts.push({
        x: x,
        y: bottom,
        height: fenceArea.postHeight
      });
    }
  }
  
  for (let y = top; y <= bottom; y += fenceArea.postSpacing) {
    // West fence posts (skip gate)
    if (fenceArea.gatePos !== 3 || y < gateStartY || y > gateEndY) {
      fenceArea.posts.push({
        x: left,
        y: y,
        height: fenceArea.postHeight
      });
    }
    
    // East fence posts (skip gate)
    if (fenceArea.gatePos !== 1 || y < gateStartY || y > gateEndY) {
      fenceArea.posts.push({
        x: right,
        y: y,
        height: fenceArea.postHeight
      });
    }
  }
  
  // Generate fence rails, create two rails between each pair of adjacent posts
  for (let i = 0; i < fenceArea.posts.length; i++) {
    let post1 = fenceArea.posts[i];
    
    // Find adjacent posts (only search same side)
    for (let j = 0; j < fenceArea.posts.length; j++) {
      if (i === j) continue;
      
      let post2 = fenceArea.posts[j];
      let distance = dist(post1.x, post1.y, post2.x, post2.y);
      
      // If posts are on same side and adjacent (distance approximately equals spacing)
      if (distance < fenceArea.postSpacing * 1.5) {
        // Create two rails
        for (let railLevel = 0; railLevel < 2; railLevel++) {
          fenceArea.rails.push({
            x1: post1.x,
            y1: post1.y,
            x2: post2.x,
            y2: post2.y,
            height: fenceArea.postHeight * (0.3 + railLevel * 0.4) // Upper and lower rails
          });
        }
      }
    }
  }
  
  // Create gate frame and gate
  if (fenceArea.gatePos === 0 || fenceArea.gatePos === 2) { // North gate or south gate
    // Create gate posts
    fenceArea.gatePosts = [
      {
        x: gateStartX,
        y: fenceArea.gatePos === 0 ? top : bottom,
        height: fenceArea.postHeight * 1.2 // Gate posts slightly taller
      },
      {
        x: gateEndX,
        y: fenceArea.gatePos === 0 ? top : bottom,
        height: fenceArea.postHeight * 1.2
      }
    ];
    // Create gate beam
    fenceArea.gateBeam = {
      x1: gateStartX,
      y1: fenceArea.gatePos === 0 ? top : bottom,
      x2: gateEndX,
      y2: fenceArea.gatePos === 0 ? top : bottom,
      height: fenceArea.postHeight * 0.9
    };
  } else { // East gate or west gate
    // Create gate posts
    fenceArea.gatePosts = [
      {
        x: fenceArea.gatePos === 1 ? right : left,
        y: gateStartY,
        height: fenceArea.postHeight * 1.2
      },
      {
        x: fenceArea.gatePos === 1 ? right : left,
        y: gateEndY,
        height: fenceArea.postHeight * 1.2
      }
    ];
    // Create gate beam
    fenceArea.gateBeam = {
      x1: fenceArea.gatePos === 1 ? right : left,
      y1: gateStartY,
      x2: fenceArea.gatePos === 1 ? right : left,
      y2: gateEndY,
      height: fenceArea.postHeight * 0.9
    };
  }
  
  // Create gate planks
  fenceArea.gatePlanks = [];
  let plankCount = 5;
  
  if (fenceArea.gatePos === 0 || fenceArea.gatePos === 2) { // North gate or south gate
    let plankWidth = fenceArea.gateWidth / plankCount;
    for (let i = 0; i < plankCount; i++) {
      fenceArea.gatePlanks.push({
        x: gateStartX + i * plankWidth + plankWidth / 2,
        y: fenceArea.gatePos === 0 ? top : bottom,
        width: plankWidth * 0.8,
        height: fenceArea.postHeight * 0.8,
        rotation: fenceArea.gatePos === 0 ? 0 : PI
      });
    }
  } else { // East gate or west gate
    let plankWidth = fenceArea.gateWidth / plankCount;
    for (let i = 0; i < plankCount; i++) {
      fenceArea.gatePlanks.push({
        x: fenceArea.gatePos === 1 ? right : left,
        y: gateStartY + i * plankWidth + plankWidth / 2,
        width: plankWidth * 0.8,
        height: fenceArea.postHeight * 0.8,
        rotation: fenceArea.gatePos === 1 ? HALF_PI : -HALF_PI
      });
    }
  }
}

// Generate sheep
function generateSheep() {
  sheepList = [];
  
  // Determine number of sheep (increased to 16)
  let numSheep = 16;
  
  // Calculate fence boundaries (slightly smaller to ensure sheep stay within fence)
  let left = fenceArea.centerX - fenceArea.width / 2 + 2;
  let right = fenceArea.centerX + fenceArea.width / 2 - 2;
  let top = fenceArea.centerY - fenceArea.height / 2 + 2;
  let bottom = fenceArea.centerY + fenceArea.height / 2 - 2;
  
  // Create sheep
  for (let i = 0; i < numSheep; i++) {
    // Randomly place sheep within fence
    let sheepX = random(left, right);
    let sheepY = random(top, bottom);
    
    // Ensure sheep don't overlap with each other
    let validPosition = false;
    let attempts = 0;
    while (!validPosition && attempts < 20) {
      validPosition = true;
      for (let other of sheepList) {
        if (dist(sheepX, sheepY, other.x, other.y) < 3) {
          validPosition = false;
          sheepX = random(left, right);
          sheepY = random(top, bottom);
          break;
        }
      }
        attempts++;
    }
      
    // Create sheep object
    let sheep = {
      x: sheepX,
      y: sheepY,
      size: random(7, 10),
      bodyColor: color(250, 250, 250, 240),
      headColor: color(200, 200, 200),
      legColor: color(90, 90, 90),
      rotation: random(TWO_PI),
      moveTimer: random(100, 200),
      state: 'idle', // idle, walking
      walkSpeed: random(0.02, 0.05),
      targetX: sheepX,
      targetY: sheepY,
      woolOffset: [] // Random offset for wool
    };
    
    // Create random offsets for wool
    for (let j = 0; j < 10; j++) {
      sheep.woolOffset.push({
        x: random(-0.2, 0.2),
        y: random(-0.2, 0.2),
        z: random(-0.2, 0.2),
        size: random(0.8, 1.2)
      });
    }
    
    sheepList.push(sheep);
  }
}

// Update pumpkin man height
function updatePumpkinHeight() {
  // Ensure coordinates are within range
  pumpkinMan.gridX = constrain(pumpkinMan.gridX, 0, cols - 1);
  pumpkinMan.gridY = constrain(pumpkinMan.gridY, 0, rows - 1);
  
  // River position
  let riverY = bridge.riverRow;
  let bridgeCenter = bridge.centerCol;
  let bridge2Center = bridge2.centerCol;
  
  // Use water level set during terrain generation
  let waterLevel = bridge.waterLevel || -40;
  
  // Check if on first bridge north step
  let onNorthStep = false;
  if (bridge.northStepX && bridge.northStepY) { // Ensure step information is defined
    // Step detection area covers extensively onto bridge surface
    if (abs(pumpkinMan.gridX - bridge.northStepX) <= bridge.northStepWidth / 2 + 3 &&
        abs(pumpkinMan.gridY - bridge.northStepY) <= bridge.northStepDepth / 2 + 3) {
      // Calculate closest point to bridge surface
      let bridgeCenter = bridge.centerCol;
      let riverY = bridge.riverRow;
      let bridgeWidth = bridge.width;
      let bridgeLength = bridge.length;
      let bridgeX = bridge.centerCol;
      // Determine if at step-bridge intersection
      let onBridgeArea = abs(pumpkinMan.gridX - bridgeCenter) <= bridgeWidth/2 + 1.5 &&
                         pumpkinMan.gridY >= riverY - bridgeLength/2 && pumpkinMan.gridY <= riverY + bridgeLength/2;
      if (onBridgeArea) {
        // Blend step height and bridge surface height
        let bridgePos = (pumpkinMan.gridY - (riverY - bridgeLength/2)) / bridgeLength;
        let archHeight = sin(PI * bridgePos) * 40;
        let bridgeHeight = waterLevel + 50 + archHeight;
        // Distance to step center
        let distToStep = dist(pumpkinMan.gridX, pumpkinMan.gridY, bridge.northStepX, bridge.northStepY);
        // Blend within 0 to 3 range
        let blend = constrain(map(distToStep, 0, 3, 0, 1), 0, 1);
        pumpkinMan.height = lerp(bridge.northStepRealHeight, bridgeHeight, blend);
        pumpkinMan.onStep = "north";
        return;
      } else {
        // Only on step
        pumpkinMan.height = bridge.northStepRealHeight;
        pumpkinMan.onStep = "north";
        return;
      }
    }
    
    // Add transition area around step
    let stepTransitionDistance = 4.0; // Increase step transition area size
    let distToNorthStep = dist(pumpkinMan.gridX, pumpkinMan.gridY, 
                             bridge.northStepX, bridge.northStepY);
    
    if (distToNorthStep <= bridge.northStepWidth/2 + stepTransitionDistance + 0.1) {
      // Within step transition area
      let terrainHeight = terrain[Math.floor(pumpkinMan.gridX)][Math.floor(pumpkinMan.gridY)];
      let stepHeight = bridge.northStepRealHeight;
      
      // Calculate blend factor (0-1), closer to step means closer to step height
      let blendFactor = map(distToNorthStep, 
                          bridge.northStepWidth/2, 
                          bridge.northStepWidth/2 + stepTransitionDistance,
                          0.7, 0); // From 70% step height to 0% (completely terrain height)
      
      // Use square function to make transition smoother
      blendFactor = blendFactor * blendFactor; // Square makes transition more concentrated at step edge
      
      // Blend height
      pumpkinMan.height = lerp(terrainHeight, stepHeight, blendFactor);
      console.log("Pumpkin man in first bridge north step transition area! Height: " + pumpkinMan.height);
      return;
    }
  }
  
  // Check if on the first bridge south step
  let onSouthStep = false;
  if (bridge.southStepX && bridge.southStepY) { // Ensure step information is defined
    if (abs(pumpkinMan.gridX - bridge.southStepX) <= bridge.southStepWidth / 2 + 3 &&
        abs(pumpkinMan.gridY - bridge.southStepY) <= bridge.southStepDepth / 2 + 3) {
      let bridgeCenter = bridge.centerCol;
      let riverY = bridge.riverRow;
      let bridgeWidth = bridge.width;
      let bridgeLength = bridge.length;
      let onBridgeArea = abs(pumpkinMan.gridX - bridgeCenter) <= bridgeWidth/2 + 1.5 &&
                         pumpkinMan.gridY >= riverY - bridgeLength/2 && pumpkinMan.gridY <= riverY + bridgeLength/2;
      if (onBridgeArea) {
        let bridgePos = (pumpkinMan.gridY - (riverY - bridgeLength/2)) / bridgeLength;
        let archHeight = sin(PI * bridgePos) * 40;
        let bridgeHeight = waterLevel + 50 + archHeight;
        let distToStep = dist(pumpkinMan.gridX, pumpkinMan.gridY, bridge.southStepX, bridge.southStepY);
        let blend = constrain(map(distToStep, 0, 3, 0, 1), 0, 1);
        pumpkinMan.height = lerp(bridge.southStepRealHeight, bridgeHeight, blend);
        pumpkinMan.onStep = "south";
        return;
      } else {
        pumpkinMan.height = bridge.southStepRealHeight;
        pumpkinMan.onStep = "south";
        return;
      }
    }
    
    // Add transition area around step
    let stepTransitionDistance = 4.0; // Increase step transition area size
    let distToSouthStep = dist(pumpkinMan.gridX, pumpkinMan.gridY, 
                             bridge.southStepX, bridge.southStepY);
    
    if (distToSouthStep <= bridge.southStepWidth/2 + stepTransitionDistance + 0.1) {
      // Within step transition area
      let terrainHeight = terrain[Math.floor(pumpkinMan.gridX)][Math.floor(pumpkinMan.gridY)];
      let stepHeight = bridge.southStepRealHeight;
      
      // Calculate blend factor (0-1), closer to step means closer to step height
      let blendFactor = map(distToSouthStep, 
                          bridge.southStepWidth/2, 
                          bridge.southStepWidth/2 + stepTransitionDistance,
                          0.7, 0); // From 70% step height to 0% (completely terrain height)
      
      // Use square function to make transition smoother
      blendFactor = blendFactor * blendFactor; // Square makes transition more concentrated at step edge
      
      // Blend height
      pumpkinMan.height = lerp(terrainHeight, stepHeight, blendFactor);
      console.log("Pumpkin man in first bridge south step transition area! Height: " + pumpkinMan.height);
      return;
    }
  }
  
  // Check if on second bridge north step
  if (bridge2.northStepX && bridge2.northStepY) { // Ensure step information is defined
    if (abs(pumpkinMan.gridX - bridge2.northStepX) <= bridge2.northStepWidth / 2 + 3 &&
        abs(pumpkinMan.gridY - bridge2.northStepY) <= bridge2.northStepDepth / 2 + 3) {
      let bridge2Center = bridge2.centerCol;
      let riverY = bridge2.riverRow;
      let bridge2Width = bridge2.width;
      let bridge2Length = bridge2.length;
      let onBridgeArea = abs(pumpkinMan.gridX - bridge2Center) <= bridge2Width/2 + 1.5 &&
                         pumpkinMan.gridY >= riverY - bridge2Length/2 && pumpkinMan.gridY <= riverY + bridge2Length/2;
      if (onBridgeArea) {
        let bridgePos = (pumpkinMan.gridY - (riverY - bridge2Length/2)) / bridge2Length;
        let archHeight = sin(PI * bridgePos) * 30;
        let bridgeHeight = waterLevel + 45 + archHeight;
        let distToStep = dist(pumpkinMan.gridX, pumpkinMan.gridY, bridge2.northStepX, bridge2.northStepY);
        let blend = constrain(map(distToStep, 0, 3, 0, 1), 0, 1);
        pumpkinMan.height = lerp(bridge2.northStepRealHeight, bridgeHeight, blend);
        pumpkinMan.onStep = "bridge2_north";
        return;
      } else {
        pumpkinMan.height = bridge2.northStepRealHeight;
        pumpkinMan.onStep = "bridge2_north";
        return;
      }
    }
    
    // Add transition area around stone bridge north step
    let stepTransitionDistance = 2.5; // Increase stone bridge transition area size
    let distToNorthStep = dist(pumpkinMan.gridX, pumpkinMan.gridY, 
                             bridge2.northStepX, bridge2.northStepY);
    
    if (distToNorthStep <= bridge2.northStepWidth/2 + stepTransitionDistance + 0.1) {
      // Within step transition area
      let terrainHeight = terrain[Math.floor(pumpkinMan.gridX)][Math.floor(pumpkinMan.gridY)];
      let stepHeight = bridge2.northStepRealHeight;
      
      // Calculate blend factor (0-1), closer to step means closer to step height
      let blendFactor = map(distToNorthStep, 
                          bridge2.northStepWidth/2, 
                          bridge2.northStepWidth/2 + stepTransitionDistance,
                          0.9, 0); // From 90% step height to 0% (completely terrain height)
      
      // Blend height
      pumpkinMan.height = lerp(terrainHeight, stepHeight, blendFactor);
      console.log("Pumpkin man in second bridge north step transition area! Height: " + pumpkinMan.height);
      return;
    }
  }
  
  // Check if on second bridge south step
  if (bridge2.southStepX && bridge2.southStepY) { // Ensure step information is defined
    if (abs(pumpkinMan.gridX - bridge2.southStepX) <= bridge2.southStepWidth / 2 + 3 &&
        abs(pumpkinMan.gridY - bridge2.southStepY) <= bridge2.southStepDepth / 2 + 3) {
      let bridge2Center = bridge2.centerCol;
      let riverY = bridge2.riverRow;
      let bridge2Width = bridge2.width;
      let bridge2Length = bridge2.length;
      let onBridgeArea = abs(pumpkinMan.gridX - bridge2Center) <= bridge2Width/2 + 1.5 &&
                         pumpkinMan.gridY >= riverY - bridge2Length/2 && pumpkinMan.gridY <= riverY + bridge2Length/2;
      if (onBridgeArea) {
        let bridgePos = (pumpkinMan.gridY - (riverY - bridge2Length/2)) / bridge2Length;
        let archHeight = sin(PI * bridgePos) * 30;
        let bridgeHeight = waterLevel + 45 + archHeight;
        let distToStep = dist(pumpkinMan.gridX, pumpkinMan.gridY, bridge2.southStepX, bridge2.southStepY);
        let blend = constrain(map(distToStep, 0, 3, 0, 1), 0, 1);
        pumpkinMan.height = lerp(bridge2.southStepRealHeight, bridgeHeight, blend);
        pumpkinMan.onStep = "bridge2_south";
        return;
      } else {
        pumpkinMan.height = bridge2.southStepRealHeight;
        pumpkinMan.onStep = "bridge2_south";
        return;
      }
    }
    
    // Add transition area around stone bridge south step
    let stepTransitionDistance = 2.5; // Increase stone bridge transition area size
    let distToSouthStep = dist(pumpkinMan.gridX, pumpkinMan.gridY, 
                             bridge2.southStepX, bridge2.southStepY);
    
    if (distToSouthStep <= bridge2.southStepWidth/2 + stepTransitionDistance + 0.1) {
      // Within step transition area
      let terrainHeight = terrain[Math.floor(pumpkinMan.gridX)][Math.floor(pumpkinMan.gridY)];
      let stepHeight = bridge2.southStepRealHeight;
      
      // Calculate blend factor (0-1), closer to step means closer to step height
      let blendFactor = map(distToSouthStep, 
                          bridge2.southStepWidth/2, 
                          bridge2.southStepWidth/2 + stepTransitionDistance,
                          0.9, 0); // From 90% step height to 0% (completely terrain height)
      
      // Blend height
      pumpkinMan.height = lerp(terrainHeight, stepHeight, blendFactor);
      console.log("Pumpkin man in second bridge south step transition area! Height: " + pumpkinMan.height);
      return;
    }
  }
  
  // If not on any step, clear marker
  pumpkinMan.onStep = null;
  
  // Check if on first bridge or near first bridge
  // Check if near bridge edge - add transition zone
  let bridgeTransitionDistance = 2.0; 
  let inBridge1XRange = abs(pumpkinMan.gridX - bridgeCenter) <= bridge.width/2 + 1.5;
  let northEdge1Distance = abs(pumpkinMan.gridY - (riverY - bridge.length/2));
  let southEdge1Distance = abs(pumpkinMan.gridY - (riverY + bridge.length/2));
  
  // Within bridge X range and close to north/south edges
  if (inBridge1XRange && (northEdge1Distance <= bridgeTransitionDistance || 
                         southEdge1Distance <= bridgeTransitionDistance)) {
    
    // First determine which edge
    let isNorthEdge = northEdge1Distance <= bridgeTransitionDistance;
    let edgeY = isNorthEdge ? riverY - bridge.length/2 : riverY + bridge.length/2;
    let distToEdge = abs(pumpkinMan.gridY - edgeY);
    
    if (pumpkinMan.gridY >= riverY - bridge.length/2 && 
        pumpkinMan.gridY <= riverY + bridge.length/2) {
      // Already on bridge but near edge - ensure smooth connection to steps
      let bridgePos = (pumpkinMan.gridY - (riverY - bridge.length/2)) / bridge.length;
      let archHeight = sin(PI * bridgePos) * 40; // Consistent with rendering
      pumpkinMan.height = waterLevel + 50 + archHeight;
    } else {
      // In bridge edge transition area
      let terrainHeight = terrain[Math.floor(pumpkinMan.gridX)][Math.floor(pumpkinMan.gridY)];
      
      // Calculate height on bridge (take edge point height)
      let edgeBridgePos = isNorthEdge ? 0 : 1; // North edge is 0, south edge is 1
      let bridgeArchHeight = sin(PI * edgeBridgePos) * 40;
      let bridgeEdgeHeight = waterLevel + 50 + bridgeArchHeight;
      
      // Calculate blend factor - closer to bridge means closer to bridge surface height
      let blendFactor = map(distToEdge, 0, bridgeTransitionDistance, 1, 0);
      
      // Blend height
      pumpkinMan.height = lerp(terrainHeight, bridgeEdgeHeight, blendFactor);
      console.log("Pumpkin man in first bridge edge transition area! Height: " + pumpkinMan.height);
      return;
    }
  }
  
  // Check if on first bridge
  let onBridge = false;
  if (abs(pumpkinMan.gridX - bridgeCenter) <= bridge.width/2 + 1.5 && 
      pumpkinMan.gridY >= riverY - bridge.length/2 && pumpkinMan.gridY <= riverY + bridge.length/2) {
    onBridge = true;
    
    // Calculate position on bridge (0-1 range)
    let bridgePos = (pumpkinMan.gridY - (riverY - bridge.length/2)) / bridge.length;
    
    // Calculate arch bridge height based on position
    let archHeight = sin(PI * bridgePos) * 40; // Consistent with rendering
    
    // If on bridge, set height to arch bridge surface height
    // Bridge surface height = water level + bridge height + arch height
    pumpkinMan.height = waterLevel + 50 + archHeight;
    
    console.log("Pumpkin man on first bridge! Height: " + pumpkinMan.height + ", arch height: " + archHeight);
    return; // Height determined, return directly
  }
  
  // Check if on second bridge or near second bridge
  // Check if near bridge edge - add transition zone
  // Use same transition area size
  let inBridgeXRange = abs(pumpkinMan.gridX - bridge2Center) <= bridge2.width/2 + 1.5;
  let northEdgeDistance = abs(pumpkinMan.gridY - (riverY - bridge2.length/2));
  let southEdgeDistance = abs(pumpkinMan.gridY - (riverY + bridge2.length/2));
  
  // Within bridge X range and close to north/south edges
  if (inBridgeXRange && (northEdgeDistance <= bridgeTransitionDistance || 
                         southEdgeDistance <= bridgeTransitionDistance)) {
    
    // First determine which edge
    let isNorthEdge = northEdgeDistance <= bridgeTransitionDistance;
    let edgeY = isNorthEdge ? riverY - bridge2.length/2 : riverY + bridge2.length/2;
    let distToEdge = abs(pumpkinMan.gridY - edgeY);
    
    if (pumpkinMan.gridY >= riverY - bridge2.length/2 && 
        pumpkinMan.gridY <= riverY + bridge2.length/2) {
      // Already on bridge but near edge - ensure smooth connection to steps
      let bridgePos = (pumpkinMan.gridY - (riverY - bridge2.length/2)) / bridge2.length;
      let archHeight = sin(PI * bridgePos) * 30;
      pumpkinMan.height = waterLevel + 45 + archHeight;
    } else {
      // In bridge edge transition area
      let terrainHeight = terrain[Math.floor(pumpkinMan.gridX)][Math.floor(pumpkinMan.gridY)];
      
      // Calculate height on bridge (take edge point height)
      let edgeBridgePos = isNorthEdge ? 0 : 1; // North edge is 0, south edge is 1
      let bridgeArchHeight = sin(PI * edgeBridgePos) * 30;
      let bridgeEdgeHeight = waterLevel + 45 + bridgeArchHeight;
      
      // Calculate blend factor - closer to bridge means closer to bridge surface height
      let blendFactor = map(distToEdge, 0, bridgeTransitionDistance, 1, 0);
      
      // Blend height
      pumpkinMan.height = lerp(terrainHeight, bridgeEdgeHeight, blendFactor);
      console.log("Pumpkin man in second bridge edge transition area! Height: " + pumpkinMan.height);
      return;
    }
  }
  
  // Check if on second bridge (completely on bridge)
  if (abs(pumpkinMan.gridX - bridge2Center) <= bridge2.width/2 + 1.5 && 
      pumpkinMan.gridY >= riverY - bridge2.length/2 && pumpkinMan.gridY <= riverY + bridge2.length/2) {
    
    // Calculate position on bridge (0-1 range)
    let bridgePos = (pumpkinMan.gridY - (riverY - bridge2.length/2)) / bridge2.length;
    
    // Calculate arch bridge height based on position - stone bridge arch is much lower than wooden bridge
    let archHeight = sin(PI * bridgePos) * 30; // Consistent with rendering
    
    // If on bridge, set height to arch bridge surface height
    // Bridge surface height = water level + bridge height + arch height
    pumpkinMan.height = waterLevel + 45 + archHeight;
    
    console.log("Pumpkin man on second bridge! Height: " + pumpkinMan.height + ", arch height: " + archHeight);
    return; // Height determined, return directly
  }
  
  // If not on any bridge or step, use terrain height
  pumpkinMan.height = terrain[Math.floor(pumpkinMan.gridX)][Math.floor(pumpkinMan.gridY)];
}

// 🌊 Update and draw fountain
function drawFountain() {
  if (!fountain.active) return;
  
  fountain.time += 0.02;
  
  let fountainX = fountain.gridX * scl;
  let fountainY = fountain.gridY * scl;
  let fountainZ = terrain[fountain.gridX][fountain.gridY];
  
  // === Part 1: Base (keep vertical, no rotation) ===
  push();
  translate(fountainX, fountainY, fountainZ + fountain.baseRadius/2);
  rotateX(HALF_PI); // Base rotates 90 degrees around X-axis
  
  // Base - marble texture, no grid lines
  fill(toGrayScale(200, 200, 220));
  noStroke();
  cylinder(fountain.baseRadius, 15, 16, 1);
  
  // Decorative ring patterns
  push();
  rotateX(HALF_PI);  
  fill(toGrayScale(32,178,170));
  stroke(toGrayScale(173,216,230));
  strokeWeight(3);
 
  for(let i = 0; i < 16; i++) {
    ellipse(0, 0, (fountain.baseRadius - i * 5) * 2);
  }
  pop();

// Draw multiple decreasing ripples on top of base
for(let i = 0; i < 5; i++) {
  let yPos = i * 5 + 5;           // Y-axis position: 0, 5, 10, 15, 20
  let sizeScale = 1 - i * 0.15; // Size scaling: 1.0, 0.85, 0.7, 0.55, 0.4
  drawFountainRipples(0, yPos, 0, sizeScale);
}
  
  pop();

  // Decorative ring patterns
  noFill();
  stroke(220, 220, 240, 150);
  strokeWeight(1);
 
  for(let i = 0; i < 3; i++) {
    ellipse(0, 0, (fountain.baseRadius - i * 5) * 2);
  }
  
  // === Part 2: Water jet system (90 degree X-axis rotation) ===
  push();
  translate(fountainX, fountainY, fountainZ + fountain.baseRadius/2 + 10);
  rotateX(HALF_PI); // X-axis rotation 90 degrees
  
  // Create new water drop particles (if not frozen)
  if (frameCount % 2 === 0 && !fountainChallenge.allObjectsFrozen) {
    createFountainParticle(0, 0, 0);
  }
  
  // Water spout (in rotated coordinate system)
  fill(120, 120, 140);
  noStroke();
  cylinder(8, 40, 8,1);
  
  // Update and draw water drop particles
  for (let i = fountain.particles.length - 1; i >= 0; i--) {
    let p = fountain.particles[i];
    // Only update particles when not frozen
    if (!fountainChallenge.allObjectsFrozen) {
      updateFountainParticle(p);
    }
    drawFountainParticle(p);
    
    // Remove particles that have reached end of life
    if (p.life <= 0 || p.localZ < -100) {
      fountain.particles.splice(i, 1);
    }
  }

  pop(); // End rotation part
}

function createFountainParticle(x, y, z) {
  let angle = random(0, TWO_PI);
  let speed = random(6, 12);
  let upSpeed = random(15, 25);
  
  let particle = {
    localX: x + random(-3, 3),
    localY: y + random(-3, 3),
    localZ: z + 15,
    vx: sin(angle) * speed * 0.4, // Spray towards X-axis
    vy: upSpeed ,
    vz: cos(angle) * speed * 0.4,
    life: random(80, 150),
    maxLife: 150,
    size: random(2, 5),
    hue: random(180, 220), // Blue tones
    brightness: random(80, 100),
    sparkle: random() < 0.3
  };
  
  fountain.particles.push(particle);
}

function updateFountainParticle(p) {
  p.localX += p.vx;
  p.localY += p.vy;
  p.localZ += p.vz;
  
  // Gravity - in rotated coordinate system, gravity now acts on Y-axis
  p.vy -= 0.7;
  
  // Air resistance
  p.vx *= 0.998;
  p.vy *= 0.998;
  p.vz *= 0.998;
  
  // Slight random perturbation
  p.vx += random(-0.05, 0.05);
  p.vy += random(-0.05, 0.05);
  
  p.life--;
  
  // Color change
  p.hue = (p.hue + 0.5) % 360;
}

function drawFountainParticle(p) {
  push();
  translate(p.localX, p.localY, p.localZ);
  
  let lifeRatio = p.life / p.maxLife;
  let alpha = map(lifeRatio, 0, 1, 0, 200);
  let currentSize = map(lifeRatio, 0, 1, p.size * 0.3, p.size);
  
  // Main water drop - blue translucent
  fill(100, 180, 255, alpha);
  noStroke();
  sphere(currentSize);
  
  // Highlight effect
  fill(255, 255, 255, alpha * 0.8);
  sphere(currentSize * 0.4);
  
  // Sparkle effect
  if(p.sparkle && sin(frameCount * 0.3) > 0.5) {
    fill(200, 220, 255, alpha);
    sphere(currentSize * 0.6);
  }
  
  pop();
}

function drawFountainRipples(x, y, z, sizeScale = 1.0) {
  push();
  translate(x, y, z);
  
  // Perpendicular to horizontal base surface, so ripples need to rotate 90 degrees upright
  rotateX(HALF_PI);
  
  // Vertical ripples, like upright circular rings
  noFill();
  strokeWeight(1.5);
  
  for(let i = 0; i < 5; i++) {
    let rippleAlpha = map(sin(fountain.time * 3 + i * 0.7), -1, 1, 30, 120);
    stroke(100, 180, 255, rippleAlpha);
    
    let rippleSize = ((sin(fountain.time * 2 + i * 0.6) + 1) * 15 + i * 12) * sizeScale;
    
    // Vertical circular ring ripples, perpendicular to base surface
    ellipse(0, 0, rippleSize, rippleSize);
  }
  
  pop();
}

function draw() {
  // Pre-declare camera related variables to avoid scope errors
  let lookX = 0, lookY = 0, lookAltitude = 0;
  let pumpkinPosX = 0, pumpkinPosY = 0, pumpkinPosZ = 0;
  
  // Update HTML text content (display completely on screen)
  updateHTMLText();
  perspective(PI / 2.5, width / height, 0.1, 5000); // Expand field of view angle
  background(0); // Always black background

  // === 3D gradient background plane ===
  push();
  resetMatrix(); // Cancel all 3D transformations
  translate(0, 0, -2000); // Place far behind camera
  noStroke();
  for (let y = -height/2; y < height/2; y += 2) {
    let inter = map(y, -height/2, height/2, 0, 1);
    let c = lerpColor(color(255, 230, 80), color(220, 60, 40), pow(inter, 0.9));
    fill(c);
    rect(-width/2, y, width, 2);
  }
  pop();

  // === Comment out original 2D background lines ===
  // for (let y = 0; y < height; y++) {
  //   let inter = map(y, 0, height, 0, 1);
  //   let c = lerpColor(color(255, 230, 80), color(220, 60, 40), pow(inter, 0.9));
  //   stroke(c);
  //   line(-width/2, y - height/2, width/2, y - height/2);
  // }

  // If in fragmentation animation stage
  if (fragmentActive) {
    // --- Lock camera to overhead view of terrain center ---
    let centerX = w / 2;
    let centerY = h / 2;
    let camZ = max(w, h) * 0.7; // Closer, fragments fill screen more
    camera(centerX, centerY, camZ, centerX, centerY, 0, 0, 1, 0);
    // --- Render fragments ---
    drawFragmentPieces();
    // Display countdown
    push();
    resetMatrix();
    fill(255, 50, 50);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(32);
    let timeLeft = Math.max(0, Math.ceil(FRAGMENT_DURATION - (millis() - fragmentStartTime) / 1000));
    text(`Terrain Collapse: ${timeLeft}s`, 0, -height/2 + 40);
    pop();
    // Reset after 50 seconds
    if ((millis() - fragmentStartTime) / 1000 > FRAGMENT_DURATION) {
      resetAllGameState();
    }
      return;
    }
  
  // Handle pumpkin character movement
  handlePumpkinMovement();
  
  // Update sheep status
  updateSheep();
  
  // Fixed lighting
  ambientLight(180, 180, 180);
  directionalLight(255, 255, 200, 0.5, 1, -0.5);

  // --- Set perspective based on camera mode ---
  if (followCamera) {
    // Follow camera mode - no need for push/pop, set camera directly
    // Calculate pumpkin character's world coordinates
    let pumpkinPosX = pumpkinMan.gridX * scl;
    let pumpkinPosY = pumpkinMan.gridY * scl;
    let pumpkinPosZ = pumpkinMan.height;
    
    // Calculate camera position - follow behind pumpkin, but allow minor view adjustments
    let backAngle = pumpkinMan.rotationY + pumpkinViewOffsetX; // Add horizontal offset
    let lookZ = pumpkinPosZ + pumpkinMan.size + pumpkinViewOffsetY * 100; // Add vertical offset
    
    // Calculate camera position based on view distance
    let lookX = pumpkinPosX - pumpkinViewDistance * sin(backAngle);
    let lookY = pumpkinPosY - pumpkinViewDistance * cos(backAngle);
    let lookAltitude = pumpkinPosZ + 100 + pumpkinViewOffsetY * 100; // Camera height
    // Camera minimum height limit
    let camGroundZ = getInterpolatedHeight(lookX / scl, lookY / scl) + 40;
    if (lookAltitude < camGroundZ) lookAltitude = camGroundZ;
    // Set camera position
    camera(lookX, lookY, lookAltitude, pumpkinPosX, pumpkinPosY, lookZ, 0, 0, -1);
    
    // Debug output for camera and pumpkin position
    console.log(`Camera Position: (${lookX.toFixed(2)}, ${lookY.toFixed(2)}, ${lookAltitude.toFixed(2)})`);
    console.log(`View Offsets: X=${pumpkinViewOffsetX.toFixed(2)}, Y=${pumpkinViewOffsetY.toFixed(2)}, Distance=${pumpkinViewDistance.toFixed(0)}`);
  } else {
    // Free view mode - use camera() function for true free view
    updateFreeCameraPosition();
    camera(freeCam.x, freeCam.y, freeCam.z, 
           freeCam.targetX, freeCam.targetY, freeCam.targetZ, 
           0, 0, -1);
  }

  // Terrain color blocks (gradient fill)
  noStroke();
  for (let y = 0; y < rows - 1; y++) {
    beginShape(TRIANGLE_STRIP);
    for (let x = 0; x < cols; x++) {
      let h1 = terrain[x][y];
      let h2 = terrain[x][y + 1];
      let c1, c2;
      
      // Check if this position is on a hill
      let isOnHill1 = false;
      let isOnHill2 = false;
      
      for (let hill of hillsList) {
        if (dist(x, y, hill.x, hill.y) < hill.radius * 0.8) {
          isOnHill1 = true;
        }
        if (dist(x, y + 1, hill.x, hill.y) < hill.radius * 0.8) {
          isOnHill2 = true;
        }
      }
      
      // Use different color schemes based on different terrain styles
      switch(terrainStyle) {
        case 'mountains':
          if (isOnHill1) {
            // Hill areas use special colors
            if (h1 > 90) {
              c1 = color(220, 200, 180); // Hill top
            } else if (h1 > 60) {
              c1 = color(180, 160, 110); // Hill upper part
            } else {
              c1 = color(140, 170, 90);  // Hill lower part
            }
          } else if (h1 > 100) {
            c1 = color(200, 180, 150); // Mountain peak
      } else if (h1 > 50) {
            c1 = color(160, 140, 90);  // Mountain slope
      } else if (h1 > 0) {
            c1 = color(120, 150, 80);  // Lowland
      } else {
            c1 = color(100, 130, 70);  // Valley
          }
          break;
          
        case 'desert':
          if (isOnHill1) {
            // Desert hills
            if (h1 > 90) {
              c1 = color(250, 230, 160); // Sand dune top
            } else if (h1 > 60) {
              c1 = color(240, 210, 130); // Sand dune upper part
            } else {
              c1 = color(230, 190, 100); // Sand dune lower part
            }
          } else if (h1 > 50) {
            c1 = color(240, 220, 140); // Sand dune top
          } else if (h1 > 0) {
            c1 = color(230, 200, 110); // Sand dune
          } else if (h1 > -30) {
            c1 = color(210, 180, 95);  // Low sandy area
          } else {
            c1 = color(200, 170, 90);  // Desert valley
          }
          break;
          
        case 'islands':
          if (isOnHill1) {
            // Island hills
            if (h1 > 90) {
              c1 = color(140, 200, 80); // Island peak
            } else if (h1 > 60) {
              c1 = color(130, 190, 75); // Island slope
            } else {
              c1 = color(120, 180, 65); // Island lowland
            }
          } else if (h1 > 50) {
            c1 = color(120, 180, 70);  // Island highland
          } else if (h1 > 0) {
            c1 = color(210, 200, 120); // Beach
          } else if (h1 > -80) {
            c1 = color(80, 140, 200);  // Shallow sea
          } else {
            c1 = color(30, 90, 180);   // Deep sea
          }
          break;
          
        case 'terraces':
          if (isOnHill1) {
            // Terraced hills
            if (h1 > 90) {
              c1 = color(160, 200, 100); // Hill top terraces
            } else if (h1 > 60) {
              c1 = color(150, 190, 90);  // Hill upper terraces
            } else {
              c1 = color(140, 180, 80);  // Hill lower terraces
            }
          } else {
            let level = floor((h1 + 100) / 25);
            if (level % 2 === 0) {
              c1 = color(140, 180, 90);  // Terrace
            } else {
              c1 = color(120, 160, 70);  // Terrace alternate color
            }
          }
          break;
          
        case 'canyon':
          if (isOnHill1) {
            // Canyon hills
            if (h1 > 90) {
              c1 = color(210, 180, 130); // Hill top
            } else if (h1 > 60) {
              c1 = color(190, 140, 100); // Hill upper part
            } else {
              c1 = color(170, 120, 80);  // Hill lower part
            }
          } else if (h1 > 100) {
            c1 = color(200, 170, 120); // Cliff top
          } else if (h1 > 0) {
            c1 = color(180, 130, 90);  // Cliff
          } else if (h1 > -100) {
            c1 = color(150, 100, 70);  // Canyon wall
          } else {
            c1 = color(110, 80, 60);   // Canyon bottom
          }
          break;
      }
      
      // Convert color in grayscale mode
      if (fountainChallenge.grayScaleMode) {
        let r = red(c1), g = green(c1), b = blue(c1), a = alpha(c1);
        c1 = toGrayScale(r, g, b, a);
      }
      fill(c1);
      vertex(x * scl, y * scl, h1);

      // Apply same color logic to second vertex
      switch(terrainStyle) {
        case 'mountains':
          if (isOnHill2) {
            // Hill areas use special colors
            if (h2 > 90) {
              c2 = color(220, 200, 180); // Hill top
            } else if (h2 > 60) {
              c2 = color(180, 160, 110); // Hill upper part
            } else {
              c2 = color(140, 170, 90);  // Hill lower part
            }
          } else if (h2 > 100) {
            c2 = color(200, 180, 150);
      } else if (h2 > 50) {
            c2 = color(160, 140, 90);
      } else if (h2 > 0) {
            c2 = color(120, 150, 80);
      } else {
            c2 = color(100, 130, 70);
          }
          break;
          
        case 'desert':
          if (isOnHill2) {
            // Desert hills
            if (h2 > 90) {
              c2 = color(250, 230, 160); // Sand dune top
            } else if (h2 > 60) {
              c2 = color(240, 210, 130); // Sand dune upper part
            } else {
              c2 = color(230, 190, 100); // Sand dune lower part
            }
          } else if (h2 > 50) {
            c2 = color(240, 220, 140);
          } else if (h2 > 0) {
            c2 = color(230, 200, 110);
          } else if (h2 > -30) {
            c2 = color(210, 180, 95);
          } else {
            c2 = color(200, 170, 90);
          }
          break;
          
        case 'islands':
          if (isOnHill2) {
            // Island hills
            if (h2 > 90) {
              c2 = color(140, 200, 80); // Island peak
            } else if (h2 > 60) {
              c2 = color(130, 190, 75); // Island slope
            } else {
              c2 = color(120, 180, 65); // Island lowland
            }
          } else if (h2 > 50) {
            c2 = color(120, 180, 70);
          } else if (h2 > 0) {
            c2 = color(210, 200, 120);
          } else if (h2 > -80) {
            c2 = color(80, 140, 200);
          } else {
            c2 = color(30, 90, 180);
          }
          break;
          
        case 'terraces':
          if (isOnHill2) {
            // Terraced hills
            if (h2 > 90) {
              c2 = color(160, 200, 100); // Hill top terraces
            } else if (h2 > 60) {
              c2 = color(150, 190, 90);  // Hill upper terraces
            } else {
              c2 = color(140, 180, 80);  // Hill lower terraces
            }
          } else {
            let level = floor((h2 + 100) / 25);
            if (level % 2 === 0) {
              c2 = color(140, 180, 90);
            } else {
              c2 = color(120, 160, 70);
            }
          }
          break;
          
        case 'canyon':
          if (isOnHill2) {
            // Canyon hills
            if (h2 > 90) {
              c2 = color(210, 180, 130); // Hill top
            } else if (h2 > 60) {
              c2 = color(190, 140, 100); // Hill upper part
            } else {
              c2 = color(170, 120, 80);  // Hill lower part
            }
          } else if (h2 > 100) {
            c2 = color(200, 170, 120);
          } else if (h2 > 0) {
            c2 = color(180, 130, 90);
          } else if (h2 > -100) {
            c2 = color(150, 100, 70);
          } else {
            c2 = color(110, 80, 60);
          }
          break;
      }
      
      // Convert color in grayscale mode
      if (fountainChallenge.grayScaleMode) {
        let r = red(c2), g = green(c2), b = blue(c2), a = alpha(c2);
        c2 = toGrayScale(r, g, b, a);
      }
      fill(c2);
      vertex(x * scl, (y + 1) * scl, h2);
    }
    endShape();
  }

  // --- Terrain Lines: Only Deep Brown Stripes on Every Row ---
  for (let y = 0; y < rows - 1; y++) {
    let lineCol;
    
    switch(terrainStyle) {
      case 'mountains':
        lineCol = lerpColor(color(90, 60, 15, 240), color(170, 100, 25, 220), y / rows);
        break;
      case 'desert':
        lineCol = lerpColor(color(180, 140, 60, 200), color(220, 190, 100, 180), y / rows);
        break;
      case 'islands':
        if (y < rows / 3) { // Deep water
          lineCol = color(20, 80, 160, 180);
        } else if (y < rows * 2/3) { // Shallow water
          lineCol = color(60, 120, 180, 200);
        } else { // Land
          lineCol = color(100, 160, 60, 220);
        }
        break;
      case 'terraces':
        if (y % 4 === 0) {
          lineCol = color(90, 130, 50, 255); // Highlight terrace edges
        } else {
          lineCol = color(120, 150, 70, 180);
        }
        break;
      case 'canyon':
        lineCol = lerpColor(color(140, 90, 50, 230), color(180, 130, 70, 210), y / rows);
        break;
    }
    
    // Convert line color in grayscale mode
    if (fountainChallenge.grayScaleMode) {
      let r = red(lineCol), g = green(lineCol), b = blue(lineCol), a = alpha(lineCol);
      lineCol = toGrayScale(r, g, b, a);
    }
    stroke(lineCol);
    strokeWeight(3.5);
    noFill();
    beginShape();
    for (let x = 0; x < cols; x++) {
      vertex(x * scl, y * scl, terrain[x][y] + 0.5);
    }
    endShape();
  }

  // --- Render stones ---
  for (let stone of stoneList) {
    if (
      stone.gridX >= 0 && stone.gridX < cols &&
      stone.gridY >= 0 && stone.gridY < rows
    ) {
      let stoneHeight = terrain[stone.gridX][stone.gridY];
      if (stoneHeight > -50 && stoneHeight < 200) { // Expand height range to include stones on hills
        push();
        translate(stone.gridX * scl, stone.gridY * scl, stoneHeight + stone.size / 2);
        // Convert stone color in grayscale mode
        let stoneColor = stone.color;
        if (fountainChallenge.grayScaleMode) {
          let r = red(stoneColor), g = green(stoneColor), b = blue(stoneColor), a = alpha(stoneColor);
          stoneColor = toGrayScale(r, g, b, a);
        }
        fill(stoneColor);
        noStroke();
        sphere(stone.size);
        pop();
      }
    }
  }

  // --- Render grass ---
  for (let i = 0; i < grassList.length * 4; i++) {
    let g = grassList[i % grassList.length];
    if (g.x >= 0 && g.x < cols && g.y >= 0 && g.y < rows) {
      let hval = terrain[g.x][g.y];
      let pz_grass_center = hval + (g.size * 2);
      push();
      translate(g.px + g.offsetX, g.py + g.offsetY, pz_grass_center);
      rotateX(HALF_PI);
      noStroke();
      // Convert grass color in grayscale mode
      let grassColor = g.color;
      if (fountainChallenge.grayScaleMode) {
        let r = red(grassColor), g_val = green(grassColor), b = blue(grassColor), a = alpha(grassColor);
        grassColor = toGrayScale(r, g_val, b, a);
      }
      fill(grassColor);
      ellipsoid(g.size, g.size * 2, g.size);
      pop();
    }
  }

  // --- Render trees ---
  for (let t of treeList) {
    if (t.x >= 0 && t.x < cols && t.y >= 0 && t.y < rows) {
      if (t.shapeType === 'cone') {
        let samples = 12;
        let sumH = 0;
        let count = 0;
        for (let k = 0; k < samples; k++) {
          let theta = (TWO_PI / samples) * k;
          let rx = t.x + (t.treeR / scl) * Math.cos(theta);
          let ry = t.y + (t.treeR / scl) * Math.sin(theta);
          let ix = Math.round(rx);
          let iy = Math.round(ry);
          if (ix >= 0 && ix < cols && iy >= 0 && iy < rows) {
            sumH += terrain[ix][iy];
            count++;
          }
        }
        let avgH_base = count > 0 ? sumH / count : terrain[t.x][t.y];
        push();
        translate(t.px, t.py, avgH_base + t.treeH / 2);
        rotateX(HALF_PI);
        // Convert tree color in grayscale mode
        let treeColor = t.treeColor;
        if (fountainChallenge.grayScaleMode) {
          let r = red(treeColor), g = green(treeColor), b = blue(treeColor), a = alpha(treeColor);
          treeColor = toGrayScale(r, g, b, a);
        }
        fill(treeColor);
        noStroke();
        cone(t.treeR, t.treeH, 6, 1);
        pop();
      } else if (t.shapeType === 'sphere') {
        push();
        translate(t.px, t.py, terrain[t.x][t.y] + t.treeR);
        // Convert tree color in grayscale mode
        let treeColor = t.treeColor;
        if (fountainChallenge.grayScaleMode) {
          let r = red(treeColor), g = green(treeColor), b = blue(treeColor), a = alpha(treeColor);
          treeColor = toGrayScale(r, g, b, a);
        }
        fill(treeColor);
        noStroke();
        sphere(t.treeR);
        pop();
      }
    }
  }

  // --- Render walls and gates ---
  drawWalls();

  // --- Render fence and sheep ---
  console.log(`Render frame: ${frameCount}, fence status: ${fenceArea.isPlaced ? 'placed' : 'not placed'}`);
  if (fenceArea.isPlaced) {
    drawFence();
    drawSheep();
  } else {
    console.warn("Cannot render fence and sheep because fence was not successfully placed");
    // If fence placement failed, try manual placement at fixed position
    if (frameCount === 30) { // Try after waiting a few frames
      console.log("Attempting manual fence placement...");
      fenceArea.centerX = 20;
      fenceArea.centerY = 20;
      fenceArea.baseHeight = terrain[20][20];
      fenceArea.isPlaced = true;
      fenceArea.gatePos = 0; // North gate
      generateFence();
      generateSheep();
    }
  }

  // --- Render boat and shield ---
  drawBoatItem();
  
  // --- Render pumpkin character ---
  drawPumpkinMan();
  
  // Check if pumpkin collected boat - place at end to ensure correct render order
  checkBoatItemCollection();

  // Draw a house at a specific location
  let houseX = 10 * scl;
  let houseY = 10 * scl;
  let houseZ = terrain[10][10] + 10; // Lower height on terrain
  drawSquareHouse(houseX, houseY, houseZ);
  
  // Check house door interaction
  checkHouseDoorInteraction(houseX, houseY, houseZ);

  // Draw the river
  drawRiver();

  // Draw hill markers - add visual indicators on some hill tops
  drawHillMarkers();

  // Draw rabbits, cows and dogs (draw before pop() to ensure same coordinate system)
  updateAndDrawRabbits();
  updateAndDrawCows();
  updateAndDrawDogs();
  
    // --- Render street lamps ---
  drawLamps();
  
  // --- Render fountain ---
  drawFountain();

  // Display current parameters
  push();
  resetMatrix();
  fill(255);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);
  let infoText = `Terrain Style: ${terrainStyle}
Camera Mode: ${followCamera ? 'Follow View' : 'Free View'}
Pumpkin Position: X=${Math.floor(pumpkinMan.gridX)}, Y=${Math.floor(pumpkinMan.gridY)}, Z=${Math.floor(pumpkinMan.height)}
Controls: WASD move pumpkin, C toggle camera mode, T toggle terrain style, S jump, F create fence nearby, L start fountain challenge, E interact with house door
Hill Count: ${hillsList.length}
Sheep Count: ${sheepList.length}
Rabbit Count: ${rabbitList.length}
Cow Count: ${cowList.length}
${followCamera ? `
View Control: Drag mouse to adjust view
Distance Control: Mouse wheel scroll
View Offset: X=${pumpkinViewOffsetX.toFixed(2)}, Y=${pumpkinViewOffsetY.toFixed(2)}
View Distance: ${pumpkinViewDistance.toFixed(0)}` : `
Camera Control: Drag mouse to rotate view, Mouse wheel to zoom
Camera Distance: ${freeCam.distance.toFixed(0)}
Camera Angles: H=${freeCam.angleHorizontal.toFixed(2)}, V=${freeCam.angleVertical.toFixed(2)}`}`;
  text(infoText, -width/2 + 20, -height/2 + 20);
  pop();

  updateEmergencyState();
  drawEmergencyEffects();
  
  // Update fountain challenge status
  updateFountainChallenge();
  
  // Check pumpkin collision with fountain
  checkPumpkinFountainCollision();
  
  // Add floating text effects drawing at the end
  updateAndDrawFloatingTexts();
  

}

// Draw hill markers function
function drawHillMarkers() {
  // Only draw special markers on some hill tops
  for (let hill of hillsList) {
    // Randomly select some hills for marking
    if (random() < 0.5) continue; // Only 50% of hills will be marked
    
    let hillX = hill.x * scl;
    let hillY = hill.y * scl;
    let hillZ = terrain[hill.x][hill.y] + 10; // Slightly above terrain surface
    
    push();
    translate(hillX, hillY, hillZ);
    
    // Randomly select marker style
    let markerStyle = floor(random(3));
    
    if (markerStyle === 0) {
      // Style 1: Crossed wooden sticks
      stroke(100, 70, 40);
      strokeWeight(3);
      line(-15, 0, 0, 15, 0, 40);
      line(15, 0, 0, -15, 0, 40);
      
      // Add a small flag at the top
      push();
      translate(0, 0, 40);
      fill(220, 50, 50);
      noStroke();
      beginShape();
      vertex(0, 0, 0);
      vertex(20, 5, 0);
      vertex(20, -5, 0);
      endShape(CLOSE);
      pop();
    } else if (markerStyle === 1) {
      // Style 2: Stone pillar stack
      for (let i = 0; i < 5; i++) {
        push();
        translate(0, 0, i * 6);
        fill(150 - i * 10, 140 - i * 8, 130 - i * 5);
        noStroke();
        let stoneSize = 10 - i * 1.5;
        sphere(stoneSize);
        pop();
      }
    } else {
      // Style 3: Glowing marker
      noStroke();
      
      // Base
      fill(100, 80, 60);
      cylinder(8, 5, 6, 1);
      
      // Glowing part
      push();
      translate(0, 0, 10);
      fill(255, 220, 100);
      sphere(5);
      
      // Add glow effect
      for (let i = 0; i < 4; i++) {
        push();
        rotateY(i * HALF_PI);
        translate(0, 0, 3);
        fill(255, 220, 100, 150 - i * 30);
        sphere(3 - i * 0.5);
        pop();
  }
  pop();
}

    pop();
  }
}

// Draw fence
function drawFence() {
  if (!fenceArea.isPlaced) {
    console.warn("Attempting to draw fence, but fence not yet placed");
    return;
  }
  
  console.log(`Draw fence, position: (${fenceArea.centerX}, ${fenceArea.centerY}), fence post count: ${fenceArea.posts.length}`);
  
  // Wood colors
  let postColor = color(120, 80, 40); // Dark brown
  let railColor = color(150, 100, 60); // Medium brown
  let gateColor = color(140, 90, 50); // Gate color
  
  // Mongolian pattern colors
  let patternColor1 = color(200, 50, 50); // Red
  let patternColor2 = color(50, 100, 200); // Blue
  let patternColor3 = color(255, 200, 50); // Gold
  
  // Draw fence posts with Mongolian decorations
  for (let postIndex = 0; postIndex < fenceArea.posts.length; postIndex++) {
    let post = fenceArea.posts[postIndex];
    push();
    let terrainHeight = terrain[Math.floor(post.x)][Math.floor(post.y)];
    translate(post.x * scl, post.y * scl, terrainHeight + post.height/2);
    noStroke();
    fill(postColor);
    cylinder(scl * 0.25, post.height, 8, 1);
    
    // Add Mongolian symbols on fence posts
    push();
    translate(0, scl * 0.3, post.height/4); // Position on post surface
    rotateY(PI/2); // Face outward
    
    // Choose symbol based on post index
    let symbolType = postIndex % 4;
    
    if (symbolType === 0) {
      // Eternal knot symbol
      stroke(patternColor1);
      strokeWeight(0.5);
      noFill();
      
      // Draw interlaced pattern
      beginShape();
      for (let angle = 0; angle < TWO_PI * 2; angle += 0.2) {
        let x = 3 * cos(angle) + 1.5 * cos(angle * 3);
        let y = 3 * sin(angle) + 1.5 * sin(angle * 3);
        vertex(x, y);
      }
      endShape();
    } else if (symbolType === 1) {
      // Lotus pattern
      fill(patternColor2);
      noStroke();
      
      // Draw lotus petals
      for (let i = 0; i < 8; i++) {
        push();
        rotateZ(i * PI/4);
        translate(0, 2, 0);
        ellipse(0, 0, 2, 4);
        pop();
      }
      
      // Center circle
      fill(patternColor3);
      circle(0, 0, 2);
    } else if (symbolType === 2) {
      // Mongolian script-inspired pattern
      stroke(patternColor3);
      strokeWeight(1);
      noFill();
      
      // Vertical flowing lines reminiscent of Mongolian script
      for (let i = 0; i < 3; i++) {
        let x = (i - 1) * 2;
        beginShape();
        noFill();
        for (let t = 0; t <= 1; t += 0.1) {
          let y = map(t, 0, 1, -4, 4);
          let curve = x + sin(t * PI * 2) * 0.5;
          vertex(curve, y);
        }
        endShape();
      }
    } else {
      // Dragon scale pattern
      fill(patternColor1);
      stroke(patternColor3);
      strokeWeight(0.3);
      
      // Draw overlapping scales
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          let x = (col - 1) * 2;
          let y = (row - 1) * 2.5;
          
          // Offset alternate rows
          if (row % 2 === 1) x += 1;
          
          push();
          translate(x, y, 0);
          arc(0, 0, 2, 3, 0, PI);
          pop();
        }
      }
    }
    pop();
    
    // Decorative post top
    translate(0, 0, post.height/2 + 2);
    fill(color(100, 60, 30));
    cylinder(scl * 0.3, 4, 8, 1);
    
    // Add small ornament on top
    translate(0, 0, 3);
    fill(patternColor3);
    sphere(scl * 0.15);
    
    pop();
  }
  
  // Draw rails with Mongolian decorative patterns
  for (let i = 0; i < fenceArea.rails.length; i++) {
    let rail = fenceArea.rails[i];
    push();
    
    // Get terrain height of two posts
    let terrainHeight1 = terrain[Math.floor(rail.x1)][Math.floor(rail.y1)];
    let terrainHeight2 = terrain[Math.floor(rail.x2)][Math.floor(rail.y2)];
    
    // Calculate rail midpoint and length
    let midX = (rail.x1 + rail.x2) / 2;
    let midY = (rail.y1 + rail.y2) / 2;
    let midHeight = (terrainHeight1 + terrainHeight2) / 2;
    let railLength = dist(rail.x1, rail.y1, rail.x2, rail.y2) * scl;
    
    // Calculate rail rotation angle
    let angle = atan2(rail.y2 - rail.y1, rail.x2 - rail.x1);
    
    translate(midX * scl, midY * scl, midHeight + rail.height);
    rotateZ(angle);
    
    // Draw main rail
    fill(railColor);
    noStroke();
    
    // Use flattened box as rail
    push();
    rotateY(HALF_PI);
    box(railLength, scl * 0.15, scl * 0.3); // Length, width, height
    pop();
    
    // Add Mongolian decorative patterns on the rail
    let patternCount = Math.floor(railLength / (scl * 2)); // One pattern every 2 units
    for (let j = 0; j < patternCount; j++) {
      let patternX = -railLength/2 + (j + 0.5) * (railLength / patternCount);
      
      push();
      translate(0, scl * 0.1, 0); // Slightly forward from rail surface
      rotateY(HALF_PI);
      translate(patternX, 0, 0);
      
      // Choose pattern based on rail index for variety
      let patternType = i % 3;
      
      if (patternType === 0) {
        // Traditional cloud pattern
        fill(patternColor1);
        noStroke();
        for (let k = 0; k < 3; k++) {
          push();
          translate(k * 3 - 3, 0, 0);
          ellipse(0, 0, 2, 1);
          pop();
        }
      } else if (patternType === 1) {
        // Diamond pattern
        fill(patternColor2);
        noStroke();
        push();
        rotateZ(PI/4);
        rect(0, 0, 3, 3);
        pop();
        
        // Inner small diamond
        fill(patternColor3);
        push();
        rotateZ(PI/4);
        rect(0, 0, 1.5, 1.5);
        pop();
      } else {
        // Traditional knot pattern
        stroke(patternColor3);
        strokeWeight(0.8);
        noFill();
        
        // Outer square
        rect(0, 0, 4, 4);
        // Inner lines
        line(-1, -2, -1, 2);
        line(1, -2, 1, 2);
        line(-2, -1, 2, -1);
        line(-2, 1, 2, 1);
      }
      
      pop();
    }
    
    pop();
  }
  
  // Draw gate
  if (fenceArea.gatePosts) {
    // Draw gate posts with special Mongolian decorations
    for (let gatePostIndex = 0; gatePostIndex < fenceArea.gatePosts.length; gatePostIndex++) {
      let post = fenceArea.gatePosts[gatePostIndex];
      push();
      let terrainHeight = terrain[Math.floor(post.x)][Math.floor(post.y)];
      translate(post.x * scl, post.y * scl, terrainHeight + post.height/2);
      noStroke();
      fill(color(100, 60, 30)); // Gate post color darker
      cylinder(scl * 0.35, post.height, 8, 1);
      
      // Special gate post decorations
      push();
      translate(0, scl * 0.4, 0); // Position on post surface
      rotateY(PI/2); // Face outward
      
      // Special Mongolian gate symbols
      if (gatePostIndex === 0) {
        // Left gate post - Guardian lion pattern
        fill(patternColor1);
        stroke(patternColor3);
        strokeWeight(0.5);
        
        // Lion head outline
        circle(0, 2, 4);
        // Mane
        for (let i = 0; i < 8; i++) {
          push();
          rotateZ(i * PI/4);
          translate(0, 3, 0);
          ellipse(0, 0, 1, 2);
          pop();
        }
        // Eyes
        fill(patternColor3);
        circle(-1, 2.5, 0.5);
        circle(1, 2.5, 0.5);
        
        // Body pattern
        stroke(patternColor2);
        noFill();
        rect(0, -2, 3, 3);
        
      } else {
        // Right gate post - Dragon pattern
        stroke(patternColor2);
        strokeWeight(0.8);
        noFill();
        
        // Dragon body curve
        beginShape();
        for (let t = 0; t <= 1; t += 0.05) {
          let x = map(t, 0, 1, -3, 3);
          let y = map(t, 0, 1, -4, 4) + sin(t * PI * 4) * 1.5;
          vertex(x, y);
        }
        endShape();
        
        // Dragon head
        fill(patternColor1);
        stroke(patternColor3);
        strokeWeight(0.3);
        circle(3, 4, 2);
        
        // Dragon claws
        fill(patternColor3);
        for (let i = 0; i < 3; i++) {
          let x = map(i, 0, 2, -2, 2);
          circle(x, -4, 0.8);
        }
      }
      pop();
      
      // Decorative post top
      translate(0, 0, post.height/2 + 3);
      fill(color(80, 50, 20));
      cylinder(scl * 0.4, 6, 8, 1); // Taller gate post top
      
      // Special gate post finial
      translate(0, 0, 4);
      fill(patternColor3);
      // Traditional Mongolian finial shape
      cone(scl * 0.25, 8, 8, 1);
      translate(0, 0, 6);
      fill(patternColor1);
      sphere(scl * 0.2);
      
      pop();
    }
    
    // Draw gate beam
    if (fenceArea.gateBeam) {
      push();
      
      let beam = fenceArea.gateBeam;
      let terrainHeight1 = terrain[Math.floor(beam.x1)][Math.floor(beam.y1)];
      let terrainHeight2 = terrain[Math.floor(beam.x2)][Math.floor(beam.y2)];
      
      let midX = (beam.x1 + beam.x2) / 2;
      let midY = (beam.y1 + beam.y2) / 2;
      let midHeight = (terrainHeight1 + terrainHeight2) / 2;
      let beamLength = dist(beam.x1, beam.y1, beam.x2, beam.y2) * scl;
      
      let angle = atan2(beam.y2 - beam.y1, beam.x2 - beam.x1);
      
      translate(midX * scl, midY * scl, midHeight + beam.height);
      rotateZ(angle);
      
      fill(color(100, 60, 30));
      noStroke();
      
      push();
      rotateY(HALF_PI);
      box(beamLength, scl * 0.2, scl * 0.4); // Thickened beam
      pop();
      
      pop();
    }
    
    // Draw gate planks
    for (let plank of fenceArea.gatePlanks) {
      push();
      let terrainHeight = terrain[Math.floor(plank.x)][Math.floor(plank.y)];
      translate(plank.x * scl, plank.y * scl, terrainHeight + plank.height/2);
      
      // Rotate according to gate direction
      rotateZ(plank.rotation);
      
      // Draw each gate plank
      fill(gateColor);
      noStroke();
      box(plank.width * scl, scl * 0.2, plank.height);
      
      // Decorative nails
      fill(60, 60, 60);
      for (let j = -1; j <= 1; j += 2) {
        push();
        translate(0, 0, j * plank.height * 0.3);
        sphere(scl * 0.1);
        pop();
      }
      
      pop();
    }
  }
}

// Update sheep status
function updateSheep() {
  // If all objects are frozen, stop updating
  if (fountainChallenge.allObjectsFrozen) return;
  
  if (sheepList.length === 0) {
    console.warn("Attempting to update sheep, but sheep count is 0");
    return;
  }
  
  // Occasionally output sheep status (every 100 frames)
  if (frameCount % 100 === 0) {
    console.log(`Update sheep status, current sheep count: ${sheepList.length}`);
  }
  
  for (let sheep of sheepList) {
    // Update timer
    sheep.moveTimer--;
    
    // Execute different behaviors based on sheep state
    if (sheep.state === 'idle') {
      // Idle state: occasionally decide to move
      if (sheep.moveTimer <= 0) {
        // Decide whether to move or continue idling
        if (random() < 0.7) {
          // Switch to walking state
          sheep.state = 'walking';
          
          // Occasionally play sheep sound when starting to move
          if (random() < 0.3 && typeof playAnimalSound === 'function') {
            playAnimalSound('sheep', 'baa', sheepList.indexOf(sheep));
          }
          
          // Select new target position within fence area
          let left = fenceArea.centerX - fenceArea.width / 2 + 3;
          let right = fenceArea.centerX + fenceArea.width / 2 - 3;
          let top = fenceArea.centerY - fenceArea.height / 2 + 3;
          let bottom = fenceArea.centerY + fenceArea.height / 2 - 3;
          
          sheep.targetX = random(left, right);
          sheep.targetY = random(top, bottom);
          
          // Face target direction
          sheep.rotation = atan2(sheep.targetY - sheep.y, sheep.targetX - sheep.x);
          
          // Set movement time
          sheep.moveTimer = random(50, 150);
        } else {
          // Continue idling, random turn
          sheep.rotation = random(TWO_PI);
          sheep.moveTimer = random(100, 200);
          
          // Occasionally bleat when idle
          if (random() < 0.1 && typeof playAnimalSound === 'function') {
            playAnimalSound('sheep', 'bleat', sheepList.indexOf(sheep));
          }
        }
      }
    } else if (sheep.state === 'walking') {
      // Walking state: move toward target
      let dx = sheep.targetX - sheep.x;
      let dy = sheep.targetY - sheep.y;
      let distance = sqrt(dx*dx + dy*dy);
      
      if (distance > 0.1 && sheep.moveTimer > 0) {
        // Continue moving
        sheep.x += dx * sheep.walkSpeed;
        sheep.y += dy * sheep.walkSpeed;
      } else {
        // Reached target or time up, enter idle state
        sheep.state = 'idle';
        sheep.moveTimer = random(150, 250);
      }
    }
  }
}

// Draw sheep
function drawSheep() {
  for (let sheep of sheepList) {
    push();
    
    // Calculate sheep height on terrain
    let terrainHeight = terrain[Math.floor(sheep.x)][Math.floor(sheep.y)];
    
    // Place sheep on terrain
    translate(sheep.x * scl, sheep.y * scl, terrainHeight + 7);
    
    // Rotate according to sheep movement direction
    rotateZ(sheep.rotation);
    
    // Draw sheep legs - four thin black legs
    fill(sheep.legColor);
    noStroke();
    
    // Set leg animation based on sheep state
    let legAngle = 0;
    if (sheep.state === 'walking') {
      // Leg swinging when walking
      legAngle = sin(frameCount * 0.2) * 0.3;
    }
    
    // Front legs
    push();
    translate(sheep.size * 0.4, -sheep.size * 0.3, -sheep.size * 0.8);
    rotateX(HALF_PI + legAngle); // Add walking swing
    cylinder(sheep.size * 0.1, sheep.size * 1.6, 4, 1);
    pop();
    
    push();
    translate(sheep.size * 0.4, sheep.size * 0.3, -sheep.size * 0.8);
    rotateX(HALF_PI - legAngle); // Opposite direction swing
    cylinder(sheep.size * 0.1, sheep.size * 1.6, 4, 1);
    pop();
    
    // Back legs
    push();
    translate(-sheep.size * 0.4, -sheep.size * 0.3, -sheep.size * 0.8);
    rotateX(HALF_PI - legAngle); // Opposite direction to front legs
    cylinder(sheep.size * 0.1, sheep.size * 1.6, 4, 1);
    pop();
    
    push();
    translate(-sheep.size * 0.4, sheep.size * 0.3, -sheep.size * 0.8);
    rotateX(HALF_PI + legAngle); // Opposite direction to front legs
    cylinder(sheep.size * 0.1, sheep.size * 1.6, 4, 1);
    pop();
    
    // Draw sheep body (main part)
    fill(sheep.bodyColor);
    ellipsoid(sheep.size * 0.8, sheep.size * 0.5, sheep.size * 0.6);
    
    // Add fluffy wool effect
    for (let offset of sheep.woolOffset) {
      push();
      translate(
        sheep.size * 0.5 * offset.x, 
        sheep.size * 0.3 * offset.y, 
        sheep.size * 0.4 * offset.z
      );
      fill(250, 250, 250, 220);
      noStroke();
      sphere(sheep.size * 0.4 * offset.size);
      pop();
    }
    
    // Draw sheep head
    push();
    translate(sheep.size * 0.7, 0, sheep.size * 0.2);
    
    // Head
    fill(sheep.headColor);
    sphere(sheep.size * 0.3);
    
    // Eyes
    fill(30, 30, 30);
    push();
    translate(sheep.size * 0.15, -sheep.size * 0.15, sheep.size * 0.15);
    sphere(sheep.size * 0.08);
    pop();
    
    push();
    translate(sheep.size * 0.15, sheep.size * 0.15, sheep.size * 0.15);
    sphere(sheep.size * 0.08);
    pop();
    
    // Ears
    fill(180, 180, 180);
    push();
    translate(0, -sheep.size * 0.15, sheep.size * 0.15);
    rotateZ(-PI/4);
    rotateX(PI/4);
    ellipsoid(sheep.size * 0.1, sheep.size * 0.05, sheep.size * 0.15);
    pop();
    
    push();
    translate(0, sheep.size * 0.15, sheep.size * 0.15);
    rotateZ(PI/4);
    rotateX(PI/4);
    ellipsoid(sheep.size * 0.1, sheep.size * 0.05, sheep.size * 0.15);
    pop();
    
    // Mouth
    fill(100, 100, 100);
    push();
    translate(sheep.size * 0.25, 0, 0);
    rotateY(HALF_PI);
    cylinder(sheep.size * 0.1, sheep.size * 0.1, 6, 1);
    pop();
    
    pop(); // End head drawing
    
    pop(); // End entire sheep drawing
  }
}

// Handle pumpkin character movement
function handlePumpkinMovement() {
  // If all objects are frozen, stop movement
  if (fountainChallenge.allObjectsFrozen) return;
  
  let moveSpeed = 0; // Movement speed
  let turnSpeed = 0.1; // Turn speed
  
  // Declare all bridge-related variables in advance to avoid reference errors
  let onFirstBridge = false;
  let atFirstBridgeEdge = false;
  let onSecondBridge = false;
  let atSecondBridgeEdge = false;
  let onBridge = false;
  let tryingToLeaveStep = false;
  let onNorthStep = false;
  let onSouthStep = false;
  let onBridge2NorthStep = false;
  let onBridge2SouthStep = false;
  let attemptingToStepOnBridge2North = false;
  let attemptingToStepOnBridge2South = false;
  
  // Handle jumping
  if (pumpkinMan.isJumping) {
    // Update jump phase
    pumpkinMan.jumpPhase += pumpkinMan.jumpSpeed;
    
    // Calculate jump height (using sine function for more natural jumping)
    pumpkinMan.jumpHeight = sin(pumpkinMan.jumpPhase * PI) * pumpkinMan.maxJumpHeight;
    
    // Check if jump is complete
    if (pumpkinMan.jumpPhase >= 1) {
      pumpkinMan.isJumping = false;
      pumpkinMan.jumpHeight = 0;
      pumpkinMan.jumpPhase = 0;
      
      // Update height after jump ends, ensuring standing on correct surface
      updatePumpkinHeight();
    }
  }
  
  // Get movement input
  if (keyIsDown(87)) { // W key - move forward
    moveSpeed = pumpkinMan.moveSpeed; // Set forward speed
  }
  
  // Handle turning - discrete 90-degree turns
  // Detect if A key (clockwise turn, turn right) was just pressed
  if (keyIsDown(65) && !leftKeyPressed) {
    leftKeyPressed = true;
    // Set target angle for 90-degree clockwise turn
    targetRotation = pumpkinMan.rotationY + HALF_PI;
    isRotating = true;
  }
  // Detect if A key has been released
  if (!keyIsDown(65) && leftKeyPressed) {
    leftKeyPressed = false;
  }
  
  // Detect if D key (counterclockwise turn, turn left) was just pressed
  if (keyIsDown(68) && !rightKeyPressed) {
    rightKeyPressed = true;
    // Set target angle for 90-degree counterclockwise turn
    targetRotation = pumpkinMan.rotationY - HALF_PI;
    isRotating = true;
  }
  // Detect if D key has been released
  if (!keyIsDown(68) && rightKeyPressed) {
    rightKeyPressed = false;
  }
  
  // If rotating, smoothly turn toward target angle
  if (isRotating) {
    // Calculate difference between current angle and target angle
    let angleDiff = targetRotation - pumpkinMan.rotationY;
    
    // Normalize angle difference to between -PI and PI
    while (angleDiff > PI) angleDiff -= TWO_PI;
    while (angleDiff < -PI) angleDiff += TWO_PI;
    
    // If angle difference is small, complete the rotation
    if (abs(angleDiff) < 0.05) {
      pumpkinMan.rotationY = targetRotation;
      isRotating = false;
    } else {
      // Otherwise continue smooth rotation
      pumpkinMan.rotationY += angleDiff * turnSpeed;
    }
  }
  
  // Ensure angle stays within -PI to PI range
  while (pumpkinMan.rotationY > PI) pumpkinMan.rotationY -= TWO_PI;
  while (pumpkinMan.rotationY < -PI) pumpkinMan.rotationY += TWO_PI;
  
  // Only calculate new position when there's movement input
  if (moveSpeed !== 0) {
    // Calculate movement direction based on current facing
    let moveX = sin(pumpkinMan.rotationY) * moveSpeed;
    let moveY = cos(pumpkinMan.rotationY) * moveSpeed;
    
    // Calculate new position
    let newX = pumpkinMan.gridX + moveX;
    let newY = pumpkinMan.gridY + moveY;

    // Save original position for collision recovery
    let oldX = pumpkinMan.gridX;
    let oldY = pumpkinMan.gridY;
    
    // Flag for collision detection
    let hasCollision = false;
    
    // Wall collision detection
    for (let wall of walls) {
      if (wall.startX === wall.endX) { // Vertical wall (east-west wall)
        // Check if near wall's X coordinate - increase detection range
        if (abs(newX - wall.startX) < 1.2) {
          // Check if within wall's Y range
          if (newY >= min(wall.startY, wall.endY)) {
            // Check if within door range
            if (!(newY >= wall.doorStartY && newY <= wall.doorEndY)) {
              // Not a door, prevent movement
              hasCollision = true;
              if (moveX > 0 && pumpkinMan.gridX < wall.startX) {
                newX = wall.startX - 1.2; // Hit wall moving left to right
              } else if (moveX < 0 && pumpkinMan.gridX > wall.startX) {
                newX = wall.startX + 1.2; // Hit wall moving right to left
              }
            }
          }
        }
      } else { // Horizontal wall (north-south wall)
        // Check if near wall's Y coordinate - increase detection range
        if (abs(newY - wall.startY) < 1.2) {
          // Check if within wall's X range
          if (newX >= min(wall.startX, wall.endX)) {
            // Check if within door range
            if (!(newX >= wall.doorStartX && newX <= wall.doorEndX)) {
              // Not a door, prevent movement
              hasCollision = true;
              if (moveY > 0 && pumpkinMan.gridY < wall.startY) {
                newY = wall.startY - 1.2; // Hit wall moving top to bottom
              } else if (moveY < 0 && pumpkinMan.gridY > wall.startY) {
                newY = wall.startY + 1.2; // Hit wall moving bottom to top
              }
            }
          }
        }
      }
    }
    
    // Fence collision detection
    if (fenceArea.isPlaced) {
      // Calculate fence boundaries
      let fenceLeft = fenceArea.centerX - fenceArea.width / 2;
      let fenceRight = fenceArea.centerX + fenceArea.width / 2;
      let fenceTop = fenceArea.centerY - fenceArea.height / 2;
      let fenceBottom = fenceArea.centerY + fenceArea.height / 2;
      
      // Check if at fence edge
      let atFenceEdge = false;
      let edgeDirection = '';
      
      // Check if at fence north side (top)
      if (abs(newY - fenceTop) < 1.2 && newX >= fenceLeft && newX <= fenceRight) {
        // If not at gate position
        if (!(fenceArea.gatePos === 0 && 
              newX >= fenceArea.gate.startX && 
              newX <= fenceArea.gate.endX)) {
          atFenceEdge = true;
          edgeDirection = 'north';
        }
      }
      
      // Check if at fence south side (bottom)
      if (abs(newY - fenceBottom) < 1.2 && newX >= fenceLeft && newX <= fenceRight) {
        // If not at gate position
        if (!(fenceArea.gatePos === 2 && 
              newX >= fenceArea.gate.startX && 
              newX <= fenceArea.gate.endX)) {
          atFenceEdge = true;
          edgeDirection = 'south';
        }
      }
      
      // Check if at fence west side (left)
      if (abs(newX - fenceLeft) < 1.2 && newY >= fenceTop && newY <= fenceBottom) {
        // If not at gate position
        if (!(fenceArea.gatePos === 3 && 
              newY >= fenceArea.gate.startY && 
              newY <= fenceArea.gate.endY)) {
          atFenceEdge = true;
          edgeDirection = 'west';
        }
      }
      
      // Check if at fence east side (right)
      if (abs(newX - fenceRight) < 1.2 && newY >= fenceTop && newY <= fenceBottom) {
        // If not at gate position
        if (!(fenceArea.gatePos === 1 && 
              newY >= fenceArea.gate.startY && 
              newY <= fenceArea.gate.endY)) {
          atFenceEdge = true;
          edgeDirection = 'east';
        }
      }
      
      // If at fence edge, adjust position based on direction
      if (atFenceEdge) {
        hasCollision = true;
        
        switch(edgeDirection) {
          case 'north':
            // Collision from outside to inside, push pumpkin man outside fence
            if (oldY < fenceTop) {
              newY = fenceTop - 1.2;
            } 
            // Collision from inside to outside, push pumpkin man back inside fence
            else {
              newY = fenceTop + 1.2;
            }
          break;
            
          case 'south':
            if (oldY > fenceBottom) {
              newY = fenceBottom + 1.2;
            } else {
              newY = fenceBottom - 1.2;
            }
            break;
            
          case 'west':
            if (oldX < fenceLeft) {
              newX = fenceLeft - 1.2;
            } else {
              newX = fenceLeft + 1.2;
            }
            break;
            
          case 'east':
            if (oldX > fenceRight) {
              newX = fenceRight + 1.2;
            } else {
              newX = fenceRight - 1.2;
            }
            break;
        }
      }
      
      // Sheep collision detection
      for (let sheep of sheepList) {
        // Calculate distance between pumpkin and sheep
        let distToSheep = dist(newX, newY, sheep.x, sheep.y);
        let minDist = 2.5; // Minimum distance between pumpkin and sheep
        
        if (distToSheep < minDist) {
          hasCollision = true;
          
          // Calculate direction vector from sheep to pumpkin, and push pumpkin away
          let awayVectorX = newX - sheep.x;
          let awayVectorY = newY - sheep.y;
          
          // Normalize vector
          let vectorLength = sqrt(awayVectorX * awayVectorX + awayVectorY * awayVectorY);
          if (vectorLength > 0) {
            awayVectorX /= vectorLength;
            awayVectorY /= vectorLength;
            
            // Push pumpkin to safe distance from sheep
            newX = sheep.x + awayVectorX * (minDist + 0.5);
            newY = sheep.y + awayVectorY * (minDist + 0.5);
            
            // Make sheep startled and move randomly
            sheep.state = 'walking';
            sheep.targetX = sheep.x + random(-3, 3);
            sheep.targetY = sheep.y + random(-3, 3);
            sheep.moveTimer = random(30, 60);
            sheep.rotation = atan2(sheep.targetY - sheep.y, sheep.targetX - sheep.x);
          }
        }
      }
    }
    
    // Handle bridge step collision detection
    let onNorthStep = false;
    let onSouthStep = false;
    let attemptingToStepOnNorth = false; // Flag for attempting to step on north step
    let attemptingToStepOnSouth = false; // Flag for attempting to step on south step
    let tryingToLeaveStep = false;
    
    // Check if currently on north bridge step
    if (pumpkinMan.onStep === "north") {
      onNorthStep = true;
      
      // Check if trying to leave step
      let edgeDistanceX = abs(newX - bridge.northStepX) - bridge.northStepWidth / 2;
      let edgeDistanceY = abs(newY - bridge.northStepY) - bridge.northStepDepth / 2;
      
      // If trying to fall off step from the side
      if (edgeDistanceX > 0 && edgeDistanceY <= 0) {
        // Only restrict when trying to move toward bridge direction
        // If stepping down from side, allow free movement
        if (newY > pumpkinMan.gridY && abs(newX - bridge.northStepX) <= bridge.northStepWidth / 2) {
          // This is movement toward bridge direction, ensure can reach bridge surface
        } else {
          // If trying to step down from other direction, record but don't prevent
          tryingToLeaveStep = true;
          // No longer prevent movement, allow free stepping down
        }
      }
      
      // If trying to fall off step from front or back
      if (edgeDistanceY > 0 && edgeDistanceX <= 0) {
        // Only need to stay on bridge when trying to move toward bridge direction
        if (newY > pumpkinMan.gridY && abs(newX - bridge.northStepX) <= bridge.northStepWidth / 2) {
          // This is movement toward bridge direction, ensure can reach bridge surface
        } else {
          // If trying to step down from north side, record but don't prevent
          tryingToLeaveStep = true;
          // No longer prevent movement, allow free stepping down
        }
      }
    }
    // Check if currently on south bridge step
    else if (pumpkinMan.onStep === "south") {
      onSouthStep = true;
      
      // Check if trying to leave step
      let edgeDistanceX = abs(newX - bridge.southStepX) - bridge.southStepWidth / 2;
      let edgeDistanceY = abs(newY - bridge.southStepY) - bridge.southStepDepth / 2;
      
      // If trying to fall off step from the side
      if (edgeDistanceX > 0 && edgeDistanceY <= 0) {
        // Only restrict when trying to move toward bridge direction
        // If stepping down from side, allow free movement
        if (newY < pumpkinMan.gridY && abs(newX - bridge.southStepX) <= bridge.southStepWidth / 2) {
          // This is movement toward bridge direction, ensure can reach bridge surface
        } else {
          // If trying to step down from other direction, record but don't prevent
          tryingToLeaveStep = true;
          // No longer prevent movement, allow free stepping down
        }
      }
      
      // If trying to fall off step from front or back
      if (edgeDistanceY > 0 && edgeDistanceX <= 0) {
        // Only need to stay on bridge when trying to move toward bridge direction
        if (newY < pumpkinMan.gridY && abs(newX - bridge.southStepX) <= bridge.southStepWidth / 2) {
          // This is movement toward bridge direction, ensure can reach bridge surface
        } else {
          // If trying to step down from south side, record but don't prevent
          tryingToLeaveStep = true;
          // No longer prevent movement, allow free stepping down
        }
      }
    }
    // If currently not on any step, check if trying to step up
    else {
      // Check if trying to step up to north step
      if (bridge.northStepX && bridge.northStepY) {
        // Calculate distance to north step
        let stepDistanceX = abs(newX - bridge.northStepX) - bridge.northStepWidth / 2;
        let stepDistanceY = abs(newY - bridge.northStepY) - bridge.northStepDepth / 2;
        
        // If new position is on the step
        if (stepDistanceX <= 0 && stepDistanceY <= 0) {
          // If was not on step before, and is trying to move onto step
          if (!(abs(oldX - bridge.northStepX) <= bridge.northStepWidth / 2 &&
                abs(oldY - bridge.northStepY) <= bridge.northStepDepth / 2)) {
            attemptingToStepOnNorth = true;
            
            // Try to step up, check if jumping
            let heightDifference = bridge.northStepRealHeight - pumpkinMan.height;
            
            if (heightDifference > 15 && !pumpkinMan.isJumping) {
              // Too high, need to jump to get up
              hasCollision = true;
              // Block movement
              newX = oldX;
              newY = oldY;
              console.log("Need to jump to get on north step! Height difference: " + heightDifference);
            } else if (pumpkinMan.isJumping && pumpkinMan.jumpHeight > 10) {
              // Jump height is sufficient, allow stepping up
              console.log("Successfully jumped on north step!");
              // Ensure pumpkin man lands on top of step rather than inside
              // Let updatePumpkinHeight handle height in next frame
            }
          }
        }
      }
      
      // Check if trying to step up to south step
      if (bridge.southStepX && bridge.southStepY) {
        // Calculate distance to south step
        let stepDistanceX = abs(newX - bridge.southStepX) - bridge.southStepWidth / 2;
        let stepDistanceY = abs(newY - bridge.southStepY) - bridge.southStepDepth / 2;
        
        // If new position is on the step
        if (stepDistanceX <= 0 && stepDistanceY <= 0) {
          // If was not on step before, and is trying to move onto step
          if (!(abs(oldX - bridge.southStepX) <= bridge.southStepWidth / 2 &&
                abs(oldY - bridge.southStepY) <= bridge.southStepDepth / 2)) {
            attemptingToStepOnSouth = true;
            
            // Try to step up, check if jumping
            let heightDifference = bridge.southStepRealHeight - pumpkinMan.height;
            
            if (heightDifference > 15 && !pumpkinMan.isJumping) {
              // Too high, need to jump to get up
              hasCollision = true;
              // Block movement
              newX = oldX;
              newY = oldY;
              console.log("Need to jump to get on south step! Height difference: " + heightDifference);
            } else if (pumpkinMan.isJumping && pumpkinMan.jumpHeight > 10) {
              // Jump height is sufficient, allow stepping up
              console.log("Successfully jumped on south step!");
              // Ensure pumpkin man lands on top of step rather than inside
              // Let updatePumpkinHeight handle height in next frame
            }
          }
        }
      }
      
      // Second bridge step detection
      
      // Check if currently on second bridge north step
      if (pumpkinMan.onStep === "bridge2_north") {
        onBridge2NorthStep = true;
        
        // Check if trying to leave step
        let edgeDistanceX = abs(newX - bridge2.northStepX) - bridge2.northStepWidth / 2;
        let edgeDistanceY = abs(newY - bridge2.northStepY) - bridge2.northStepDepth / 2;
        
        // If trying to fall off step from the side
        if (edgeDistanceX > 0 && edgeDistanceY <= 0) {
          // Only restrict when trying to move toward bridge
          // If stepping down from side, allow free movement
          if (newY > pumpkinMan.gridY && abs(newX - bridge2.northStepX) <= bridge2.northStepWidth / 2) {
            // This is moving toward bridge direction, ensure can reach bridge surface
          } else {
            // If trying to step down from other directions, log but don't block
            tryingToLeaveStep = true;
            // No longer block movement, allow free stepping down
          }
        }
        
        // If trying to fall off step from front/back
        if (edgeDistanceY > 0 && edgeDistanceX <= 0) {
          // Only need to stay on bridge when trying to move toward bridge
          if (newY > pumpkinMan.gridY && abs(newX - bridge2.northStepX) <= bridge2.northStepWidth / 2) {
            // This is moving toward bridge direction, ensure can reach bridge surface
          } else {
            // If trying to step down from north side, log but don't block
            tryingToLeaveStep = true;
            // No longer block movement, allow free stepping down
          }
        }
      }
      // Check if currently on second bridge south step
      else if (pumpkinMan.onStep === "bridge2_south") {
        onBridge2SouthStep = true;
        
        // Check if trying to leave step
        let edgeDistanceX = abs(newX - bridge2.southStepX) - bridge2.southStepWidth / 2;
        let edgeDistanceY = abs(newY - bridge2.southStepY) - bridge2.southStepDepth / 2;
        
        // If trying to fall off step from the side
        if (edgeDistanceX > 0 && edgeDistanceY <= 0) {
          // Only restrict when trying to move toward bridge
          // If stepping down from side, allow free movement
          if (newY < pumpkinMan.gridY && abs(newX - bridge2.southStepX) <= bridge2.southStepWidth / 2) {
            // This is moving toward bridge direction, ensure can reach bridge surface
          } else {
            // If trying to step down from other directions, log but don't block
            tryingToLeaveStep = true;
            // No longer block movement, allow free stepping down
          }
        }
        
        // If trying to fall off step from front/back
        if (edgeDistanceY > 0 && edgeDistanceX <= 0) {
          // Only need to stay on bridge when trying to move toward bridge
          if (newY < pumpkinMan.gridY && abs(newX - bridge2.southStepX) <= bridge2.southStepWidth / 2) {
            // This is moving toward bridge direction, ensure can reach bridge surface
          } else {
            // If trying to step down from south side, log but don't block
            tryingToLeaveStep = true;
            // No longer block movement, allow free stepping down
          }
        }
      }
      // If currently not on any step, check if trying to step up to second bridge steps
      else {
        // Check if trying to step up to second bridge north step
        if (bridge2.northStepX && bridge2.northStepY) {
          // Calculate distance to north step
          let stepDistanceX = abs(newX - bridge2.northStepX) - bridge2.northStepWidth / 2;
          let stepDistanceY = abs(newY - bridge2.northStepY) - bridge2.northStepDepth / 2;
          
          // If new position is on the step
          if (stepDistanceX <= 0 && stepDistanceY <= 0) {
            // If was not on step before, and is trying to move onto step
            if (!(abs(oldX - bridge2.northStepX) <= bridge2.northStepWidth / 2 &&
                  abs(oldY - bridge2.northStepY) <= bridge2.northStepDepth / 2)) {
              attemptingToStepOnBridge2North = true;
              
              // Try to step up, check if jumping
              let heightDifference = bridge2.northStepRealHeight - pumpkinMan.height;
              
              if (heightDifference > 15 && !pumpkinMan.isJumping) {
                // Too high, need to jump to get up
                hasCollision = true;
                // Block movement
                newX = oldX;
                newY = oldY;
                console.log("Need to jump to get on second bridge north step! Height difference: " + heightDifference);
              } else if (pumpkinMan.isJumping && pumpkinMan.jumpHeight > 10) {
                // Jump height is sufficient, allow stepping up
                console.log("Successfully jumped on second bridge north step!");
                // Let updatePumpkinHeight handle height in next frame
              }
            }
          }
        }
        
        // Check if trying to step up to second bridge south step
        if (bridge2.southStepX && bridge2.southStepY) {
          // Calculate distance to south step
          let stepDistanceX = abs(newX - bridge2.southStepX) - bridge2.southStepWidth / 2;
          let stepDistanceY = abs(newY - bridge2.southStepY) - bridge2.southStepDepth / 2;
          
          // If new position is on the step
          if (stepDistanceX <= 0 && stepDistanceY <= 0) {
            // If was not on step before, and is trying to move onto step
            if (!(abs(oldX - bridge2.southStepX) <= bridge2.southStepWidth / 2 &&
                  abs(oldY - bridge2.southStepY) <= bridge2.southStepDepth / 2)) {
              attemptingToStepOnBridge2South = true;
              
              // Try to step up, check if jumping
              let heightDifference = bridge2.southStepRealHeight - pumpkinMan.height;
              
              if (heightDifference > 15 && !pumpkinMan.isJumping) {
                // Too high, need to jump to get up
                hasCollision = true;
                // Block movement
                newX = oldX;
                newY = oldY;
                console.log("Need to jump to get on second bridge south step! Height difference: " + heightDifference);
              } else if (pumpkinMan.isJumping && pumpkinMan.jumpHeight > 10) {
                // Jump height is sufficient, allow stepping up
                console.log("Successfully jumped on second bridge south step!");
                // Let updatePumpkinHeight handle height in next frame
              }
            }
          }
        }
      }
      
      // Update onStep state to global bridge state
      onBridge = onFirstBridge || onSecondBridge;
      onNorthStep = onNorthStep || onBridge2NorthStep;
      onSouthStep = onSouthStep || onBridge2SouthStep;
    }
    
    if (tryingToLeaveStep) {
      hasCollision = true;
    }
    
    // Tree collision detection - increase radius to make collision detection more accurate
    for (let tree of treeList) {
      // Increase collision radius to avoid clipping
      let treeCollisionRadius = tree.treeR / scl + 1.5; 
      
      // Add different collision radii based on tree type
      if (tree.shapeType === 'sphere') {
        treeCollisionRadius = tree.treeR / scl + 2.0; // Sphere trees need larger collision radius
      } else if (tree.shapeType === 'cone') {
        treeCollisionRadius = tree.treeR / scl + 1.8; // Cone tree collision radius
      }
      
      let distanceToTree = dist(newX, newY, tree.x, tree.y);
      if (distanceToTree < treeCollisionRadius) {
        hasCollision = true;
        // Calculate direction vector from tree to pumpkin, and push pumpkin away
        let awayVectorX = newX - tree.x;
        let awayVectorY = newY - tree.y;
        // Normalize vector
        let vectorLength = sqrt(awayVectorX * awayVectorX + awayVectorY * awayVectorY);
        if (vectorLength > 0) {
          awayVectorX /= vectorLength;
          awayVectorY /= vectorLength;
          // Push pumpkin to tree edge, slightly increase push force to avoid getting stuck
          newX = tree.x + awayVectorX * (treeCollisionRadius + 0.2);
          newY = tree.y + awayVectorY * (treeCollisionRadius + 0.2);
        } else {
          // If pumpkin is exactly at tree center, randomly choose a direction to push
          let randomAngle = random(TWO_PI);
          newX = tree.x + cos(randomAngle) * (treeCollisionRadius + 0.2);
          newY = tree.y + sin(randomAngle) * (treeCollisionRadius + 0.2);
        }
      }
    }
    
    // Stone collision detection - increase radius
    for (let stone of stoneList) {
      let stoneCollisionRadius = stone.size / scl + 1.2; // Increase stone collision radius
      let distanceToStone = dist(newX, newY, stone.gridX, stone.gridY);
      if (distanceToStone < stoneCollisionRadius) {
        hasCollision = true;
        // Calculate direction vector from stone to pumpkin, and push pumpkin away
        let awayVectorX = newX - stone.gridX;
        let awayVectorY = newY - stone.gridY;
        // Normalize vector
        let vectorLength = sqrt(awayVectorX * awayVectorX + awayVectorY * awayVectorY);
        if (vectorLength > 0) {
          awayVectorX /= vectorLength;
          awayVectorY /= vectorLength;
          // Push pumpkin to stone edge, add some distance to avoid getting stuck
          newX = stone.gridX + awayVectorX * (stoneCollisionRadius + 0.2);
          newY = stone.gridY + awayVectorY * (stoneCollisionRadius + 0.2);
        } else {
          // If pumpkin is exactly at stone center, randomly choose a direction to push
          let randomAngle = random(TWO_PI);
          newX = stone.gridX + cos(randomAngle) * (stoneCollisionRadius + 0.2);
          newY = stone.gridY + sin(randomAngle) * (stoneCollisionRadius + 0.2);
        }
      }
    }
    
    // Grass collision detection - add collision with grass
    for (let grass of grassList) {
      let grassCollisionRadius = grass.size / scl + 0.8; // Grass collision radius
      let distanceToGrass = dist(newX, newY, grass.x, grass.y);
      if (distanceToGrass < grassCollisionRadius) {
        hasCollision = true;
        // Calculate direction vector from grass to pumpkin, and push pumpkin away
        let awayVectorX = newX - grass.x;
        let awayVectorY = newY - grass.y;
        // Normalize vector
        let vectorLength = sqrt(awayVectorX * awayVectorX + awayVectorY * awayVectorY);
        if (vectorLength > 0) {
          awayVectorX /= vectorLength;
          awayVectorY /= vectorLength;
          // Push pumpkin to grass edge
          newX = grass.x + awayVectorX * (grassCollisionRadius + 0.2);
          newY = grass.y + awayVectorY * (grassCollisionRadius + 0.2);
        } else {
          // If pumpkin is exactly at grass center, randomly choose a direction to push
          let randomAngle = random(TWO_PI);
          newX = grass.x + cos(randomAngle) * (grassCollisionRadius + 0.2);
          newY = grass.y + sin(randomAngle) * (grassCollisionRadius + 0.2);
        }
      }
    }
    
    // House collision detection (fixed position house) - increase house size
    let houseX = 10;
    let houseY = 10;
    let houseSize = 7; // Increase house collision range
    if (newX >= houseX - houseSize/2 && newX <= houseX + houseSize/2 &&
        newY >= houseY - houseSize/2 && newY <= houseY + houseSize/2) {
      hasCollision = true;
      // Calculate vector from pumpkin to house center
      let awayVectorX = newX - houseX;
      let awayVectorY = newY - houseY;
      
      // Find closest house edge
      let edgeX = (abs(awayVectorX) > abs(awayVectorY)) ? 
                 (awayVectorX > 0 ? houseX + houseSize/2 : houseX - houseSize/2) : newX;
      let edgeY = (abs(awayVectorX) <= abs(awayVectorY)) ? 
                 (awayVectorY > 0 ? houseY + houseSize/2 : houseY - houseSize/2) : newY;
      
      // Calculate direction to closest point of house
      newX = edgeX;
      newY = edgeY;
      
      // Slightly push pumpkin away to avoid sticking to edge
      if (abs(awayVectorX) > abs(awayVectorY)) {
        newX += (awayVectorX > 0) ? 0.8 : -0.8;
      } else {
        newY += (awayVectorY > 0) ? 0.8 : -0.8;
      }
    }
    
    // Bridge collision detection - improved arch bridge collision detection
    let riverY = bridge.riverRow;
    let riverWidth = 5; // River width
    let bridgeCenter = bridge.centerCol;
    let bridgeWidth = bridge.width;
    let bridgeLength = bridge.length;
    
    // Use bridge-related state variables already initialized at function start
    
    // Check if on first bridge - mainly detect if within bridge width and length range
    if (newY >= riverY - bridgeLength/2 && newY <= riverY + bridgeLength/2) {
      // Within bridge length range, now check if within bridge width range
      if (abs(newX - bridgeCenter) <= bridgeWidth/2) {
        // On bridge
        onFirstBridge = true;

        // Checkwhetheron/atbridge edge (to prevent falling)
        if (abs(newX - bridgeCenter) > bridgeWidth/2 - 0.8) {
          atFirstBridgeEdge = true;
        }
      } else if (abs(newX - bridgeCenter) <= bridgeWidth/2 + 0.5) {
        // bridgebut not on bridge, need to check if trying to walk off bridge edge
        if (pumpkinMan.gridX >= bridgeCenter - bridgeWidth/2 && 
            pumpkinMan.gridX <= bridgeCenter + bridgeWidth/2) {
          // Originally on bridge, now trying to walk off bridge
          atFirstBridgeEdge = true;
          console.log("Pumpkin man trying to walk off first bridge!");
        }
      }
    }
    
    // CheckwhetherOn second bridge
    let bridge2Center = bridge2.centerCol;
    let bridge2Width = bridge2.width;
    let bridge2Length = bridge2.length;
    
    if (newY >= riverY - bridge2Length/2 && newY <= riverY + bridge2Length/2) {
      // Within second bridge length range
      if (abs(newX - bridge2Center) <= bridge2Width/2) {
        // On second bridge
        onSecondBridge = true;
        
        // Check if at second bridge edge
        if (abs(newX - bridge2Center) > bridge2Width/2 - 0.8) {
          atSecondBridgeEdge = true;
        }
      } else if (abs(newX - bridge2Center) <= bridge2Width/2 + 0.5) {
        // secondbridgeOn bridge，Checkwhethertrying tobridge
        if (pumpkinMan.gridX >= bridge2Center - bridge2Width/2 && 
            pumpkinMan.gridX <= bridge2Center + bridge2Width/2) {
          // Originally on bridge, now trying to walk off bridge
          atSecondBridgeEdge = true;
          console.log("Pumpkin man trying to walk off second bridge!");
        }
      }
    }
    
    // Merge states of both bridges
    onBridge = onFirstBridge || onSecondBridge;
    
    // If at first bridge edge, prevent movement off bridge
    if (atFirstBridgeEdge) {
      hasCollision = true;
      // Calculate push direction - push pumpkin toward bridge center
      if (newX > bridgeCenter) {
        // At right edge of bridge, push left
        newX = bridgeCenter + bridgeWidth/2 - 0.8;
      } else {
        // At left edge of bridge, push right
        newX = bridgeCenter - bridgeWidth/2 + 0.8;
      }
      console.log("Pumpkin man prevented from falling off first bridge");
    }
    
    // If at second bridge edge, prevent movement off bridge
    if (atSecondBridgeEdge) {
      hasCollision = true;
      // Calculate push direction - push pumpkin toward bridge center
      if (newX > bridge2Center) {
        // At right edge of bridge, push left
        newX = bridge2Center + bridge2Width/2 - 0.8;
      } else {
        // At left edge of bridge, push right
        newX = bridge2Center - bridge2Width/2 + 0.8;
      }
      console.log("Pumpkin man prevented from falling off second bridge");
    }
    
    // River detection - if not on bridge and close to river, block passage
    if (!onBridge && !onNorthStep && !onSouthStep && abs(newY - riverY) < riverWidth/2) {
      // Ifsouth，
      hasCollision = true;
      if (newY < riverY) {
        newY = riverY - riverWidth/2 - 0.5; // southtonorth
      } else {
        newY = riverY + riverWidth/2 + 0.5; // southtosouth
      }
    }
    
    // bridge - bridge
    if (onBridge) {
      // On bridge（0-1）
      let oldBridgePos = (oldY - (riverY - bridgeLength/2)) / bridgeLength;
      let newBridgePos = (newY - (riverY - bridgeLength/2)) / bridgeLength;
      
      // bridge
      let oldArchHeight = sin(PI * oldBridgePos) * 40;
      let newArchHeight = sin(PI * newBridgePos) * 40;
      let archHeightDiff = newArchHeight - oldArchHeight;
      
      // If，，Limit movement
      if (abs(archHeightDiff) > 20 && !pumpkinMan.isJumping) {
        // bridge，
        newY = oldY + (newY - oldY) * 0.3;
        console.log("，");
      }
    }
    
    // Check（leave）
    newX = constrain(newX, 1, cols - 2);
    newY = constrain(newY, 1, rows - 2);
    
    //  - up/above，up/above
    if (!onNorthStep && !onSouthStep && !attemptingToStepOnNorth && !attemptingToStepOnSouth) {
      let canClimb = true;
      let currentHeight = pumpkinMan.height;
      let newPositionHeight = terrain[Math.floor(newX)][Math.floor(newY)];
      let heightDifference = newPositionHeight - currentHeight;
      
      // Checkcurrentlywhetheron/at
      let onHill = false;
      let hillSteepness = 0;
      
      for (let hill of hillsList) {
        // Checkwhetheron/at
        let currentDistToHill = dist(pumpkinMan.gridX, pumpkinMan.gridY, hill.x, hill.y);
        let newDistToHill = dist(newX, newY, hill.x, hill.y);
        
        if (newDistToHill < hill.radius) {
          onHill = true;
          
          //  - todistance
          let distChange = currentDistToHill - newDistToHill;
          hillSteepness = heightDifference / (distChange + 0.001); 
          
          if (hillSteepness > 35 && !pumpkinMan.isJumping) {
            // ，up/above
            canClimb = false;
            hasCollision = true;
            
            // on/at
            console.log(`: ${hillSteepness.toFixed(2)}, : ${heightDifference.toFixed(2)}`);
            
            // southto
            if (distChange > 0) {
              // up/above，
              let pushbackFactor = 0.5;
              newX = pumpkinMan.gridX + moveX * pushbackFactor;
              newY = pumpkinMan.gridY + moveY * pushbackFactor;
            }
            
          break;
          } else if (pumpkinMan.isJumping && hillSteepness > 20) {
            
            console.log(`: =${hillSteepness.toFixed(2)}`);
          }
        }
      }
      
      //  - 
      if (!onHill && !onBridge && !onNorthStep && !onSouthStep && abs(heightDifference) > 40 && !pumpkinMan.isJumping) {
        // Normal terrain also requires jumping if height difference is too large
        hasCollision = true;
        console.log(`: ${heightDifference.toFixed(2)}`);
        newX = pumpkinMan.gridX;
        newY = pumpkinMan.gridY;
      }
    }
    
    // Update position
    pumpkinMan.gridX = newX;
    pumpkinMan.gridY = newY;
    updatePumpkinHeight();
    
    // Collision feedback - if collision occurs, can add some visual or audio feedback
    if (hasCollision) {
      // ，、
      console.log("");
    }
  }
}

// Draw pumpkin man
function drawPumpkinMan() {
  push();
  // （ + ）
  let drawHeight = pumpkinMan.height + pumpkinMan.jumpHeight;
  
  translate(pumpkinMan.gridX * scl, pumpkinMan.gridY * scl, drawHeight + pumpkinMan.size/2);
  
  // Emergency state: super scale pumpkin man to make it extremely visible
  if (emergency.active && boatItem.collected) {
    scale(16, 16, 16); // 16x scale to make pumpkin man a giant focal point
  }
  
  // south
  stroke(255, 0, 0);
  strokeWeight(1);
  line(0, 0, 0, 0, 0, 50); // Z
  
  // south
  rotateZ(pumpkinMan.rotationY);
  
  // south
  fill(toGrayScale(255, 100, 0)); 
  noStroke();
  sphere(pumpkinMan.size);
  
  // south - 
  stroke(toGrayScale(255, 120, 40, 100)); // south，
  strokeWeight(1); 
  for (let i = 0; i < 8; i++) {
    let angle = (TWO_PI / 8) * i;
    let x1 = pumpkinMan.size * 0.7 * cos(angle);
    let y1 = pumpkinMan.size * 0.7 * sin(angle);
    
    let randX = random(-0.1, 0.1) * pumpkinMan.size;
    let randY = random(-0.1, 0.1) * pumpkinMan.size;
    line(randX, randY, pumpkinMan.size * 0.8, x1, y1, 0);
  }
  
  // south
  push();
  translate(0, 0, pumpkinMan.size * 0.8);
  fill(toGrayScale(30, 100, 0));
  cylinder(pumpkinMan.size * 0.1, pumpkinMan.size * 0.3, 6, 1);
  pop();
  
  
  push();
  let eyeColor = color(pumpkinMan.eyesColor[0], pumpkinMan.eyesColor[1], pumpkinMan.eyesColor[2]);
  noFill();
  stroke(eyeColor);
  strokeWeight(2);
  
  
  push();
  translate(pumpkinMan.size * 0.3, -pumpkinMan.size * 0.4, pumpkinMan.size * 0.7);
  drawSpringEye(pumpkinMan.size * pumpkinMan.springRadius, pumpkinMan.size * pumpkinMan.springHeight, pumpkinMan.springTurns);
  pop();
  
  
  push();
  translate(-pumpkinMan.size * 0.3, -pumpkinMan.size * 0.4, pumpkinMan.size * 0.7);
  drawSpringEye(pumpkinMan.size * pumpkinMan.springRadius, pumpkinMan.size * pumpkinMan.springHeight, pumpkinMan.springTurns);
  pop();
  pop();
  
  
  push();
  fill(pumpkinMan.mouthColor[0], pumpkinMan.mouthColor[1], pumpkinMan.mouthColor[2]);
  translate(0, -pumpkinMan.size * 0.5, pumpkinMan.size * 0.3);
  rotateX(HALF_PI);
  arc(0, 0, pumpkinMan.size * 0.6, pumpkinMan.size * 0.4, 0, PI, CHORD);
  pop();
  
  pop();
}

// Draw spring eyes
function drawSpringEye(radius, height, turns) {
  let steps = turns * 16; 
  beginShape();
  for (let i = 0; i <= steps; i++) {
    let angle = map(i, 0, steps, 0, TWO_PI * turns);
    let x = radius * cos(angle);
    let y = radius * sin(angle);
    let z = map(i, 0, steps, 0, height);
    vertex(x, y, z);
  }
  endShape();
  
  
  push();
  translate(0, 0, height);
  fill(pumpkinMan.eyesColor[0], pumpkinMan.eyesColor[1], pumpkinMan.eyesColor[2]);
  noStroke();
  sphere(radius * 1.2);
  pop();
}


function mousePressed() {
  mouseStartX = mouseX;
  mouseStartY = mouseY;
  isDragging = true;
  return false; 
}


function mouseReleased() {
  isDragging = false;
  return false; 
}


function mouseDragged() {
  if (isDragging) {
    
    let deltaX = mouseX - mouseStartX;
    let deltaY = mouseY - mouseStartY;
    
    if (followCamera) {
      // on/at，
      pumpkinViewOffsetX += deltaX * 0.01;
      pumpkinViewOffsetY += deltaY * 0.01;
      
      // ，
      pumpkinViewOffsetX = constrain(pumpkinViewOffsetX, -0.8, 0.8);
      pumpkinViewOffsetY = constrain(pumpkinViewOffsetY, -0.5, 0.5);
    } else {
      // Free view mode: control camera spherical coordinates
      freeCam.angleHorizontal += deltaX * freeCam.rotateSpeed;
      freeCam.angleVertical += deltaY * freeCam.rotateSpeed;
      
              // Limit vertical angle to avoid flipping
      freeCam.angleVertical = constrain(freeCam.angleVertical, -PI/2 + 0.1, PI/2 - 0.1);
    }
    
    
    mouseStartX = mouseX;
    mouseStartY = mouseY;
  }
  return false; 
}


function mouseWheel(event) {
  if (followCamera) {
    // on/at，
    pumpkinViewDistance += event.delta * 0.1;
    
    pumpkinViewDistance = constrain(pumpkinViewDistance, 60, 400);
  } else {
    // Free view mode: control camera distance
    freeCam.distance += event.delta * freeCam.zoomSpeed;
    freeCam.distance = constrain(freeCam.distance, freeCam.minDistance, freeCam.maxDistance);
  }
  return false; 
}


function keyPressed() {
  if (keyCode === SHIFT) {
    isShiftPressed = true;
  } else if (keyCode === ALT) {
    isAltPressed = true;
  } else if (keyCode === LEFT_ARROW) {
    isLeftPressed = true;
  } else if (keyCode === RIGHT_ARROW) {
    isRightPressed = true;
  } else if (keyCode === UP_ARROW) {
    isUpPressed = true;
  } else if (keyCode === DOWN_ARROW) {
    isDownPressed = true;
  } else if (key === 's' || key === 'S') {
    // S key - if not in jumping state, trigger jump
    if (!pumpkinMan.isJumping) {
      pumpkinMan.isJumping = true;
      pumpkinMan.jumpPhase = 0;
      console.log("！");
    }
  } else if (key === 'c' || key === 'C') {
    
    followCamera = !followCamera;
    console.log(`${followCamera ? '' : ''}`);
    
    // Ifto，
    if (followCamera) {
      pumpkinViewOffsetX = 0;
      pumpkinViewOffsetY = 0;
      pumpkinViewDistance = 90;
    }
  } else if (key === 't' || key === 'T') {
    
    const styles = ['mountains', 'desert', 'islands', 'terraces', 'canyon'];
    let currentIndex = styles.indexOf(terrainStyle);
    currentIndex = (currentIndex + 1) % styles.length;
    terrainStyle = styles[currentIndex];
    
    generateStaticTerrain();
    // south
    updatePumpkinHeight();
  } else if (key === 'f' || key === 'F') {
    // on/atsouth
    console.log("");
    // southcurrently
    let fenceX = Math.floor(pumpkinMan.gridX) + 5;
    let fenceY = Math.floor(pumpkinMan.gridY) + 5;
    
    fenceArea.centerX = fenceX;
    fenceArea.centerY = fenceY;
    fenceArea.baseHeight = terrain[fenceX][fenceY];
    fenceArea.isPlaced = true;
    fenceArea.gatePos = 0; // north
    
    
    fenceArea.posts = [];
    fenceArea.rails = [];
    sheepList = [];
    
    // Generate fence
    generateFence();
    generateSheep();
    
    console.log(`: (${fenceX}, ${fenceY}), ${sheepList.length}`);
  } else if (key === 'l' || key === 'L') {
    // L - 
    if (!fountainChallenge.active) {
      fountainChallenge.active = true;
      fountainChallenge.timer = 0;
      fountainChallenge.pumpkinTouchedFountain = false;
      fountainChallenge.grayScaleMode = false;
      fountainChallenge.allObjectsFrozen = false;
      
      
      addFloatingText("！10！", width/2, height/2, 100, 3);
              console.log(" - 10");
    }
    } else if (key === 'p' || key === 'P') {
    if (!emergency.active) {
      emergency.active = true;
      emergency.timer = 0;
      emergency.fragmentTimer = 0;
      emergency.initialized = false; // ，10
      emergency.pumpkinSaved = boatItem.collected; // If，
      emergency.boatRideActive = boatItem.collected; // If，
      emergency.maxWaterLevel = walls[0].height;
      
      // 10
      if (boatItem.collected) {
        addFloatingText("！，10！", width/2, height/2, 100, 3);
      } else {
        addFloatingText("！10！", width/2, height/2, 100, 3);
      }
      
      // currentlysouth，
      let currentHeight = pumpkinMan.height;
      
      // ，
      // ，
      let minTerrainHeight = Infinity;
      let sampleSize = 20; // 20
      
      for (let x = 0; x < cols; x += sampleSize) {
        for (let y = 0; y < rows; y += sampleSize) {
          if (x < cols && y < rows && terrain[x][y] < minTerrainHeight) {
            minTerrainHeight = terrain[x][y];
          }
        }
      }
      
      
      // Check
      for (let x = 0; x < cols; x += sampleSize) {
        if (terrain[x][0] < minTerrainHeight) minTerrainHeight = terrain[x][0];
        if (terrain[x][rows-1] < minTerrainHeight) minTerrainHeight = terrain[x][rows-1];
      }
      
      for (let y = 0; y < rows; y += sampleSize) {
        if (terrain[0][y] < minTerrainHeight) minTerrainHeight = terrain[0][y];
        if (terrain[cols-1][y] < minTerrainHeight) minTerrainHeight = terrain[cols-1][y];
      }
      
      // Check（）
      if (bridge && bridge.riverRow) {
        for (let x = 0; x < cols; x += 5) {
          if (x < cols && terrain[x][bridge.riverRow] < minTerrainHeight) {
            minTerrainHeight = terrain[x][bridge.riverRow];
          }
        }
      }
      
      // on/at，to
      minTerrainHeight -= 20; // 5to20，
      
      emergency.waterLevel = minTerrainHeight;
      emergency.waterStartLevel = emergency.waterLevel;
      console.log(`【】: ${emergency.waterLevel.toFixed(1)}, : ${(minTerrainHeight + 5).toFixed(1)}, : ${currentHeight.toFixed(1)}`);
      
      
      console.log('！');
      
      // If，Setup rescue boatto
      if (boatItem.collected) {
        console.log("，");
        setupRescueBoat();
        centerFreeViewOnPumpkin(); // to
        
        
        emergency.waterLevel = minTerrainHeight;
        emergency.waterStartLevel = emergency.waterLevel;
        console.log(`【】：${emergency.waterLevel.toFixed(1)}, : ${currentHeight.toFixed(1)}, `);
      }
    }
  } else if (key === 'e' || key === 'E') {
    // E key - interact with house door
    toggleHouseDoor();
  } else if (key === 'm' || key === 'M') {
    // M key - toggle animal sounds
    toggleAnimalSounds();
  }
  return false;
}


function keyReleased() {
  if (keyCode === SHIFT) {
    isShiftPressed = false;
  } else if (keyCode === ALT) {
    isAltPressed = false;
  } else if (keyCode === LEFT_ARROW) {
    isLeftPressed = false;
  } else if (keyCode === RIGHT_ARROW) {
    isRightPressed = false;
  } else if (keyCode === UP_ARROW) {
    isUpPressed = false;
  } else if (keyCode === DOWN_ARROW) {
    isDownPressed = false;
  } else if (key === 's' || key === 'S') {
    // currentlyto，
    console.log(`：
rotationX = ${rotationX}; // X ()
rotationY = ${rotationY}; // Y ()
rotationZ = ${rotationZ}; // Z ()
terrainScale = ${terrainScale}; 
offsetX = ${offsetX};     // X
offsetY = ${offsetY};   // Y
offsetZ = ${offsetZ};  // Z
：X=${pumpkinMan.gridX}, Y=${pumpkinMan.gridY}`);
  }
  return false;
}

function setGradientBg() {
  push();
  resetMatrix();

  
  const zenithColor = color(255, 100, 50);    
  const horizonColor = color(150, 70, 30);    
  for (let y = -height/2; y < height/2; y++) {
    let inter = map(y, -height/2, height/2, 0, 1);
    // to
    let c = lerpColor(zenithColor, horizonColor, pow(inter, 1.5));
    stroke(c);
    line(-width/2, y, width/2, y);
  }
  pop();
}

// Draw walls
// Draw walls with Mongolian decorations
function drawWalls() {
  // Mongolian wall decoration colors
  let wallColor = color(150, 100, 50); 
  let darkWoodColor = color(120, 80, 40);
  let mongolianRed = color(200, 50, 50);
  let mongolianBlue = color(50, 100, 200);
  let mongolianGold = color(255, 200, 50);
  
  for (let wallIndex = 0; wallIndex < walls.length; wallIndex++) {
    let wall = walls[wallIndex];
    let startX = wall.startX;
    let startY = wall.startY;
    let endX = wall.endX;
    let endY = wall.endY; 
    if (startX === endX) { // （）
      let direction = startY < endY ? 1 : -1; 
      for (let y = min(startY, endY); y <= max(startY, endY); y++) {
        
        if (y >= wall.doorStartY && y <= wall.doorEndY) continue;
        
        
        let baseHeight = terrain[startX][y];
        
        
        push();
        translate(startX * scl, y * scl, baseHeight + wall.height/2);
        
        
        fill(wallColor);
        noStroke();
        box(scl*1.5, scl*0.8, wall.height); 
        
        // Add Mongolian decorative patterns on vertical walls
        push();
        translate(scl*0.8, 0, 0); // Position on wall surface
        rotateY(PI/2); // Face outward
        
        // Choose pattern based on wall section and wall index
        let patternType = (y + wallIndex) % 4;
        
        if (patternType === 0) {
          // Traditional Mongolian border pattern
          stroke(mongolianGold);
          strokeWeight(0.8);
          noFill();
          
          // Decorative border frame
          rect(0, 0, scl*0.6, wall.height*0.8);
          
          // Inner geometric pattern
          fill(mongolianRed);
          noStroke();
          for (let i = 0; i < 3; i++) {
            let rectY = map(i, 0, 2, -wall.height*0.3, wall.height*0.3);
            rect(0, rectY, scl*0.3, wall.height*0.15);
          }
          
        } else if (patternType === 1) {
          // Yurt pattern
          fill(mongolianBlue);
          stroke(mongolianGold);
          strokeWeight(0.5);
          
          // Yurt dome
          arc(0, wall.height*0.2, scl*0.4, wall.height*0.3, 0, PI);
          
          // Yurt base
          rect(0, -wall.height*0.1, scl*0.4, wall.height*0.3);
          
          // Decorative elements
          fill(mongolianGold);
          noStroke();
          for (let i = 0; i < 5; i++) {
            let dotX = map(i, 0, 4, -scl*0.15, scl*0.15);
            circle(dotX, -wall.height*0.3, 2);
          }
          
        } else if (patternType === 2) {
          // Horse pattern
          stroke(mongolianRed);
          strokeWeight(1);
          noFill();
          
          // Stylized horse silhouette
          beginShape();
          vertex(-scl*0.2, -wall.height*0.2);
          vertex(-scl*0.1, -wall.height*0.1);
          vertex(scl*0.1, -wall.height*0.1);
          vertex(scl*0.2, -wall.height*0.2);
          vertex(scl*0.15, wall.height*0.1);
          vertex(-scl*0.15, wall.height*0.1);
          endShape(CLOSE);
          
          // Horse legs
          for (let i = 0; i < 4; i++) {
            let legX = map(i, 0, 3, -scl*0.15, scl*0.15);
            line(legX, wall.height*0.1, legX, wall.height*0.25);
          }
          
        } else {
          // Endless knot pattern
          stroke(mongolianBlue);
          strokeWeight(0.8);
          noFill();
          
          // Interwoven pattern
          beginShape();
          for (let angle = 0; angle < TWO_PI; angle += 0.3) {
            let x = cos(angle) * scl*0.15 + cos(angle*3) * scl*0.05;
            let y = sin(angle) * wall.height*0.15 + sin(angle*3) * wall.height*0.05;
            vertex(x, y);
          }
          endShape();
          
          // Center ornament
          fill(mongolianGold);
          noStroke();
          circle(0, 0, 4);
        }
        pop();
        
        // Original wooden beams
        for (let i = -3; i <= 3; i += 2) {
          push();
          translate(0, 0, i * 10);
          fill(darkWoodColor);
          box(scl*1.5, scl*0.6, 5);
          pop();
        }
        
        pop();
      }
    } else { // （southnorth）
      let direction = startX < endX ? 1 : -1; 
      for (let x = min(startX, endX); x <= max(startX, endX); x++) {
        
        if (x >= wall.doorStartX && x <= wall.doorEndX) continue;
        
        
        let baseHeight = terrain[x][startY];
        
        
        push();
        translate(x * scl, startY * scl, baseHeight + wall.height/2);
        
        
        fill(wallColor);
        noStroke();
        box(scl*0.8, scl*1.5, wall.height); 
        
        // Add Mongolian decorative patterns on horizontal walls
        push();
        translate(0, scl*0.8, 0); // Position on wall surface
        // No rotation needed for horizontal walls
        
        // Choose different patterns for horizontal walls
        let patternType = (x + wallIndex) % 3;
        
        if (patternType === 0) {
          // Traditional banner pattern (旗帜纹)
          fill(mongolianRed);
          stroke(mongolianGold);
          strokeWeight(0.5);
          
          // Banner shape
          beginShape();
          vertex(-scl*0.3, -wall.height*0.3);
          vertex(scl*0.3, -wall.height*0.3);
          vertex(scl*0.2, -wall.height*0.1);
          vertex(scl*0.3, wall.height*0.1);
          vertex(-scl*0.3, wall.height*0.1);
          vertex(-scl*0.2, -wall.height*0.1);
          endShape(CLOSE);
          
          // Banner decorations
          fill(mongolianGold);
          noStroke();
          for (let i = 0; i < 3; i++) {
            let starY = map(i, 0, 2, -wall.height*0.2, wall.height*0.0);
            circle(0, starY, 3);
          }
          
        } else if (patternType === 1) {
          // Eagle pattern (鹰纹)
          stroke(mongolianBlue);
          strokeWeight(1);
          noFill();
          
          // Eagle body
          ellipse(0, 0, scl*0.3, wall.height*0.2);
          
          // Eagle wings
          beginShape();
          vertex(-scl*0.3, -wall.height*0.1);
          vertex(-scl*0.1, wall.height*0.05);
          vertex(-scl*0.2, wall.height*0.15);
          endShape();
          
          beginShape();
          vertex(scl*0.3, -wall.height*0.1);
          vertex(scl*0.1, wall.height*0.05);
          vertex(scl*0.2, wall.height*0.15);
          endShape();
          
          // Eagle head
          fill(mongolianGold);
          noStroke();
          circle(0, -wall.height*0.1, 4);
          
        } else {
          // Mountain pattern (山纹)
          stroke(mongolianGold);
          strokeWeight(1.2);
          noFill();
          
          // Mountain peaks
          beginShape();
          vertex(-scl*0.3, wall.height*0.2);
          vertex(-scl*0.15, -wall.height*0.1);
          vertex(0, wall.height*0.1);
          vertex(scl*0.15, -wall.height*0.2);
          vertex(scl*0.3, wall.height*0.2);
          endShape();
          
          // Sun or moon
          fill(mongolianRed);
          noStroke();
          circle(0, -wall.height*0.25, 6);
        }
        pop();
        
        // Original wooden beams
        for (let i = -3; i <= 3; i += 2) {
          push();
          translate(0, 0, i * 10);
          fill(darkWoodColor);
          box(scl*0.6, scl*1.5, 5);
          pop();
        }
        
        pop();
      }
    }
    
    
    // Draw door posts with Mongolian decorations
    if (startX === endX) { 
      
      // Left door post with guardian symbols
      push();
      translate(startX * scl, wall.doorStartY * scl, terrain[startX][wall.doorStartY] + wall.height/2);
      fill(100, 70, 40); 
      box(scl*1.8, scl*1.2, wall.height + 20); 
      
      // Add guardian symbol on door post
      push();
      translate(scl*1.0, 0, wall.height*0.2);
      rotateY(PI/2);
      
      // Mongolian guardian symbol (护法符)
      stroke(mongolianGold);
      strokeWeight(1.5);
      fill(mongolianRed);
      
      // Protective shield shape
      beginShape();
      vertex(0, -15);
      vertex(-8, -10);
      vertex(-8, 10);
      vertex(0, 15);
      vertex(8, 10);
      vertex(8, -10);
      endShape(CLOSE);
      
      // Inner protection symbol
      fill(mongolianGold);
      noStroke();
      circle(0, 0, 8);
      
      // Traditional dots
      fill(mongolianBlue);
      for (let i = 0; i < 4; i++) {
        let angle = i * PI/2;
        let x = cos(angle) * 5;
        let y = sin(angle) * 5;
        circle(x, y, 2);
      }
      pop();
      pop();
      
      // Right door post with blessing symbols
      push();
      translate(startX * scl, wall.doorEndY * scl, terrain[startX][wall.doorEndY] + wall.height/2);
      fill(100, 70, 40);
      box(scl*1.8, scl*1.2, wall.height + 20);
      
      // Add blessing symbol on door post
      push();
      translate(scl*1.0, 0, wall.height*0.2);
      rotateY(PI/2);
      
      // Mongolian blessing symbol (吉祥符)
      stroke(mongolianBlue);
      strokeWeight(1.2);
      noFill();
      
      // Lotus-like pattern for blessing
      for (let i = 0; i < 8; i++) {
        push();
        rotateZ(i * PI/4);
        arc(0, 0, 12, 6, 0, PI);
        pop();
      }
      
      // Central blessing circle
      fill(mongolianGold);
      noStroke();
      circle(0, 0, 6);
      
      // Blessing characters representation
      stroke(mongolianRed);
      strokeWeight(0.8);
      noFill();
      line(-3, -3, 3, 3);
      line(-3, 3, 3, -3);
      pop();
      pop();
      
      // （up/above）
      push();
      translate(startX * scl, (wall.doorStartY + wall.doorEndY) * scl/2, terrain[startX][wall.doorStartY] + wall.height);
      fill(120, 80, 40);
      box(scl*1.8, (wall.doorEndY - wall.doorStartY) * scl, 15);
      pop();
    } else { 
        // Horizontal wall door posts
        
        // Left door post with prosperity symbols
      push();
      translate(wall.doorStartX * scl, startY * scl, terrain[wall.doorStartX][startY] + wall.height/2);
      fill(100, 70, 40);
      box(scl*1.2, scl*1.8, wall.height + 20);
        
        // Add prosperity symbol
        push();
        translate(0, scl*1.0, wall.height*0.2);
        // Face outward from horizontal wall
        
        // Mongolian prosperity symbol (富贵符)
        stroke(mongolianGold);
        strokeWeight(1.2);
        fill(mongolianBlue);
        
        // Prosperity knot
        beginShape();
        vertex(-6, -12);
        vertex(6, -12);
        vertex(12, -6);
        vertex(12, 6);
        vertex(6, 12);
        vertex(-6, 12);
        vertex(-12, 6);
        vertex(-12, -6);
        endShape(CLOSE);
        
        // Inner wealth symbols
        fill(mongolianGold);
        noStroke();
        for (let i = 0; i < 4; i++) {
          let angle = i * PI/2 + PI/4;
          let x = cos(angle) * 6;
          let y = sin(angle) * 6;
          circle(x, y, 3);
        }
        pop();
      pop();
      
        // Right door post with harmony symbols
      push();
      translate(wall.doorEndX * scl, startY * scl, terrain[wall.doorEndX][startY] + wall.height/2);
      fill(100, 70, 40);
      box(scl*1.2, scl*1.8, wall.height + 20);
        
        // Add harmony symbol
        push();
        translate(0, scl*1.0, wall.height*0.2);
        
        // Mongolian harmony symbol (和谐符)
        stroke(mongolianRed);
        strokeWeight(1.0);
        noFill();
        
        // Yin-yang inspired pattern
        arc(0, 0, 16, 16, 0, PI);
        arc(0, 0, 16, 16, PI, TWO_PI);
        
        // Central harmony dots
        fill(mongolianGold);
        noStroke();
        circle(0, -4, 4);
        circle(0, 4, 4);
        
        // Surrounding harmony elements
        fill(mongolianBlue);
        circle(-8, 0, 2);
        circle(8, 0, 2);
        circle(0, -8, 2);
        circle(0, 8, 2);
        pop();
      pop();
      
      // （up/above）
      push();
      translate((wall.doorStartX + wall.doorEndX) * scl/2, startY * scl, terrain[wall.doorStartX][startY] + wall.height);
      fill(120, 80, 40);
      box((wall.doorEndX - wall.doorStartX) * scl, scl*1.8, 15);
      pop();
    }
  }
}

// Function to draw a simple square house
function drawSquareHouse(x, y, z) {
  push();
  translate(x, y, z + 40); // House elevation
  
  // Main house body
  fill(150, 75, 0); 
  box(200, 200, 150);
  
  // Roof
  push();
  translate(0, 0, 110);
  rotateX(HALF_PI);
  fill(200, 0, 0); 
  cone(160, 80);
  pop();
  
  // Front door (existing)
  translate(0, 0, -35);
  rotateX(HALF_PI);
  fill(100, 50, 0); 
  translate(0, 100, -40);
  box(70, 100, 15);
  
  // Side door (new interactive door)
  push();
  translate(100, -50, 40); // Position on the east side of house
  rotateY(HALF_PI); // Rotate to face outward from the wall
  
  // Door frame
  fill(80, 40, 20); // Dark brown frame
  push();
  translate(0, 0, -5);
  box(60, 90, 10); // Door frame slightly larger than door
  pop();
  
  // Update door animation
  houseDoor.openAngle = lerp(houseDoor.openAngle, houseDoor.targetAngle, houseDoor.animationSpeed);
  
  // Door panel
  push();
  translate(0, -20, 0); // Pivot point on the left side of door (now Y-axis)
  rotateZ(-houseDoor.openAngle); // Rotate around Z-axis to open (negative for correct direction)
  translate(0, 20, 0); // Move back to center for drawing
  
  fill(120, 80, 40); // Brown door color
  box(50, 80, 8);
  
  // Door handle
  push();
  translate(0, 20, 5);
  fill(200, 180, 120); // Brass handle
  sphere(3);
  pop();
  
  // Door panels/details
  stroke(80, 40, 20);
  strokeWeight(2);
  noFill();
  push();
  translate(0, 0, 4.5); // Move to door surface
  rect(0, 0, 60, 35); // Outer panel (swapped width/height)
  rect(0, 0, 40, 25); // Inner panel (swapped width/height)
  pop();
  noStroke();
  
  pop(); // End door panel
  pop(); // End side door
  
  pop(); // End house
}

function drawRiver() {
  push();
  fill(0, 100, 255, 150); 
  let riverY = rows / 2; // Y（）
  let riverWidth = 6; // River width
  
  
  let waterLevel = bridge.waterLevel || -40;
  
  // Draw river
  beginShape();
  for (let x = 0; x < cols; x++) {
    // north
    let northY = riverY - riverWidth/2;
    vertex(x * scl, northY * scl, waterLevel);
  }
  for (let x = cols-1; x >= 0; x--) {
    // south
    let southY = riverY + riverWidth/2;
    vertex(x * scl, southY * scl, waterLevel);
  }
  endShape(CLOSE);
  
  
  stroke(200, 225, 255, 100);
  strokeWeight(0.5);
  noFill();
  
  
  for (let i = 0; i < 8; i++) {
    beginShape();
    for (let x = 0; x < cols; x += 2) {
      let waveY = riverY + sin(x * 0.1 + frameCount * 0.05 + i) * (riverWidth * 0.3);
      vertex(x * scl, waveY * scl, waterLevel + 1);
    }
    endShape();
  }
  
  pop();
  
  // bridge
  drawWoodenBridge();
  drawStoneBridge();
}

// Draw wooden bridge
function drawWoodenBridge() {
  // bridge - on/atbridgesouthnorth
  let bridgeX = bridge.centerCol * scl;
  let riverY = bridge.riverRow * scl;
  let bridgeLength = bridge.length * scl;
  let bridgeWidth = bridge.width * scl;
  
  
  let waterLevel = bridge.waterLevel || -40;
  
  // bridge - bridge
  let bridgeLevel = waterLevel + 50; 
  // bridge
  let bridgeMaxHeight = 40; // ，
  
  // bridgestep - 
  bridge.northStepHeight = bridgeLevel - 10; // bridge
  bridge.southStepHeight = bridgeLevel - 10;
  bridge.stepSize = 6; // step
  bridge.stepTopOffset = 2; // step，southon/atup/above
  
  // bridge - 
  console.log(`: x=${bridgeX}, y=${riverY}, =${waterLevel}, =${bridgeLevel}`);
  
  
  let woodColor = color(120, 80, 40); 
  let lightWoodColor = color(160, 120, 70); 
  let darkWoodColor = color(90, 60, 30); // （）
  
  push();
  
  // bridge（）- 
  fill(darkWoodColor);
  noStroke();
  
  // northbridge - 
  push();
  translate(bridgeX, riverY - bridgeLength/2, (waterLevel + bridgeLevel) / 2);
  box(scl*1.8, scl*1.8, bridgeLevel - waterLevel + 40);
  pop();
  
  // southbridge - 
  push();
  translate(bridgeX, riverY + bridgeLength/2, (waterLevel + bridgeLevel) / 2);
  box(scl*1.8, scl*1.8, bridgeLevel - waterLevel + 40);
  pop();
  
  //  - 
  let numPillars = 5; // 5（）
  for (let i = 1; i < numPillars - 1; i++) {
    let pillarY = riverY - bridgeLength/2 + (bridgeLength * i / (numPillars - 1));
    let pillarHeight = bridgeLevel - waterLevel + 20; 
    push();
    translate(bridgeX, pillarY, (waterLevel + bridgeLevel) / 2);
    box(scl*1.6, scl*1.6, pillarHeight);
    pop();
  }
  
  
  fill(darkWoodColor);
  
  
  let numArches = 4; 
  for (let i = 0; i < numArches; i++) {
    let archStartY = riverY - bridgeLength/2 + (bridgeLength * i / numArches);
    let archEndY = riverY - bridgeLength/2 + (bridgeLength * (i+1) / numArches);
    let archMidY = (archStartY + archEndY) / 2;
    
    // （）
    let archSteps = 8;
    for (let j = 0; j <= archSteps; j++) {
      let t = j / archSteps;
      
      let archY = archStartY + (archEndY - archStartY) * t;
      let archHeight = sin(PI * t) * 30; 
      push();
      
      translate(bridgeX + bridgeWidth/2 - scl*0.3, archY, waterLevel + bridgeLevel/2 + archHeight);
      box(scl*0.6, scl*0.6, bridgeLevel - archHeight*2);
      pop();
      
      push();
      
      translate(bridgeX - bridgeWidth/2 + scl*0.3, archY, waterLevel + bridgeLevel/2 + archHeight);
      box(scl*0.6, scl*0.6, bridgeLevel - archHeight*2);
      pop();
    }
  }
  
  // bridgebridgestep（）- 
  fill(woodColor);
  
  // northstep - bridge
  let northStepWidth = bridgeWidth * 1.2;
  let northStepDepth = scl * bridge.stepSize;
  let northStepY = riverY - bridgeLength/2 - northStepDepth/2;
  let northStepHeight = bridge.northStepHeight - waterLevel;
  
  push();
  translate(bridgeX, northStepY, waterLevel);
  
  // step，（）
  bridge.northStepX = bridgeX / scl;
  bridge.northStepY = northStepY / scl;
  bridge.northStepWidth = northStepWidth / scl;
  bridge.northStepDepth = northStepDepth / scl;
  bridge.northStepRealHeight = bridge.northStepHeight + bridge.stepTopOffset;
  
  // step
  
  fill(darkWoodColor);
  box(northStepWidth, northStepDepth, 10);
  
  
  translate(0, 0, 5 + northStepHeight/2 - 5);
  fill(woodColor);
  box(northStepWidth, northStepDepth, northStepHeight - 10);
  
  // （，southon/atup/above）
  translate(0, 0, (northStepHeight - 10)/2 + 5 + bridge.stepTopOffset/2);
  fill(lightWoodColor);
  box(northStepWidth - 5, northStepDepth - 5, bridge.stepTopOffset);
  pop();
  
  // southstep - bridge
  let southStepWidth = bridgeWidth * 1.2;
  let southStepDepth = scl * bridge.stepSize;
  let southStepY = riverY + bridgeLength/2 + southStepDepth/2;
  let southStepHeight = bridge.southStepHeight - waterLevel;
  
  push();
  translate(bridgeX, southStepY, waterLevel);
  
  // step，
  bridge.southStepX = bridgeX / scl;
  bridge.southStepY = southStepY / scl;
  bridge.southStepWidth = southStepWidth / scl;
  bridge.southStepDepth = southStepDepth / scl;
  bridge.southStepRealHeight = bridge.southStepHeight + bridge.stepTopOffset;
  
  // step 
  
  fill(darkWoodColor);
  box(southStepWidth, southStepDepth, 10);
  
  
  translate(0, 0, 5 + southStepHeight/2 - 5);
  fill(woodColor);
  box(southStepWidth, southStepDepth, southStepHeight - 10);
  
  // （，southon/atup/above）
  translate(0, 0, (southStepHeight - 10)/2 + 5 + bridge.stepTopOffset/2);
  fill(lightWoodColor);
  box(southStepWidth - 5, southStepDepth - 5, bridge.stepTopOffset);
  pop();
  
  // bridge - on/atsouthnorth
  let plankSpacing = bridgeLength / bridge.planksCount;
  
  for (let i = 0; i < bridge.planksCount; i++) {
    let t = i / (bridge.planksCount - 1); // 0to1，bridgeup/above
    let plankY = (riverY - bridgeLength/2) + i * plankSpacing + plankSpacing/2;
    
    //  - ，
    let archHeight = sin(PI * t) * bridgeMaxHeight;
    let plankHeight = bridgeLevel + archHeight;
    
    // ，bridge
    let randomShade = random(-20, 20);
    fill(color(160 + randomShade, 120 + randomShade/2, 70));
    
    //  - 
    push();
    translate(bridgeX, plankY, plankHeight + 2);
    
    let angle = 0;
    if (i > 0 && i < bridge.planksCount - 1) {
      
      let prevT = (i-1) / (bridge.planksCount - 1);
      let nextT = (i+1) / (bridge.planksCount - 1);
      let prevHeight = sin(PI * prevT) * bridgeMaxHeight;
      let nextHeight = sin(PI * nextT) * bridgeMaxHeight;
      angle = atan2(nextHeight - prevHeight, plankSpacing * 2);
    }
    rotateX(angle);
    box(bridgeWidth, plankSpacing * 0.9, 4);
    pop();
  }
  
  // bridge - 
  
  let eastEdge = bridgeX + (bridgeWidth/2) - scl*0.4;
  
  let westEdge = bridgeX - (bridgeWidth/2) + scl*0.4;
  
  //  - 
  fill(woodColor);
  for (let i = 0; i <= bridge.planksCount; i += 2) {
    let t = i / bridge.planksCount;
    let postY = (riverY - bridgeLength/2) + (i * bridgeLength / bridge.planksCount);
    let archHeight = sin(PI * t) * bridgeMaxHeight;
    let railingBaseHeight = bridgeLevel + archHeight;
    
    
    push();
    translate(eastEdge, postY, railingBaseHeight + bridge.railingHeight/2 + 2);
    box(4, 4, bridge.railingHeight);
    pop();
    
    
    push();
    translate(westEdge, postY, railingBaseHeight + bridge.railingHeight/2 + 2);
    box(4, 4, bridge.railingHeight);
    pop();
  }
  
  //  - 
  fill(lightWoodColor);
  
  // up/above - 
  let railSegments = 16;
  for (let i = 0; i < railSegments; i++) {
    let startT = i / railSegments;
    let endT = (i + 1) / railSegments;
    let startY = riverY - bridgeLength/2 + bridgeLength * startT;
    let endY = riverY - bridgeLength/2 + bridgeLength * endT;
    let startHeight = sin(PI * startT) * bridgeMaxHeight;
    let endHeight = sin(PI * endT) * bridgeMaxHeight;
    
    // up/above
    push();
    
    let midY = (startY + endY) / 2;
    let midHeight = (startHeight + endHeight) / 2;
    let angle = atan2(endHeight - startHeight, endY - startY);
    
    translate(eastEdge, midY, bridgeLevel + midHeight + bridge.railingHeight + 2);
    rotateX(angle);
    box(4, dist(startY, startHeight, endY, endHeight), 4);
    pop();
    
    
    push();
    translate(eastEdge, midY, bridgeLevel + midHeight + bridge.railingHeight/2 + 2);
    rotateX(angle);
    box(4, dist(startY, startHeight, endY, endHeight), 4);
    pop();
    
    // up/above
    push();
    translate(westEdge, midY, bridgeLevel + midHeight + bridge.railingHeight + 2);
    rotateX(angle);
    box(4, dist(startY, startHeight, endY, endHeight), 4);
    pop();
    
    
    push();
    translate(westEdge, midY, bridgeLevel + midHeight + bridge.railingHeight/2 + 2);
    rotateX(angle);
    box(4, dist(startY, startHeight, endY, endHeight), 4);
    pop();
  }
  
  
  for (let i = 0; i <= bridge.planksCount; i += 3) {
    let t = i / bridge.planksCount;
    let beamY = (riverY - bridgeLength/2) + (i * bridgeLength / bridge.planksCount);
    let archHeight = sin(PI * t) * bridgeMaxHeight;
    
    push();
    translate(bridgeX, beamY, bridgeLevel + archHeight - 3);
    box(bridgeWidth, 6, 6);
    pop();
  }
  
  // Draw Mongolian Hada (prayer scarves) on wooden bridge
  drawHadaOnBridge(bridgeX, riverY, bridgeLength, bridgeWidth, bridgeLevel, bridgeMaxHeight);
  
  pop();
}

// Draw Mongolian Hada (prayer scarves) on bridge
function drawHadaOnBridge(bridgeX, riverY, bridgeLength, bridgeWidth, bridgeLevel, bridgeMaxHeight) {
  // Traditional Mongolian Hada colors
  let hadaWhite = color(255, 255, 255, 200);
  let hadaBlue = color(100, 150, 255, 180);
  let hadaYellow = color(255, 220, 100, 180);
  let hadaRed = color(255, 100, 100, 180);
  let hadaGreen = color(100, 255, 150, 180);
  let hadaGold = color(255, 200, 50, 220);
  
  let hadaColors = [hadaWhite, hadaBlue, hadaYellow, hadaRed, hadaGreen];
  
  // Draw multiple Hada hanging from bridge railings
  let numHada = 8;
  for (let i = 0; i < numHada; i++) {
    let t = (i + 0.5) / numHada;
    let hadaY = riverY - bridgeLength/2 + bridgeLength * t;
    let archHeight = sin(PI * t) * bridgeMaxHeight;
    let hadaBaseHeight = bridgeLevel + archHeight + bridge.railingHeight;
    
    // Alternate sides for variety
    let side = (i % 2 === 0) ? 1 : -1;
    let hadaX = bridgeX + side * (bridgeWidth/2 - 8);
    
    // Wind-based flutter animation
    let windStrength = 0.3;
    let timeOffset = i * 0.5;
    let windX = sin(frameCount * 0.02 + timeOffset) * windStrength * 15;
    let windY = cos(frameCount * 0.03 + timeOffset) * windStrength * 8;
    
    push();
    translate(hadaX, hadaY, hadaBaseHeight);
    
    // Choose Hada color
    let hadaColor = hadaColors[i % hadaColors.length];
    fill(hadaColor);
    stroke(255, 255, 255, 100);
    strokeWeight(0.5);
    
    // Draw hanging Hada with flutter effect
    let hadaLength = 25 + sin(frameCount * 0.02 + i) * 3; // Length variation
    let hadaWidth = 8;
    
    // Main Hada body with flutter
    push();
    translate(windX, windY, -hadaLength/2);
    rotateX(windX * 0.01);
    rotateY(windY * 0.01);
    
    // Hada fabric with traditional pattern
    beginShape(TRIANGLES);
    // Create flowing fabric effect
    for (let j = 0; j < 6; j++) {
      let y1 = map(j, 0, 5, -hadaLength/2, hadaLength/2);
      let y2 = map(j+1, 0, 5, -hadaLength/2, hadaLength/2);
      let flutter1 = sin(frameCount * 0.03 + j * 0.5 + i) * 2;
      let flutter2 = sin(frameCount * 0.03 + (j+1) * 0.5 + i) * 2;
      
      // Left edge
      vertex(-hadaWidth/2 + flutter1, y1, 0);
      vertex(-hadaWidth/2 + flutter2, y2, 0);
      vertex(hadaWidth/2 + flutter1, y1, 0);
      
      // Right edge
      vertex(hadaWidth/2 + flutter1, y1, 0);
      vertex(-hadaWidth/2 + flutter2, y2, 0);
      vertex(hadaWidth/2 + flutter2, y2, 0);
    }
    endShape();
    
    // Add traditional Hada decorative patterns
    fill(255, 255, 255, 150);
    noStroke();
    
    // Buddhist endless knot pattern
    for (let k = 0; k < 3; k++) {
      let patternY = map(k, 0, 2, -hadaLength/3, hadaLength/3);
      push();
      translate(0, patternY, 0.5);
      
      // Simple knot symbol
      stroke(255, 255, 255, 120);
      strokeWeight(0.8);
      noFill();
      
      // Interweaving pattern
      arc(-2, -2, 4, 4, 0, PI);
      arc(2, 2, 4, 4, PI, TWO_PI);
      line(-2, 0, 2, 0);
      line(0, -2, 0, 2);
      pop();
    }
    
    pop();
    
    // Add tassels at the end with flutter
    fill(hadaColor);
    noStroke();
    for (let t = 0; t < 5; t++) {
      let tasselX = map(t, 0, 4, -hadaWidth/3, hadaWidth/3);
      let tasselFlutter = sin(frameCount * 0.05 + i + t) * 2;
      
      push();
      translate(tasselX + windX + tasselFlutter, windY, -hadaLength - 5);
      cylinder(0.5, 8);
      pop();
    }
    
    pop();
  }
  
  // Special ceremonial golden Hada at bridge center
  push();
  translate(bridgeX, riverY, bridgeLevel + 20 + bridge.railingHeight);
  
  // Golden ceremonial Hada
  fill(hadaGold);
  stroke(255, 255, 200, 150);
  strokeWeight(1);
  
  // Larger, more ornate center Hada
  let centerWindX = sin(frameCount * 0.015) * 10;
  let centerWindY = cos(frameCount * 0.02) * 5;
  
  push();
  translate(centerWindX, centerWindY, -15);
  rotateX(centerWindX * 0.005);
  rotateY(centerWindY * 0.005);
  
  // Main ceremonial fabric
  beginShape();
  vertex(-12, -20, 0);
  vertex(12, -20, 0);
  vertex(10, 20, 0);
  vertex(-10, 20, 0);
  endShape(CLOSE);
  
  // Ceremonial patterns
  fill(255, 255, 255, 200);
  noStroke();
  
  // Traditional Mongolian symbols
  for (let s = 0; s < 4; s++) {
    let symbolY = map(s, 0, 3, -15, 15);
    push();
    translate(0, symbolY, 0.5);
    
    // Lotus pattern
    stroke(255, 200, 50, 180);
    strokeWeight(1);
    noFill();
    
    for (let p = 0; p < 8; p++) {
      push();
      rotateZ(p * PI/4);
      arc(0, 0, 6, 3, 0, PI);
      pop();
    }
    
    // Center blessing dot
    fill(255, 200, 50, 200);
    noStroke();
    circle(0, 0, 2);
    pop();
  }
  
  pop();
  
  // Ceremonial tassels
  fill(hadaGold);
  noStroke();
  for (let ct = 0; ct < 7; ct++) {
    let ctasselX = map(ct, 0, 6, -8, 8);
    let ctasselFlutter = sin(frameCount * 0.04 + ct) * 3;
    
    push();
    translate(ctasselX + centerWindX + ctasselFlutter, centerWindY, -25);
    cylinder(0.8, 12);
    
    // Tassel end ornament
    translate(0, 0, -8);
    fill(255, 200, 50);
    sphere(1.5);
    pop();
  }
  
  pop();
}

// Draw stone bridge
function drawStoneBridge() {
  // bridge
  let bridgeX = bridge2.centerCol * scl;
  let riverY = bridge2.riverRow * scl;
  let bridgeLength = bridge2.length * scl;
  let bridgeWidth = bridge2.width * scl;
  
  
  let waterLevel = bridge2.waterLevel || -20;
  
  // bridge - bridge
  let bridgeLevel = waterLevel + 45; // bridgebridge
  
  // bridge
  let bridgeMaxHeight = 30; // bridge
  
  // bridgestep - 
  bridge2.northStepHeight = bridgeLevel - 10; 
  bridge2.southStepHeight = bridgeLevel - 10;
  bridge2.stepSize = 6; // step
  bridge2.stepTopOffset = 2; // step，southon/atup/above
  
  // bridge
  console.log(`: x=${bridgeX}, y=${riverY}, =${waterLevel}, =${bridgeLevel}`);
  
  
  let stoneColor = color(130, 130, 130); 
  let darkStoneColor = color(80, 80, 80); 
  let lightStoneColor = color(180, 180, 180); 
  push();
  
  // bridge（）
  fill(darkStoneColor);
  noStroke();
  
  // northbridge
  push();
  translate(bridgeX, riverY - bridgeLength/2, (waterLevel + bridgeLevel) / 2);
  box(scl*2.2, scl*2.2, bridgeLevel - waterLevel + 30);
  pop();
  
  // southbridge
  push();
  translate(bridgeX, riverY + bridgeLength/2, (waterLevel + bridgeLevel) / 2);
  box(scl*2.2, scl*2.2, bridgeLevel - waterLevel + 30);
  pop();
  
  //  - bridge
  let numPillars = 3; // 3（）
  for (let i = 1; i < numPillars - 1; i++) {
    let pillarY = riverY - bridgeLength/2 + (bridgeLength * i / (numPillars - 1));
    let pillarHeight = bridgeLevel - waterLevel + 25;
    
    push();
    translate(bridgeX, pillarY, (waterLevel + bridgeLevel) / 2);
    box(scl*2.0, scl*2.0, pillarHeight);
    pop();
  }
  
  //  - 
  let numArches = 2; // bridge（bridge）
  for (let i = 0; i < numArches; i++) {
    let archStartY = riverY - bridgeLength/2 + (bridgeLength * i / numArches);
    let archEndY = riverY - bridgeLength/2 + (bridgeLength * (i+1) / numArches);
    
    // （）
    let archSteps = 12; // ，
    for (let j = 0; j <= archSteps; j++) {
      let t = j / archSteps;
      
      let archY = archStartY + (archEndY - archStartY) * t;
      let archHeight = sin(PI * t) * 35; 
      // bridge
      for (let side = -1; side <= 1; side += 2) {
        push();
        //  - bridge，
        let sideOffset = (bridgeWidth/2 - scl*0.5) * side;
        translate(bridgeX + sideOffset, archY, waterLevel + bridgeLevel/2 + archHeight);
        
        
        fill(darkStoneColor);
        box(scl*1.2, scl*0.8, bridgeLevel - archHeight*2);
        pop();
      }
      
      //  - 
      if (j % 3 === 0) {
        push();
        translate(bridgeX, archY, waterLevel + bridgeLevel/2 + archHeight);
        fill(stoneColor);
        box(bridgeWidth, scl*0.8, scl*0.8);
        pop();
      }
    }
  }
  
  // bridgebridgestep - 
  fill(stoneColor);
  
  // northstep - bridge
  let northStepWidth = bridgeWidth * 1.3;
  let northStepDepth = scl * bridge2.stepSize;
  let northStepY = riverY - bridgeLength/2 - northStepDepth/2;
  let northStepHeight = bridge2.northStepHeight - waterLevel;
  
  push();
  translate(bridgeX, northStepY, waterLevel);
  
  // step，
  bridge2.northStepX = bridgeX / scl;
  bridge2.northStepY = northStepY / scl;
  bridge2.northStepWidth = northStepWidth / scl;
  bridge2.northStepDepth = northStepDepth / scl;
  bridge2.northStepRealHeight = bridge2.northStepHeight + bridge2.stepTopOffset;
  
  // step
  
  fill(darkStoneColor);
  box(northStepWidth, northStepDepth, 15);
  
  
  translate(0, 0, 7.5 + northStepHeight/2 - 7.5);
  fill(stoneColor);
  box(northStepWidth, northStepDepth, northStepHeight - 15);
  
  
  translate(0, 0, (northStepHeight - 15)/2 + 7.5 + bridge2.stepTopOffset/2);
  fill(lightStoneColor);
  box(northStepWidth - 8, northStepDepth - 8, bridge2.stepTopOffset);
  pop();
  
  // southstep - bridge
  let southStepWidth = bridgeWidth * 1.3;
  let southStepDepth = scl * bridge2.stepSize;
  let southStepY = riverY + bridgeLength/2 + southStepDepth/2;
  let southStepHeight = bridge2.southStepHeight - waterLevel;
  
  push();
  translate(bridgeX, southStepY, waterLevel);
  
  // step，
  bridge2.southStepX = bridgeX / scl;
  bridge2.southStepY = southStepY / scl;
  bridge2.southStepWidth = southStepWidth / scl;
  bridge2.southStepDepth = southStepDepth / scl;
  bridge2.southStepRealHeight = bridge2.southStepHeight + bridge2.stepTopOffset;
  
  // step 
  
  fill(darkStoneColor);
  box(southStepWidth, southStepDepth, 15);
  
  
  translate(0, 0, 7.5 + southStepHeight/2 - 7.5);
  fill(stoneColor);
  box(southStepWidth, southStepDepth, southStepHeight - 15);
  
  
  translate(0, 0, (southStepHeight - 15)/2 + 7.5 + bridge2.stepTopOffset/2);
  fill(lightStoneColor);
  box(southStepWidth - 8, southStepDepth - 8, bridge2.stepTopOffset);
  pop();
  
  // bridge - bridgebridge，bridge
  // on/at
  let plankSpacing = bridgeLength / bridge2.planksCount;
  
  for (let i = 0; i < bridge2.planksCount; i++) {
    let t = i / (bridge2.planksCount - 1); // 0to1，bridgeup/above
    let plankY = (riverY - bridgeLength/2) + i * plankSpacing + plankSpacing/2;
    
    //  - 
    let archHeight = sin(PI * t) * bridgeMaxHeight * 0.3; 
    let plankHeight = bridgeLevel + archHeight;
    
    
    let randomShade = random(-15, 15);
    fill(color(130 + randomShade, 130 + randomShade, 130 + randomShade));
    
    //  - 
    push();
    translate(bridgeX, plankY, plankHeight + 2);
    
    rotateX(0);
    box(bridgeWidth, plankSpacing * 0.95, 6); // bridgebridgebridge
    pop();
    
    
    if (i % 3 === 1) {
      push();
      translate(bridgeX, plankY, plankHeight + 5);
      fill(lightStoneColor);
      box(bridgeWidth - 10, plankSpacing * 0.3, 1);
      pop();
    }
  }
  
  // bridge - ，
  let railingHeight = bridge2.railingHeight;
  
  
  let eastEdge = bridgeX + (bridgeWidth/2) - scl*0.6;
  let westEdge = bridgeX - (bridgeWidth/2) + scl*0.6;
  
  
  fill(stoneColor);
  let numPosts = 8; 
  for (let i = 0; i <= numPosts; i++) {
    let t = i / numPosts;
    let postY = riverY - bridgeLength/2 + bridgeLength * t;
    let archHeight = sin(PI * t) * bridgeMaxHeight * 0.3;
    let postHeight = railingHeight;
    
    
    push();
    translate(eastEdge, postY, bridgeLevel + archHeight + postHeight/2 + 2);
    fill(stoneColor);
    box(scl*1.0, scl*1.0, postHeight);
    
    
    translate(0, 0, postHeight/2 + 2);
    fill(lightStoneColor);
    box(scl*1.2, scl*1.2, 4);
    pop();
    
    
    push();
    translate(westEdge, postY, bridgeLevel + archHeight + postHeight/2 + 2);
    fill(stoneColor);
    box(scl*1.0, scl*1.0, postHeight);
    
    
    translate(0, 0, postHeight/2 + 2);
    fill(lightStoneColor);
    box(scl*1.2, scl*1.2, 4);
    pop();
    
    
    if (i < numPosts) {
      let nextT = (i+1) / numPosts;
      let nextY = riverY - bridgeLength/2 + bridgeLength * nextT;
      let nextArchHeight = sin(PI * nextT) * bridgeMaxHeight * 0.3;
      
      
      let midY = (postY + nextY) / 2;
      let midArchHeight = (archHeight + nextArchHeight) / 2;
      
      
      push();
      translate(eastEdge, midY, bridgeLevel + midArchHeight + railingHeight*0.7 + 2);
      fill(stoneColor);
      box(scl*0.8, (nextY - postY) * 0.8, railingHeight*0.4);
      pop();
      
      
      push();
      translate(westEdge, midY, bridgeLevel + midArchHeight + railingHeight*0.7 + 2);
      fill(stoneColor);
      box(scl*0.8, (nextY - postY) * 0.8, railingHeight*0.4);
      pop();
    }
  }
  
  pop();
}

// Draw boat item
function drawBoatItem() {
  // If，
  if (boatItem.collected) {
    // ，
    if (frameCount % 60 === 0) {
      console.log(`【】 - : ${boatItem.collected}, : ${emergency.active}`);
    }
    return;
  }
  
  // If，
  if (emergency.active && emergency.boatRideActive) {
    return;
  }
  
  push();
  
  
  boatItem.bobHeight = sin(frameCount * 0.05) * 5;
  boatItem.rotation = sin(frameCount * 0.02) * 0.1;
  boatItem.glowIntensity = (sin(frameCount * 0.1) * 0.5 + 0.5) * 255;
  
  
  translate(boatItem.gridX * scl, boatItem.gridY * scl, boatItem.height + boatItem.bobHeight);
  
  
  rotateZ(frameCount * 0.01);
  rotateX(boatItem.rotation);
  
  
  // if (!emergency.active) {
  //   noStroke();
  //   fill(255, 250, 150, boatItem.glowIntensity * 0.4);
  //   sphere(boatItem.size * 0.8);
  //   fill(255, 240, 100, boatItem.glowIntensity * 0.6);
  //   sphere(boatItem.size * 0.6);
  // }
  
  push();
  fill(80, 120, 220); 
  noStroke();
  push();
  rotateX(PI/2);
  ellipsoid(boatItem.size * 0.8, boatItem.size * 1.2, boatItem.size * 0.4);
  pop();
  fill(250, 250, 250);
  push();
  translate(0, 0, boatItem.size * 0.2);
  rotateX(PI/2);
  ellipsoid(boatItem.size * 0.7, boatItem.size * 0.8, boatItem.size * 0.3);
  pop();
  fill(255, 180, 180); 
  push();
  translate(0, 0, boatItem.size * 0.7);
  fill(150, 100, 50);
  cylinder(boatItem.size * 0.05, boatItem.size * 1.2, 8, 1);
  fill(255, 180, 180);
  push();
  translate(boatItem.size * 0.4, 0, boatItem.size * 0.3);
  beginShape();
  vertex(0, 0, 0);
  vertex(0, 0, boatItem.size * 0.8);
  vertex(boatItem.size * 0.8, 0, 0);
  endShape(CLOSE);
  pop();
  fill(255, 220, 100);
  push();
  translate(0, 0, boatItem.size * 0.8);
  rotateY(HALF_PI);
  plane(boatItem.size * 0.4, boatItem.size * 0.3);
  pop();
  pop();
  fill(255, 100, 100); 
  push();
  translate(boatItem.size * 0.4, boatItem.size * 0.4, boatItem.size * 0.3);
  torus(boatItem.size * 0.15, boatItem.size * 0.05, 12, 8);
  pop();
  for (let i = -2; i <= 2; i++) {
    fill(220, 220, 220);
    push();
    translate(i * boatItem.size * 0.3, boatItem.size * 0.6, boatItem.size * 0.3);
    box(boatItem.size * 0.1, boatItem.size * 0.05, boatItem.size * 0.1);
    pop();
    push();
    translate(i * boatItem.size * 0.3, -boatItem.size * 0.6, boatItem.size * 0.3);
    box(boatItem.size * 0.1, boatItem.size * 0.05, boatItem.size * 0.1);
    pop();
  }
  pop(); 
  // （）
  if (!emergency.active) {
    push();
    // up/above，
    translate(0, 0, boatItem.size * 0.5);
    noStroke();
    
    
    rotateX(HALF_PI);
    rotateZ(frameCount * 0.02);
    
    
    fill(255, 250, 150, boatItem.glowIntensity * 0.6);
    torus(boatItem.size * 1.2, boatItem.size * 0.12, 32, 12);
    
    
    fill(255, 240, 100, boatItem.glowIntensity * 0.8);
    torus(boatItem.size * 1.0, boatItem.size * 0.08, 24, 8);
    pop();
  }
  
  pop(); 
}

  // Update emergency state
function updateEmergencyState() {
  if (!emergency.active) return;
  
  // If，to
  if (boatItem.collected && followCamera) {
    centerFreeViewOnPumpkin();
    console.log("【】：");
    addFloatingText("Pumpkin Saved!", width/2, height/2, 100, 3);
  }
  // If，on/at10to
  else if (followCamera && emergency.timer >= 10) {
    centerFreeViewOnPumpkin();
    console.log("10：");
    addFloatingText("10！", width/2, height/2, 100, 2);
  }
  
  
  if (frameCount % 30 === 0) {
    console.log(`: ${followCamera ? "" : ""}, : ${emergency.timer.toFixed(1)}`);
  }
  
  
  emergency.timer += 1/frameRate();
  
  
  if (frameCount % 30 === 0) {
    console.log(`: =${emergency.timer.toFixed(1)}, =${emergency.waterLevel.toFixed(1)}, =${pumpkinMan.height.toFixed(1)}`);
  }
  
  // Ifto，
  // Checkwhetherto
  // Note: if boat is collected, we do not want to reset game when reaching wall height, because water level should stop at wall height
  if (emergency.waterLevel >= emergency.maxWaterLevel - 10 && !boatItem.collected) {
    console.log("【】，");
    
    // If，
    if (emergency.pumpkinSaved) {
      addFloatingText("Rescue Success!", width/2, height/2, 100, 3);
      console.log("【】！");
    } else {
      addFloatingText("Game Over", width/2, height/2, 100, 3);
      console.log("【】");
    }
    
    // 4，to
    setTimeout(function() {
      console.log("【】");
      resetAllGameState();
    }, 4000);
    
    
    emergency.maxWaterLevel = 999999;
    return;
  }
  
  // Ifto，
  if (boatItem.collected && emergency.waterLevel >= emergency.maxWaterLevel - 5 && !emergency.rescueMessageShown) {
    addFloatingText("Rescue Success! ", width/2, height/2, 100, 3);
    console.log("【】，，！");
    emergency.rescueMessageShown = true; 
  }
  
  // Update water level - if boat is collected start rising immediately, otherwise wait 10 seconds before starting rise animation
  let progress = 0;
  if (boatItem.collected) {
    // If，up/above，to
    if (emergency.waterLevel >= emergency.maxWaterLevel) {
      progress = 1; // to100%，
    } else {
      progress = min(emergency.timer / (emergency.maxTime * 0.7), 1);
    }
  } else if (emergency.timer < 10) {
    progress = 0; // 10up/above
  } else {
    // 10up/above（）
    progress = min((emergency.timer - 10) / (emergency.maxTime * 0.7), 1);
  }
  
  // Ensure there is starting water level, if not set a default low position
  if (typeof emergency.waterStartLevel === 'undefined') {
    
    let minHeight = Infinity;
    for (let x = 0; x < cols; x += 5) {
      for (let y = 0; y < rows; y += 5) {
        if (terrain[x][y] < minHeight) {
          minHeight = terrain[x][y];
        }
      }
    }
    
    // on/at
    emergency.waterStartLevel = minHeight - 20;
    console.log("【】，:", emergency.waterStartLevel);
  }
  
  // Calculate target water level - if boat is collected, limit water level height; otherwise rise to wall height
  let maxAllowedWaterLevel = boatItem.collected ? emergency.maxWaterLevel : emergency.maxWaterLevel;
  if (boatItem.collected) {
    // ：up/aboveto，up/above
    maxAllowedWaterLevel = emergency.maxWaterLevel;
  } else {
    // ：up/above（up/above）
    maxAllowedWaterLevel = emergency.maxWaterLevel + 200; // 200
  }
  let targetWaterLevel = lerp(emergency.waterStartLevel, maxAllowedWaterLevel, progress);
  
  // ，
  if (frameCount % 30 === 0) {
    console.log(`: =${emergency.waterLevel.toFixed(1)}, 
      =${emergency.waterStartLevel.toFixed(1)}, 
      =${targetWaterLevel.toFixed(1)}, 
      =${maxAllowedWaterLevel.toFixed(1)},
      =${boatItem.collected},
      =${(progress*100).toFixed(1)}%`);
  }
  
  // up/above - 
  let waterRiseSpeed = boatItem.collected ? 0.05 : 0.03; // up/above，
  
  // ，
  if (frameCount % 30 === 0) {
    // ，
    emergency.waterPulse = 1; 
  } else {
    
    if (emergency.waterPulse > 0) {
      emergency.waterPulse *= 0.95;
    }
  }
  
  // to，
  let pulseEffect = (emergency.waterPulse || 0) * sin(frameCount * 0.1) * 0.5;
  
  // up/above，
  let newWaterLevel = lerp(emergency.waterLevel, targetWaterLevel, waterRiseSpeed) + pulseEffect;
  
  // If，
  if (boatItem.collected) {
    let limitedLevel = min(newWaterLevel, emergency.maxWaterLevel);
    if (newWaterLevel > emergency.maxWaterLevel && frameCount % 60 === 0) {
      console.log(`【】， ${emergency.maxWaterLevel.toFixed(1)}， ${newWaterLevel.toFixed(1)}`);
    }
    emergency.waterLevel = limitedLevel;
  } else {
    emergency.waterLevel = newWaterLevel;
  }
  
  
  if (boatItem.collected) {
    emergency.pumpkinSaved = true;  
  }
  
  // Ifsouth，southon/atup/above
  if (emergency.pumpkinSaved) {
    // Update rescue boat - on/atup/above，
    let targetBoatHeight = emergency.waterLevel + 15;
    
    emergency.boatHeight = lerp(emergency.boatHeight, targetBoatHeight, 0.05);
    
    // ，on/atup/above
    if (!emergency.boatOffsetX) emergency.boatOffsetX = 0;
    if (!emergency.boatOffsetY) emergency.boatOffsetY = 0;
    
    
    emergency.boatOffsetX = sin(frameCount * 0.02) * 0.3;
    emergency.boatOffsetY = cos(frameCount * 0.025) * 0.3;
    
    // southon/atup/above，
    pumpkinMan.gridX = emergency.boatX + emergency.boatOffsetX;
    pumpkinMan.gridY = emergency.boatY + emergency.boatOffsetY;
    
    // up/above
    let pumpkinBoatOffset = sin(frameCount * 0.08) * 2; // up/above
    pumpkinMan.height = emergency.boatHeight + 15 + pumpkinBoatOffset;
    
    // on/at
    // up/above
    let waterRisePercent = map(emergency.waterLevel, 
                               emergency.waterStartLevel, 
                               emergency.maxWaterLevel, 
                               0, 100);
    
    // 25%，
    let currentMilestone = floor(waterRisePercent / 25);
    if (currentMilestone !== emergency.lastMilestone) {
      emergency.lastMilestone = currentMilestone;
      
      
      let messages = [
        "...",
        "...",
        "...",
        "..."
      ];
      
      if (currentMilestone >= 0 && currentMilestone < messages.length) {
        // on/atup/above
        addFloatingText(messages[currentMilestone], 
                       emergency.boatX * scl, 
                       emergency.boatY * scl, 
                       emergency.boatHeight + 70, 3);
        
        console.log(`: ${floor(waterRisePercent)}%`);
      }
    }
  }
  
  // Ifsouth（），
  // on/at10
  if (!emergency.pumpkinSaved && emergency.waterLevel > pumpkinMan.height && emergency.timer >= 10) {
    console.log("，10，！");
    emergency.fragmentTimer += 1/frameRate();
    
    if (!fragmentActive) {
      startFragmentingTerrain();
      
      // 不强制切换到跟随摄像头，保持自由视角
      console.log("【】，");
      addFloatingText("！", width/2, height/2, 100, 2);
    }
  }
  
  // Checkup/abovewhether (95%up/above)
  let waterRisePercent = map(emergency.waterLevel, 
                          emergency.waterStartLevel, 
                          emergency.maxWaterLevel, 
                          0, 100);
  if (waterRisePercent >= 95 && !followCamera) {
    // 不强制切换到跟随摄像头，保持自由视角
    console.log("【】，");
    addFloatingText("！", width/2, height/2, 100, 2);
  }
}

// Update free camera position (based on spherical coordinates)
function updateFreeCameraPosition() {
  // Scene center (terrain center)
  freeCam.targetX = cols * scl / 2;
  freeCam.targetY = rows * scl / 2;
  freeCam.targetZ = -100; // Look below ground level, combined with overhead angle to fully view terrain and water rising
  
  // Calculate camera position from spherical coordinates
  freeCam.x = freeCam.targetX + freeCam.distance * cos(freeCam.angleVertical) * cos(freeCam.angleHorizontal);
  freeCam.y = freeCam.targetY + freeCam.distance * cos(freeCam.angleVertical) * sin(freeCam.angleHorizontal);
  freeCam.z = freeCam.targetZ + freeCam.distance * sin(freeCam.angleVertical);
}

// Switch to free view and show terrain water rise animation
function centerFreeViewOnPumpkin() {
  followCamera = false; // Switch to free view
  
  // Set appropriate initial view for watching water rise - overhead view from high position
  freeCam.distance = 1000;  // Increase distance for better panoramic view
  freeCam.angleHorizontal = 0;
  freeCam.angleVertical = 0.5; // Upward angle for different perspective
  
  console.log(`【紧急状态】切换到自由视角，准备观看水位上升动画`);
}

// Setup rescue boat
function setupRescueBoat() {
  console.log("【】");
  
  // If，
  if (boatItem.collected) {
    emergency.boatX = boatItem.gridX;
    emergency.boatY = boatItem.gridY;
    emergency.boatHeight = boatItem.height;
  } else {
    // southcurrently
    emergency.boatX = pumpkinMan.gridX;
    emergency.boatY = pumpkinMan.gridY;
    emergency.boatHeight = pumpkinMan.height;
  }
  
  
  emergency.boatLiftStart = emergency.boatHeight;
  
  // Setup rescue boat
  emergency.boatVisible = true;
  emergency.boatRideActive = true;
  
  // southtoup/above
  pumpkinMan.gridX = emergency.boatX;
  pumpkinMan.gridY = emergency.boatY;
  pumpkinMan.height = emergency.boatHeight + 45; // southon/atup/above
  
  // southcurrently
  emergency.lastPumpkinX = pumpkinMan.gridX;
  emergency.lastPumpkinY = pumpkinMan.gridY;
  
  console.log(`【】 - : (${emergency.boatX.toFixed(1)}, ${emergency.boatY.toFixed(1)}, : ${emergency.boatHeight.toFixed(1)})`);
}

// Update rescue boat
function updateRescueBoat() {
  // +10
  let targetHeight = emergency.waterLevel + 10;
  // on/atup/above
  if (typeof emergency.boatLiftStart === 'undefined') {
    emergency.boatLiftStart = emergency.boatHeight;
  }
  
  // up/above，
  let liftSpeed = 0.04; 
  emergency.boatHeight = lerp(emergency.boatHeight, targetHeight, liftSpeed);
  
  // ，on/atup/above
  let boatBobX = sin(frameCount * 0.05) * 0.2;
  let boatBobY = sin(frameCount * 0.03) * 0.2;
  
  // ，
  emergency.boatOffsetX = sin(frameCount * 0.02) * 0.3;
  emergency.boatOffsetY = cos(frameCount * 0.025) * 0.3;
  
  // southon/at，
  pumpkinMan.gridX = emergency.boatX + (emergency.boatOffsetX || 0);
  pumpkinMan.gridY = emergency.boatY - 4 + (emergency.boatOffsetY || 0); // 4，
  
  // southon/atup/above，
  let pumpkinBoatOffset = sin(frameCount * 0.08) * 2; // up/above
  pumpkinMan.height = emergency.boatHeight + 60 + pumpkinBoatOffset; // ，
  
  
  if (frameCount % 90 === 0) { // 3
    addFloatingText("...", emergency.boatX * scl, emergency.boatY * scl, emergency.boatHeight + 60, 2);
  }
}

// Check if pumpkin collected boat item
function checkBoatItemCollection() {
  // If，
  if (boatItem.collected) {
    // ，on/at
    if (frameCount % 60 === 0) {
      console.log("，");
    }
    return;
  }
  
  // southdistance
  let dist2D = dist(pumpkinMan.gridX, pumpkinMan.gridY, boatItem.gridX, boatItem.gridY);
  let distHeight = abs(pumpkinMan.height - boatItem.height);
  
  // on/at，
  if (dist2D < 10) {
    console.log(`【】: 2D=${dist2D.toFixed(2)}, =${distHeight.toFixed(2)}`);
  }
  
  // Ifsouth，
  if (dist2D < 3 && distHeight < 50) {
    console.log("【】");
    
    
    boatItem.collected = true;
    
    // "+1"，on/atsouthup/above6
    addFloatingText("+1", pumpkinMan.gridX * scl, pumpkinMan.gridY * scl, pumpkinMan.height + 40, 6);
    console.log("【】+1");
    
    
    // emergency.active = true;
    // emergency.pumpkinSaved = true;
    // emergency.boatRideActive = true;
    
    
    emergency.boatX = boatItem.gridX;
    emergency.boatY = boatItem.gridY;
    emergency.boatHeight = boatItem.height;
    
    // currently
    if (emergency.active) {
      // ，southup/above
      console.log("【】，");
      emergency.pumpkinSaved = true;
      emergency.boatRideActive = true;
      emergency.boatVisible = true;
      
      // to
      centerFreeViewOnPumpkin();
      console.log("【】");
      
      // "south"
      addFloatingText("Pumpkin Saved!", width/2, height/2, 100, 4);
      
      // southto，
      pumpkinMan.gridX = boatItem.gridX;
      pumpkinMan.gridY = boatItem.gridY - 4; // 4
      pumpkinMan.height = boatItem.height + 60; // south，
      
      // Setup rescue boat
      setupRescueBoat();
      
      // ：on/atupdateEmergencyState()，
      
      console.log(`【】 ${emergency.waterLevel.toFixed(1)}`);
    } else {
      // ，P
      console.log("【】，P");
      
      // ，P
      addFloatingText("！ P ", pumpkinMan.gridX * scl, pumpkinMan.gridY * scl, pumpkinMan.height + 60, 4);
    }
    
    console.log(`【】，:(${boatItem.gridX}, ${boatItem.gridY}), :${emergency.active}`);
  }
}

// Draw emergency effects
function drawEmergencyEffects() {
  if (!emergency.active) return;
  
  // Confirm again: if boat collected but not marked as saved, mark immediately
  if (boatItem.collected && !emergency.pumpkinSaved) {
    console.log("：，");
    emergency.pumpkinSaved = true;
    
    // If，
    if (!emergency.boatRideActive) {
      console.log("：，");
      emergency.boatRideActive = true;
      emergency.boatVisible = true;
      
      // to
      centerFreeViewOnPumpkin();
      console.log("【】");
      
      // "south"
      addFloatingText("Pumpkin Saved!", width/2, height/2, 100, 4);
      
      // southto，
      pumpkinMan.gridX = boatItem.gridX;
      pumpkinMan.gridY = boatItem.gridY - 4; // 4
      pumpkinMan.height = boatItem.height + 60; // south，
      
      setupRescueBoat();
    }
  }
  
  // Draw rising water
  drawRisingWater();
  
  
  if (boatItem.collected) {
    
    emergency.pumpkinSaved = true;
    emergency.boatRideActive = true;
    emergency.boatVisible = true;
    
    
    if (frameCount % 30 === 0) {
      console.log(`【】=${boatItem.collected}, =${emergency.boatVisible}, =${emergency.boatRideActive}`);
    }
    
    // If，
    if (!emergency.boatX || !emergency.boatY) {
      console.log("【】，");
      setupRescueBoat();
    }
    
    // Draw rescue boat
    drawRescueBoat();
    
    // on/atup/above ()
    if (frameCount % 30 === 0) { 
      addFloatingText("Safe rising...", emergency.boatX * scl, emergency.boatY * scl, emergency.boatHeight + 60, 2);
    }
  }
  
  // If，south，
  if (emergency.fragmentTimer > 0 && !emergency.pumpkinSaved && !boatItem.collected) {
    drawFragmentingTerrain();
  } else if (fragmentActive && (emergency.pumpkinSaved || boatItem.collected)) {
    // If，
    console.log("，");
    fragmentActive = false;
    fragmentPieces = [];
  }
  
  // Draw emergency timer
  drawEmergencyTimer();
}

// Draw rising water - up/above
function drawRisingWater() {
  
  
  if (flooded === null) {
    flooded = Array.from({length: cols}, () => Array(rows).fill(false));
    floodQueue = [];
    
    
    // ：
    let rx = Math.floor(bridge.centerCol);
    let ry = Math.floor(bridge.riverRow);
    flooded[rx][ry] = true;
    floodQueue.push({x: rx, y: ry});
    
    // ，
    for (let x = 0; x < cols; x += Math.floor(cols / 10)) {
      for (let y = 0; y < rows; y += Math.floor(rows / 10)) {
        if (!flooded[x][y]) {
          flooded[x][y] = true;
          floodQueue.push({x: x, y: y});
        }
      }
    }
    
    
    for (let x = 0; x < cols; x += Math.floor(cols / 20)) {
      if (!flooded[x][0]) {
        flooded[x][0] = true;
        floodQueue.push({x: x, y: 0});
      }
      if (!flooded[x][rows-1]) {
        flooded[x][rows-1] = true;
        floodQueue.push({x: x, y: rows-1});
      }
    }
    
    for (let y = 0; y < rows; y += Math.floor(rows / 20)) {
      if (!flooded[0][y]) {
        flooded[0][y] = true;
        floodQueue.push({x: 0, y: y});
      }
      if (!flooded[cols-1][y]) {
        flooded[cols-1][y] = true;
        floodQueue.push({x: cols-1, y: y});
      }
    }
    
    console.log("", floodQueue.length, "");
  }
  
  
  let maxWaterLevel = walls[0].height;
  
  // Ensure water level has a reasonable starting value (if not initialized)
  
  if (typeof emergency.waterStartLevel === 'undefined') {
    
    let minHeight = Infinity;
    
    
    for (let x = 0; x < cols; x += 5) {
      for (let y = 0; y < rows; y += 5) {
        if (terrain[x][y] < minHeight) {
          minHeight = terrain[x][y];
        }
      }
    }
    
    // on/at
    emergency.waterStartLevel = minHeight - 20;
    emergency.waterLevel = emergency.waterStartLevel;
    console.log(":", emergency.waterStartLevel);
  }
  
  // ：up/abovetoupdateEmergencyState()，
  let waterZ = emergency.waterLevel;
  
  
  if (frameCount % 30 === 0) {
    let waterProgress = map(emergency.waterLevel, emergency.waterStartLevel, maxWaterLevel, 0, 100);
    console.log(`: ${emergency.waterLevel.toFixed(1)}, : ${waterProgress.toFixed(1)}%, : ${pumpkinMan.height.toFixed(1)}`);
  }

  // flood - ，
  let maxExpansionsPerFrame = 200;
  let expansionCount = 0;
  let newQueue = [];
  
  // ，
  floodQueue.sort((a, b) => {
    let aDist = dist(a.x, a.y, cols/2, rows/2);
    let bDist = dist(b.x, b.y, cols/2, rows/2);
    return aDist - bDist;
  });
  
  for (let i = 0; i < floodQueue.length && expansionCount < maxExpansionsPerFrame; i++) {
    let {x, y} = floodQueue[i];
    
    // ，
    let directions = [
      [1,0], [-1,0], [0,1], [0,-1],
      [1,1], [1,-1], [-1,1], [-1,-1]
    ];
    
    for (let [dx, dy] of directions) {
      let nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !flooded[nx][ny] && terrain[nx][ny] < waterZ) {
        flooded[nx][ny] = true;
        newQueue.push({x: nx, y: ny});
        expansionCount++;
      }
    }
  }
  
  // ，
  for (let i = maxExpansionsPerFrame; i < floodQueue.length; i++) {
    newQueue.push(floodQueue[i]);
  }
  
  floodQueue = newQueue;

  // ===  ===
  // currently
  push();
  
  // on/atsouth
  if (followCamera) {
    // ==== south ====
    // on/atsouth，
    // camera()，
    
    
    noStroke();
    
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        let terrainHeight = terrain[x][y];
        if (terrainHeight < waterZ) {
          
          let waterDepth = waterZ - terrainHeight;
          
          
          let waterAlpha = map(waterDepth, 0, 30, 100, 180);
          waterAlpha = constrain(waterAlpha, 100, 180);
          
          
          push();
          translate(x * scl, y * scl, terrainHeight + waterDepth/2);
          fill(30, 100, 255, waterAlpha);
          box(scl * 1.01, scl * 1.01, waterDepth);
          pop();
          
          
          if (random() < 0.001) { 
            push();
            translate(x * scl, y * scl, waterZ + random(2));
            fill(255, 255, 255, 100);
            sphere(random(1, 2));
            pop();
          }
        }
      }
    }
    
    // on/atDraw rescue boat
    if (boatItem.collected && emergency.pumpkinSaved) {
      // on/atup/aboveDraw pumpkin man
      let boatX = pumpkinMan.gridX;
      let boatY = pumpkinMan.gridY + 4; 
      let boatZ = waterZ + 10; // on/atup/above
      
      translate(boatX * scl, boatY * scl, boatZ);
      
      //  - 
      
      fill(100, 140, 240);
      noStroke();
      
      
      push();
      rotateX(PI/2);
      ellipsoid(boatItem.size * 2.5, boatItem.size * 4, boatItem.size * 1.2);
      pop();
      
      
      fill(240, 240, 240);
      push();
      translate(0, 0, boatItem.size * 0.8);
      rotateX(PI/2);
      ellipsoid(boatItem.size * 2, boatItem.size * 2.8, boatItem.size * 0.8);
      pop();
      
      
      fill(255, 200, 200);
      push();
      translate(0, -boatItem.size * 1, boatItem.size * 1.2);
      
      
      fill(120, 80, 40);
      cylinder(boatItem.size * 0.2, boatItem.size * 3, 8, 1);
      
      
      fill(255, 200, 200);
      push();
      translate(boatItem.size * 1, 0, boatItem.size * 1);
      beginShape();
      vertex(0, 0, 0);
      vertex(0, 0, boatItem.size * 2);
      vertex(boatItem.size * 2, 0, 0);
      endShape(CLOSE);
      pop();
      
      
      fill(255, 220, 100);
      push();
      translate(0, 0, boatItem.size * 2.8);
      rotateY(HALF_PI);
      plane(boatItem.size * 0.8, boatItem.size * 0.6);
      pop();
      
      pop();
      
      // southon/atup/above
      pumpkinMan.height = boatZ + 55;
    }
  } else {
    // ====  ====
    // Remove legacy transform system, now use camera() function for unified view handling
    // Water rendering needs no extra transforms since camera() handles the view
    
    
    
    noStroke();
    
    
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        let terrainHeight = terrain[x][y];
        if (terrainHeight < waterZ) {
          
          let waterDepth = waterZ - terrainHeight;
          
          
          let waterAlpha = map(waterDepth, 0, 30, 100, 180);
          waterAlpha = constrain(waterAlpha, 100, 180);
          
          
          push();
          translate(x * scl, y * scl, terrainHeight + waterDepth/2);
          fill(30, 100, 255, waterAlpha);
          box(scl * 1.01, scl * 1.01, waterDepth);
          pop();
        }
      }
    }
    
    // ：
    // on/at
    push();
    
    
    let planeWidth = cols * scl * 1.2;
    let planeHeight = rows * scl * 1.2;
    
    // on/atup/above - 
    translate(cols * scl / 2, rows * scl / 2, waterZ);
    rotateX(PI); // 180
    
    
    let waveTime = frameCount * 0.05;
    let waveAmp = 5 + sin(waveTime * 0.2) * 2;
    
    //  - 95%，
    fill(30, 100, 255, 90); // 120to90
    plane(planeWidth * 0.95, planeHeight * 0.95);
    
    //  - ，
    fill(255, 255, 255, 30 + sin(waveTime) * 10); // 50to30
    plane(planeWidth * 0.9 + sin(waveTime) * waveAmp, 
          planeHeight * 0.9 + cos(waveTime * 0.7) * waveAmp);
    
    pop();
    
    // （、）
    if (emergency.active) {
      for (let i = 0; i < 3; i++) {
        // up/above
        let randX = random(5, cols-5);
        let randY = random(5, rows-5);
        let terrainH = terrain[floor(randX)][floor(randY)];
        
        // on/at
        if (terrainH < waterZ - 10) {
          push();
          translate(randX * scl, randY * scl, waterZ + random(-1, 1));
          fill(255, 255, 255, random(100, 150));
          sphere(random(0.5, 2));
          pop();
        }
      }
      
      // toup/above
      if (boatItem.collected && emergency.pumpkinSaved && emergency.boatVisible) {
        push();
        
        
        let boatX = emergency.boatX;
        let boatY = emergency.boatY;
        let floatX = sin(frameCount * 0.03) * 15;
        let floatY = cos(frameCount * 0.04) * 15;
        
        
        let boatOffsetX = (emergency.boatOffsetX || 0) * scl;
        let boatOffsetY = (emergency.boatOffsetY || 0) * scl;
        
        translate(boatX * scl + floatX + boatOffsetX, 
                 boatY * scl + floatY + boatOffsetY, 
                 waterZ + 10); // on/atup/above
        
        
        let bobX = sin(frameCount * 0.05) * 0.15;
        let bobY = cos(frameCount * 0.04) * 0.15;
        rotateX(bobX);
        rotateY(bobY);
        rotateZ(sin(frameCount * 0.02) * 0.05);
        
        
        fill(100, 140, 240);
        noStroke();
        
        
        push();
        rotateX(PI/2);
        ellipsoid(boatItem.size * 2.5, boatItem.size * 4, boatItem.size * 1.2);
        pop();
        
        
        fill(240, 240, 240);
        push();
        translate(0, 0, boatItem.size * 0.8);
        rotateX(PI/2);
        ellipsoid(boatItem.size * 2, boatItem.size * 2.8, boatItem.size * 0.8);
        pop();
        
        
        fill(255, 200, 200);
        push();
        translate(0, -boatItem.size * 1, boatItem.size * 1.2);
        
        
        fill(120, 80, 40);
        cylinder(boatItem.size * 0.2, boatItem.size * 3, 8, 1);
        
        
        fill(255, 200, 200);
        push();
        translate(boatItem.size * 1, 0, boatItem.size * 1);
        beginShape();
        vertex(0, 0, 0);
        vertex(0, 0, boatItem.size * 2);
        vertex(boatItem.size * 2, 0, 0);
        endShape(CLOSE);
        pop();
        
        
        fill(255, 220, 100);
        push();
        translate(0, 0, boatItem.size * 2.8);
        rotateY(HALF_PI);
        plane(boatItem.size * 0.8, boatItem.size * 0.6);
        pop();
        
        pop();
        
        
        for (let i = -3; i <= 3; i++) {
          fill(220, 220, 220);
          push();
          translate(i * boatItem.size * 0.6, boatItem.size * 1.5, boatItem.size * 0.8);
          box(boatItem.size * 0.3, boatItem.size * 0.3, boatItem.size * 0.6);
          pop();
        }
        
        // on/atsouth
        // south，to
        // Draw pumpkin man，drawPumpkinMan
        
        emergency.boatHeight = waterZ + 10;
        // southon/at
        pumpkinMan.gridY = emergency.boatY - 4; // 4
        pumpkinMan.height = emergency.boatHeight + 80; // ，on/atup/above
        
        pop();
      }
    }
  }
  
  pop(); 
}

// Checkwhether
function isOutOfBounds(x, y) {
  const margin = 2;
  return x < margin || y < margin || x >= cols - margin || y >= rows - margin;
}

// Draw rescue boat
function drawRescueBoat() {
  
  console.log("Draw rescue boat...");
  
  
  if (!emergency.boatVisible || !boatItem.collected) {
    console.log(`【】Draw rescue boat - =${emergency.boatVisible}, =${boatItem.collected}`);
    return;
  }
  
  console.log(`Draw rescue boat :(${emergency.boatX}, ${emergency.boatY}, ${emergency.boatHeight})`);
  
  push();
  
  // Update position
  updateRescueBoat();
  
  //  - 
  let floatX = sin(frameCount * 0.03) * 15;
  let floatY = cos(frameCount * 0.04) * 15;
  
  // ，south
  let offsetX = (emergency.boatOffsetX || 0) * scl;
  let offsetY = (emergency.boatOffsetY || 0) * scl;
  
  translate(emergency.boatX * scl + floatX + offsetX, 
           emergency.boatY * scl + floatY + offsetY, 
           emergency.boatHeight);
  
  // on/at，3
  if (emergency.active && boatItem.collected) {
    scale(3, 3, 3);
  }
  
  // ，，
  let bobX = sin(frameCount * 0.05) * 0.15;
  let bobY = cos(frameCount * 0.04) * 0.15;
  rotateX(bobX);
  rotateY(bobY);
  
  // ，
  rotateZ(sin(frameCount * 0.02) * 0.05);
  
  //  - 
  
  fill(100, 140, 240);
  noStroke();
  
  
  push();
  rotateX(PI/2);
  ellipsoid(boatItem.size * 2.5, boatItem.size * 4, boatItem.size * 1.2);
  pop();
  
  
  fill(240, 240, 240);
  push();
  translate(0, 0, boatItem.size * 0.8);
  rotateX(PI/2);
  ellipsoid(boatItem.size * 2, boatItem.size * 2.8, boatItem.size * 0.8);
  pop();
  
  
  fill(255, 200, 200);
  push();
  translate(0, -boatItem.size * 1, boatItem.size * 1.2);
  
  
  fill(120, 80, 40);
  cylinder(boatItem.size * 0.2, boatItem.size * 3, 8, 1);
  
  
  fill(255, 200, 200);
  push();
  translate(boatItem.size * 1, 0, boatItem.size * 1);
  beginShape();
  vertex(0, 0, 0);
  vertex(0, 0, boatItem.size * 2);
  vertex(boatItem.size * 2, 0, 0);
  endShape(CLOSE);
  pop();
  
  
  fill(255, 220, 100);
  push();
  translate(0, 0, boatItem.size * 2.8);
  rotateY(HALF_PI);
  plane(boatItem.size * 0.8, boatItem.size * 0.6);
  pop();
  
  pop();
  
  
  for (let i = -3; i <= 3; i++) {
    fill(220, 220, 220);
    push();
    translate(i * boatItem.size * 0.6, boatItem.size * 1.5, boatItem.size * 0.8);
    box(boatItem.size * 0.2, boatItem.size * 0.1, boatItem.size * 0.2);
    pop();
    
    push();
    translate(i * boatItem.size * 0.6, -boatItem.size * 1.5, boatItem.size * 0.8);
    box(boatItem.size * 0.2, boatItem.size * 0.1, boatItem.size * 0.2);
    pop();
  }
  
  pop();
}


function drawFragmentingTerrain() {
  
  let fragmentFactor = min(emergency.fragmentTimer / 5, 1);
  
  // on/at，
  // on/at，on/at
  
  
  if (random() < fragmentFactor * 0.1) {
    let x = random(0, cols) * scl;
    let y = random(0, rows) * scl;
    let z = emergency.waterLevel + random(10, 30);
    
    push();
    translate(x, y, z);
    rotateX(random(TWO_PI));
    rotateY(random(TWO_PI));
    rotateZ(random(TWO_PI));
    
    
    fill(140, 120, 80);
    box(random(10, 30), random(10, 30), random(5, 10));
    pop();
  }
}

// Draw emergency timer
function drawEmergencyTimer() {
  // Additional check: if already over 10 seconds but still in follow view, force switch
  if (emergency.timer >= 10 && followCamera) {
    centerFreeViewOnPumpkin();
    console.log("【】10，");
    addFloatingText("！", width/2, height/2, 100, 2);
  }
}



// ：Generate fragment data（Cool upgraded version）
function startFragmentingTerrain() {
  // Check，on/at
  if (emergency.pumpkinSaved || boatItem.collected) {
    console.log("：，");
    return;
  }
  
  fragmentPieces = [];
  let centerX = w / 2;
  let centerY = h / 2;
  let maxDist = 0;
  
  
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let px = x * scl;
      let py = y * scl;
      let distToCenter = dist(px, py, centerX, centerY);
      if (distToCenter > maxDist) maxDist = distToCenter;
    }
  }
  
  console.log("，");
  
  // ，
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let px = x * scl;
      let py = y * scl;
      let pz = terrain[x][y];
      let pos = createVector(px, py, pz);
      let distToCenter = dist(px, py, centerX, centerY);
      let delay = map(distToCenter, 0, maxDist, 0, FRAGMENT_DURATION * 0.5 * 60);
      let baseSpeed = map(distToCenter, 0, maxDist, 1, 3);
      let vel = p5.Vector.sub(pos, createVector(centerX, centerY, 0)).normalize().mult(baseSpeed * random(0.7, 1.3));
      vel.z += random(2, 8);
      let angle = atan2(py - centerY, px - centerX);
      let hueVal = map(angle, -PI, PI, 0, 255);
      let satVal = map(distToCenter, 0, maxDist, 180, 255);
      let briVal = map(distToCenter, 0, maxDist, 255, 180);
      colorMode(HSB, 255);
      let baseColor = color(hueVal, satVal, briVal, 220);
      colorMode(RGB, 255);
      let rot = random(TWO_PI);
      let rotSpeed = random(-0.08, 0.08);
      
      fragmentPieces.push({
        pos: pos.copy(),
        vel: vel.copy(),
        alpha: 255,
        size: scl * 1.2,
        color: baseColor,
        delay: delay,
        rot: rot,
        rotSpeed: rotSpeed,
        age: 0
      });
    }
  }
  
  fragmentActive = true;
  fragmentStartTime = millis();
  fragmentStartFrame = frameCount;
}

// ：Render fragments（Cool upgraded version）
function drawFragmentPieces() {
  let nowFrame = frameCount - fragmentStartFrame;
  for (let piece of fragmentPieces) {
    if (nowFrame < piece.delay) continue; 
    push();
    translate(piece.pos.x, piece.pos.y, piece.pos.z);
    rotateX(piece.rot);
    rotateY(piece.rot * 0.7);
    fill(red(piece.color), green(piece.color), blue(piece.color), piece.alpha);
    noStroke();
    box(piece.size);
    pop();
    
    piece.pos.add(piece.vel);
    piece.vel.mult(0.985); 
    piece.rot += piece.rotSpeed;
    piece.alpha *= 0.985; 
    piece.age++;
  }
}

// Reset all game state
function resetAllGameState() {
  console.log("【】");
  
  
  // Keep current camera mode, don't force reset to follow mode
  // followCamera = true;
  
  
  fragmentActive = false;
  fragmentPieces = [];
  
  // Reset emergency state
  emergency.active = false;
  emergency.timer = 0;
  emergency.fragmentTimer = 0;
  emergency.pumpkinSaved = false;
  emergency.boatRideActive = false;
  emergency.boatVisible = false;
  emergency.waterLevel = bridge.waterLevel || -40;
  emergency.maxWaterLevel = 100;
  emergency.maxTime = 7; // 7
  emergency.rescueMessageShown = false; 
  
  boatItem.collected = false;
  boatItem.active = true;
  
  // south
  pumpkinMan.gridX = 30;
  pumpkinMan.gridY = 30;
  pumpkinMan.rotationY = PI;
  
  
  fountainChallenge.active = false;
  fountainChallenge.timer = 0;
  fountainChallenge.pumpkinTouchedFountain = false;
  fountainChallenge.grayScaleMode = false;
  fountainChallenge.allObjectsFrozen = false;
  
  
  floatingTexts = [];
  
  
  initializeBoatItem();
  updatePumpkinHeight();
  
  
  generateStaticTerrain();
  initializeDecorativeObjects();
  initializeFenceAndSheep();
  
  
  addFloatingText("", width/2, height/2, 100, 2);
  console.log("【】");
}

// Add floating text
function addFloatingText(text, x, y, z, duration) {
  console.log(`【Add floating text】:"${text}", :(${x}, ${y}, ${z}), :${duration}`);
  
  // to
  let newText = {
    text: text,
    x: x,
    y: y, 
    z: z,
    startTime: millis(),
    duration: duration * 1000, 
    alpha: 255,
    size: 60, 
    offsetY: 0,
    color: color(255, 255, 0), 
    id: floatingTexts.length // ID
  };
  
  floatingTexts.push(newText);
  console.log(`【】ID:${newText.id}, :${floatingTexts.length}`);
  
  return newText.id; // ID
}

// Animal sound playing functions
function playAnimalSound(animalType, soundType, animalId) {
  if (!soundSettings.enabled) return;
  
  // Create unique key for this animal
  let soundKey = `${animalType}_${animalId}`;
  
  // Check cooldown
  let currentTime = millis();
  if (soundSettings.lastSoundTime[soundKey] && 
      currentTime - soundSettings.lastSoundTime[soundKey] < soundSettings.soundInterval) {
    return; // Still in cooldown
  }
  
  // Try to play the sound
  try {
    let sound = animalSounds[animalType][soundType];
    if (sound && sound.isLoaded()) {
      sound.setVolume(soundSettings.volume);
      sound.play();
      soundSettings.lastSoundTime[soundKey] = currentTime;
      console.log(`🔊 Playing ${animalType} ${soundType} sound`);
    }
  } catch (error) {
    console.log(`Sound playback error: ${error}`);
  }
}

// Play random animal sound for specific animal type
function playRandomAnimalSound(animalType, animalId) {
  if (!soundSettings.enabled) return;
  
  let sounds = Object.keys(animalSounds[animalType]);
  if (sounds.length > 0) {
    let randomSound = sounds[Math.floor(Math.random() * sounds.length)];
    playAnimalSound(animalType, randomSound, animalId);
  }
}

// Toggle sound system
function toggleAnimalSounds() {
  soundSettings.enabled = !soundSettings.enabled;
  console.log(`Animal sounds ${soundSettings.enabled ? 'enabled' : 'disabled'}`);
  
  // Add visual feedback
  let feedbackText = soundSettings.enabled ? "🔊 Animal Sounds ON" : "🔇 Animal Sounds OFF";
  addFloatingText(feedbackText, pumpkinMan.gridX * scl, pumpkinMan.gridY * scl, 
                  pumpkinMan.height + 100, 2);
}

// Update and draw floating texts
function updateAndDrawFloatingTexts() {
  // currently（on/at）
  if (!window.lastTextCount) window.lastTextCount = 0;
  if (floatingTexts.length !== window.lastTextCount) {
    console.log(`【】${floatingTexts.length}`);
    window.lastTextCount = floatingTexts.length;
  }
  
  
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    let ft = floatingTexts[i];
    let elapsed = millis() - ft.startTime;
    
    // Checkwhether
    if (elapsed > ft.duration) {
      // ，on/at
      // console.log(`【】ID:${ft.id} :"${ft.text}" `);
      floatingTexts.splice(i, 1);
      continue;
    }
    
    
    let progress = elapsed / ft.duration;
    ft.alpha = 255 * (1 - progress);
    ft.offsetY = -70 * progress; // up/above
    ft.size = 60 + 40 * sin(progress * PI); // ，
    
    //  - 
    push();
    translate(ft.x, ft.y, ft.z + ft.offsetY);
    
    
    if (followCamera) {
      rotateY(-pumpkinMan.rotationY);
    } else {
      rotateX(-angleX);
      rotateY(-angleY);
      rotateZ(-angleZ);
    }
    
    
    fill(255, 255, 150, ft.alpha * 0.4);
    noStroke();
    textSize(ft.size + 4);
    textAlign(CENTER, CENTER);
    text(ft.text, 0, 0);
    
    
    fill(255, 255, 0, ft.alpha);
    textSize(ft.size);
    text(ft.text, 0, 0);
    
    pop();
  }
}

// ：3Dto
function pointToSegmentDist3D(px, py, pz, x1, y1, z1, x2, y2, z2) {
  let A = px - x1;
  let B = py - y1;
  let C = pz - z1;
  let D = x2 - x1;
  let E = y2 - y1;
  let F = z2 - z1;
  let dot = A * D + B * E + C * F;
  let len_sq = D * D + E * E + F * F;
  let param = len_sq !== 0 ? dot / len_sq : -1;
  let xx, yy, zz;
  if (param < 0) {
    xx = x1;
    yy = y1;
    zz = z1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
    zz = z2;
  } else {
    xx = x1 + param * D;
    yy = y1 + param * E;
    zz = z1 + param * F;
  }
  let dx = px - xx;
  let dy = py - yy;
  let dz = pz - zz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
} 

// bridgebridge
function clearTreesNearBridge() {
  if (!treeList || !bridge) return;
  
  // bridgebridge
  let treesToRemove = [];
  
  // bridge（bridge）
  for (let i = 0; i < treeList.length; i++) {
    let tree = treeList[i];
    let bridgeX = bridge.centerCol;
    let bridgeY = bridge.riverRow;
    
    // Checkwhetheron/atbridge
    if (abs(tree.x - bridgeX) < bridge.width * 1.2 && 
        tree.y >= bridgeY - bridge.length/2 - 10 && 
        tree.y <= bridgeY + bridge.length/2 + 10) {
      treesToRemove.push(i);
      continue;
    }
    
    // Checkwhetheron/atnorthbridge
    if (abs(tree.x - bridgeX) < bridge.entryClearWidth && 
        tree.y >= bridgeY - bridge.length/2 - bridge.entryClearLength && 
        tree.y <= bridgeY - bridge.length/2) {
      treesToRemove.push(i);
      continue;
    }
    
    // Checkwhetheron/atsouthbridge
    if (abs(tree.x - bridgeX) < bridge.entryClearWidth && 
        tree.y >= bridgeY + bridge.length/2 && 
        tree.y <= bridgeY + bridge.length/2 + bridge.entryClearLength) {
      treesToRemove.push(i);
      continue;
    }
    
    // secondbridge（bridge）
    if (bridge2) {
      let bridge2X = bridge2.centerCol;
      let bridge2Y = bridge2.riverRow;
      
      // Checkwhetheron/atbridge
      if (abs(tree.x - bridge2X) < bridge2.width * 1.3 && 
          tree.y >= bridge2Y - bridge2.length/2 - 12 && 
          tree.y <= bridge2Y + bridge2.length/2 + 12) {
        treesToRemove.push(i);
        continue;
      }
      
      // Checkwhetheron/atbridgenorthbridge
      if (abs(tree.x - bridge2X) < bridge2.entryClearWidth && 
          tree.y >= bridge2Y - bridge2.length/2 - bridge2.entryClearLength && 
          tree.y <= bridge2Y - bridge2.length/2) {
        treesToRemove.push(i);
        continue;
      }
      
      // Checkwhetheron/atbridgesouthbridge
      if (abs(tree.x - bridge2X) < bridge2.entryClearWidth && 
          tree.y >= bridge2Y + bridge2.length/2 && 
          tree.y <= bridge2Y + bridge2.length/2 + bridge2.entryClearLength) {
        treesToRemove.push(i);
        continue;
      }
    }
    
    // Check
    if (abs(tree.y - bridgeY) < 12) {
      treesToRemove.push(i);
    }
  }
  
  // （）
  for (let i = treesToRemove.length - 1; i >= 0; i--) {
    treeList.splice(treesToRemove[i], 1);
  }
  
  console.log(`${treesToRemove.length}`);
}


function clearTreesNearHouse() {
  if (!treeList) return;
  
  
  let treesToRemove = [];
  let enhancedHouseRadius = houseAvoidRadius * 1.2; 
  for (let i = 0; i < treeList.length; i++) {
    let tree = treeList[i];
    
    // todistance
    let distToHouse = dist(tree.x, tree.y, houseGridX, houseGridY);
    
    // If，
    if (distToHouse < enhancedHouseRadius) {
      treesToRemove.push(i);
    }
  }
  
  // （）
  for (let i = treesToRemove.length - 1; i >= 0; i--) {
    treeList.splice(treesToRemove[i], 1);
  }
  
  console.log(`${treesToRemove.length}`);
}

// bridge（）
function clearObstaclesNearBridge() {
  if (!stoneList || !grassList || !bridge || !bridge2) return;
  
  
  let stonesToRemove = [];
  
  // bridge（bridge）
  for (let i = 0; i < stoneList.length; i++) {
    let stone = stoneList[i];
    let bridgeX = bridge.centerCol;
    let bridgeY = bridge.riverRow;
    
    // Checkwhetheron/atbridge - 
    if (abs(stone.gridX - bridgeX) < bridge.width * 2.0 && 
        stone.gridY >= bridgeY - bridge.length/2 - 15 && 
        stone.gridY <= bridgeY + bridge.length/2 + 15) {
      stonesToRemove.push(i);
      continue;
    }
    
    // Checkwhetheron/atnorthbridge - 
    if (abs(stone.gridX - bridgeX) < bridge.entryClearWidth * 1.5 && 
        stone.gridY >= bridgeY - bridge.length/2 - bridge.entryClearLength * 1.5 && 
        stone.gridY <= bridgeY - bridge.length/2) {
      stonesToRemove.push(i);
      continue;
    }
    
    // Checkwhetheron/atsouthbridge
    if (abs(stone.gridX - bridgeX) < bridge.entryClearWidth * 1.5 && 
        stone.gridY >= bridgeY + bridge.length/2 && 
        stone.gridY <= bridgeY + bridge.length/2 + bridge.entryClearLength * 1.5) {
      stonesToRemove.push(i);
      continue;
    }
    
    // secondbridge（bridge）
    let bridge2X = bridge2.centerCol;
    let bridge2Y = bridge2.riverRow;
    
    // Checkwhetheron/atbridge
    if (abs(stone.gridX - bridge2X) < bridge2.width * 2.0 && 
        stone.gridY >= bridge2Y - bridge2.length/2 - 15 && 
        stone.gridY <= bridge2Y + bridge2.length/2 + 15) {
      stonesToRemove.push(i);
      continue;
    }
    
    // Checkwhetheron/atbridgenorthbridge
    if (abs(stone.gridX - bridge2X) < bridge2.entryClearWidth * 1.5 && 
        stone.gridY >= bridge2Y - bridge2.length/2 - bridge2.entryClearLength * 1.5 && 
        stone.gridY <= bridge2Y - bridge2.length/2) {
      stonesToRemove.push(i);
      continue;
    }
    
    // Checkwhetheron/atbridgesouthbridge
    if (abs(stone.gridX - bridge2X) < bridge2.entryClearWidth * 1.5 && 
        stone.gridY >= bridge2Y + bridge2.length/2 && 
        stone.gridY <= bridge2Y + bridge2.length/2 + bridge2.entryClearLength * 1.5) {
      stonesToRemove.push(i);
      continue;
    }
    
    // Check
    if (abs(stone.gridY - bridgeY) < 15) {
      stonesToRemove.push(i);
    }
  }
  
  // （）
  for (let i = stonesToRemove.length - 1; i >= 0; i--) {
    stoneList.splice(stonesToRemove[i], 1);
  }
  
  
  let grassToRemove = [];
  
  // bridge（bridge）
  for (let i = 0; i < grassList.length; i++) {
    let grass = grassList[i];
    let bridgeX = bridge.centerCol;
    let bridgeY = bridge.riverRow;
    
    // Checkwhetheron/atbridge
    if (abs(grass.x - bridgeX) < bridge.width * 2.0 && 
        grass.y >= bridgeY - bridge.length/2 - 15 && 
        grass.y <= bridgeY + bridge.length/2 + 15) {
      grassToRemove.push(i);
      continue;
    }
    
    // Checkwhetheron/atnorthbridge
    if (abs(grass.x - bridgeX) < bridge.entryClearWidth * 1.5 && 
        grass.y >= bridgeY - bridge.length/2 - bridge.entryClearLength * 1.5 && 
        grass.y <= bridgeY - bridge.length/2) {
      grassToRemove.push(i);
      continue;
    }
    
    // Checkwhetheron/atsouthbridge
    if (abs(grass.x - bridgeX) < bridge.entryClearWidth * 1.5 && 
        grass.y >= bridgeY + bridge.length/2 && 
        grass.y <= bridgeY + bridge.length/2 + bridge.entryClearLength * 1.5) {
      grassToRemove.push(i);
      continue;
    }
    
    // secondbridge（bridge）
    let bridge2X = bridge2.centerCol;
    let bridge2Y = bridge2.riverRow;
    
    // Checkwhetheron/atbridge
    if (abs(grass.x - bridge2X) < bridge2.width * 2.0 && 
        grass.y >= bridge2Y - bridge2.length/2 - 15 && 
        grass.y <= bridge2Y + bridge2.length/2 + 15) {
      grassToRemove.push(i);
      continue;
    }
    
    // Checkwhetheron/atbridgenorthbridge
    if (abs(grass.x - bridge2X) < bridge2.entryClearWidth * 1.5 && 
        grass.y >= bridge2Y - bridge2.length/2 - bridge2.entryClearLength * 1.5 && 
        grass.y <= bridge2Y - bridge2.length/2) {
      grassToRemove.push(i);
      continue;
    }
    
    // Checkwhetheron/atbridgesouthbridge
    if (abs(grass.x - bridge2X) < bridge2.entryClearWidth * 1.5 && 
        grass.y >= bridge2Y + bridge2.length/2 && 
        grass.y <= bridge2Y + bridge2.length/2 + bridge2.entryClearLength * 1.5) {
      grassToRemove.push(i);
      continue;
    }
    
    // Check
    if (abs(grass.y - bridgeY) < 15) {
      grassToRemove.push(i);
    }
  }
  
  // （）
  for (let i = grassToRemove.length - 1; i >= 0; i--) {
    grassList.splice(grassToRemove[i], 1);
  }
  
  console.log(`${stonesToRemove.length}${grassToRemove.length}`);
}

// Update fountain challenge
function updateFountainChallenge() {
  if (!fountainChallenge.active) return;
  
  
  fountainChallenge.timer += 1/frameRate();
  
  // Checkwhetherto
  if (fountainChallenge.pumpkinTouchedFountain) {
    // Ifsouthto，，
    if (frameCount % 60 === 0) { 
      console.log("！");
    }
    return;
  }
  
  // Checkwhetherto
  if (fountainChallenge.timer >= fountainChallenge.maxTime) {
    if (!fountainChallenge.grayScaleMode) {
      // tosouthto，
      fountainChallenge.grayScaleMode = true;
      fountainChallenge.allObjectsFrozen = true;
      
      addFloatingText("！", width/2, height/2, 100, 5);
      console.log(" - ");
    }
  }
  
  
  if (!fountainChallenge.grayScaleMode && frameCount % 30 === 0) {
    let timeLeft = fountainChallenge.maxTime - fountainChallenge.timer;
    if (timeLeft > 0) {
      console.log(`: ${timeLeft.toFixed(1)}`);
    }
  }
}

// Convert to grayscale
function toGrayScale(r, g, b, a = 255) {
  if (!fountainChallenge.grayScaleMode) {
    return color(r, g, b, a);
  }
  
  let gray = 0.299 * r + 0.587 * g + 0.114 * b;
  return color(gray, gray, gray, a);
}

// Draw fountain
function drawFountainChallengeTimer() {
  if (!fountainChallenge.active) return;
  
  
  let timeLeft = fountainChallenge.maxTime - fountainChallenge.timer;
  
  if (fountainChallenge.pumpkinTouchedFountain) {
    // If，
    showScreenText("！", width/2, 100, 48, color(0, 255, 0));
  } else if (fountainChallenge.grayScaleMode) {
    // If，
    showScreenText("！", width/2, 100, 48, color(255, 0, 0));
    showScreenText("", width/2, 150, 24, color(255, 255, 255));
  } else {
    
    showCountdownText(timeLeft);
  }
}

// Checksouth
function checkPumpkinFountainCollision() {
  if (!fountainChallenge.active || fountainChallenge.pumpkinTouchedFountain) return;
  
  // southdistance
  let distanceToFountain = dist(pumpkinMan.gridX, pumpkinMan.gridY, fountain.gridX, fountain.gridY);
  
  // （south）
  let collisionRadius = fountain.baseRadius / scl + pumpkinMan.size / scl + 2; // 2
  
  if (distanceToFountain < collisionRadius) {
    // southto
    fountainChallenge.pumpkinTouchedFountain = true;
    
    
    addFloatingText("！！", pumpkinMan.gridX * scl, pumpkinMan.gridY * scl, pumpkinMan.height + 40, 5);
    addFloatingText("！", width/2, height/2, 100, 3);
    
    console.log(" - ");
  }
}

// 2D
function showScreenText(message, x = width/2, y = height/2, size = 32, textColor = color(255, 255, 0)) {
  
  textAlign(CENTER, CENTER);
  textSize(size);
  
  // （）
  fill(0, 0, 0, 150);
  text(message, x + 2, y + 2);
  
  
  fill(textColor);
  text(message, x, y);
  
  console.log(`Show screen text: "${message}"  (${x}, ${y})`);
}

// Show countdown text
function showCountdownText(timeLeft) {
  console.log(`: ${timeLeft} `); 
  
  let textColor;
  if (timeLeft > 5) {
    textColor = color(255, 255, 255); 
  } else if (timeLeft > 2) {
    textColor = color(255, 255, 0); 
  } else {
    textColor = color(255, 0, 0); 
  }
  
  
  textAlign(CENTER, CENTER);
  textSize(120); 
  
  fill(0, 0, 0, 180);
  noStroke();
  ellipse(width/2, height/2 - 80, 200, 200);
  
  
  fill(0, 0, 0, 255);
  text(Math.ceil(timeLeft), width/2 + 5, height/2 - 80 + 5);
  
  
  fill(textColor);
  text(Math.ceil(timeLeft), width/2, height/2 - 80);
  
  
  textSize(32); 
  fill(255, 255, 0); 
  text("！", width/2, height/2 - 20);
}

// on/atup/above
function showGameInfo(info) {
  
  fill(0, 0, 0, 150); 
  noStroke();
  rect(10, 10, 400, 40); 
  
  textAlign(LEFT, TOP);
  textSize(18); 
  fill(255, 255, 0); // ，
  text(info, 15, 28); 
  console.log(`Show game info: "${info}"`); 
}

// Update HTML text（on/atup/above，3D）
function updateHTMLText() {
  
  let gameInfo = `: ${Math.round(frameRate())} | : (${Math.round(pumpkinMan.gridX)}, ${Math.round(pumpkinMan.gridY)})`;
  if (fountainChallenge.active) {
    gameInfo += ` | : ${Math.ceil(fountainChallenge.timer / 60)}`;
  }
  gameInfoText.html(gameInfo);

  
  let instructions = `
<strong>🎮 Controls</strong><br/>
🚶 WASD / Arrow Keys<br/>
<br/>
<strong>⚡ Special Challenges</strong><br/>
<span style="color: #ff6b6b;">L Key</span> - Fountain Challenge<br/>
　　• Start 10-second countdown<br/>
　　• Pumpkin must touch fountain<br/>
　　• Fail: All objects turn gray & freeze<br/>
<br/>
<span style="color: #4ecdc4;">P Key</span> - Emergency State<br/>
　　• Start emergency countdown<br/>
　　• Pumpkin must reach rescue boat<br/>
　　• Water level rises, terrain fragments<br/>
　　• Fail: Game resets<br/>
<br/>
<strong>💡 Camera</strong><br/>
Mouse Drag - Rotate View<br/>
Mouse Wheel - Zoom In/Out
  `;
  gameInstructionsText.html(instructions);

  // （LP）
  if (fountainChallenge.active) {
    // L - 
    let timeLeft = Math.ceil(fountainChallenge.maxTime - fountainChallenge.timer);
    if (timeLeft <= 0) timeLeft = 0;
    
    if (fountainChallenge.pumpkinTouchedFountain) {
      countdownText.html(`✅ Fountain Challenge Success!`);
      countdownText.style('color', 'green');
    } else if (fountainChallenge.grayScaleMode) {
      countdownText.html(`❌ Fountain Challenge Failed!`);
      countdownText.style('color', 'red');
    } else {
      countdownText.html(`🏃 Fountain Challenge: ${timeLeft}s`);
      
      if (timeLeft <= 3) {
        countdownText.style('color', 'red');
      } else if (timeLeft <= 5) {
        countdownText.style('color', 'orange');
      } else {
        countdownText.style('color', 'white');
      }
    }
    countdownText.style('display', 'block');
    
  } else if (emergency.active) {
    // P - 
    let timeLeft = Math.ceil(emergency.maxTime - emergency.timer);
    if (timeLeft <= 0) timeLeft = 0;
    
    if (emergency.pumpkinSaved || boatItem.collected) {
      // Ifsouth，
      countdownText.html(`✅ Emergency Success - Boat Secured!`);
      countdownText.style('color', 'green');
    } else if (emergency.gameOver) {
      countdownText.html(`💀 Emergency Failed - Game Reset!`);
      countdownText.style('color', 'red');
    } else {
      countdownText.html(`🚨 Emergency: ${timeLeft}s - Reach Boat!`);
      
      if (timeLeft <= 3) {
        countdownText.style('color', 'red');
      } else if (timeLeft <= 5) {
        countdownText.style('color', 'orange');
      } else {
        countdownText.style('color', 'yellow');
      }
    }
    countdownText.style('display', 'block');
    
  } else {
    countdownText.style('display', 'none');
  }
  
  // If，
  if (fountainChallenge.grayScaleMode) {
    gameInfoText.style('color', 'gray');
    gameInstructionsText.style('color', 'gray');
  } else {
    gameInfoText.style('color', 'yellow');
    gameInstructionsText.style('color', 'white');
  }
}