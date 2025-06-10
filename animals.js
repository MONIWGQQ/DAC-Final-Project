// Initialize rabbits and cows
function initializeRabbitsAndCows() {
  console.log("Starting initialization of rabbits and cows...");
  
  // Clear previous lists
  rabbitList = [];
  cowList = [];
  
  // Check if sheep flock has been initialized
  if (!sheepList || sheepList.length === 0) {
    console.warn("Sheep flock not yet initialized, cannot use as reference");
    return; // If no sheep flock, don't create other animals
  }
  
  console.log(`Sheep count: ${sheepList.length}`);
  
  // Create rabbits (increased to 14)
  let numRabbits = 14;
  
  // Distribute rabbits across different regions of the map
  const mapRegions = [
    {minX: 20, maxX: 40, minY: 20, maxY: 40},      // Top left
    {minX: cols-50, maxX: cols-20, minY: 20, maxY: 50},     // Top right
    {minX: 20, maxX: 50, minY: rows-50, maxY: rows-20},     // Bottom left
    {minX: cols-50, maxX: cols-20, minY: rows-50, maxY: rows-20},    // Bottom right
    {minX: cols/2-30, maxX: cols/2+30, minY: 20, maxY: 50},         // Center top
    {minX: cols/2-30, maxX: cols/2+30, minY: rows-50, maxY: rows-20}, // Center bottom
    {minX: 20, maxX: 50, minY: rows/2-20, maxY: rows/2+20},         // Left center
    {minX: cols-50, maxX: cols-20, minY: rows/2-20, maxY: rows/2+20}  // Right center
  ];
  
  for (let i = 0; i < numRabbits; i++) {
    // Select a region for each rabbit, if more regions than rabbits, cycle through
    let region = mapRegions[i % mapRegions.length];
    
    // Randomly select a position within the selected region, adding some random offset for a more natural distribution
    let rabbitX = random(region.minX, region.maxX) + random(-10, 10);
    let rabbitY = random(region.minY, region.maxY) + random(-10, 10);
    
    // Ensure not near river
    let riverY = bridge.riverRow;
    if (abs(rabbitY - riverY) < 15) {
      // If too close to river, move up or down
      rabbitY = rabbitY < riverY ? riverY - 20 : riverY + 20;
    }
    
    // Ensure coordinates are within reasonable range
    rabbitX = constrain(rabbitX, 5, cols - 5);
    rabbitY = constrain(rabbitY, 5, rows - 5);
    
    // Create rabbit object
    let rabbit = {
      x: rabbitX,
      y: rabbitY,
      size: random(8, 12),
      bodyColor: color(255, 255, 255, 240),
      legColor: color(240, 240, 240),
      rotation: random(TWO_PI),
      moveTimer: random(50, 150),
      state: 'idle',
      walkSpeed: random(0.06, 0.1),
      hopHeight: 0,
      hopPhase: 0,
      hopSpeed: 0.1,
      maxHopHeight: 25,
      targetX: rabbitX,
      targetY: rabbitY
    };
    
    rabbitList.push(rabbit);
  }
  
  // Create cows (increased to 24)
  let numCows = 24;
  
  // Use the same regional division as rabbits
  const cowRegions = [
    {minX: 20, maxX: 40, minY: 20, maxY: 40},      // Top left
    {minX: cols-50, maxX: cols-20, minY: 20, maxY: 50},     // Top right
    {minX: 20, maxX: 50, minY: rows-50, maxY: rows-20},     // Bottom left
    {minX: cols-50, maxX: cols-20, minY: rows-50, maxY: rows-20},    // Bottom right
    {minX: cols/2-30, maxX: cols/2+30, minY: 20, maxY: 50},         // Center top
    {minX: cols/2-30, maxX: cols/2+30, minY: rows-50, maxY: rows-20}, // Center bottom
    {minX: 20, maxX: 50, minY: rows/2-20, maxY: rows/2+20},         // Left center
    {minX: cols-50, maxX: cols-20, minY: rows/2-20, maxY: rows/2+20}  // Right center
  ];
  
  for (let i = 0; i < numCows; i++) {
    // Select a region for each cow, if more regions than cows, cycle through
    let region = cowRegions[i % cowRegions.length];
    
    // Randomly select a position within the selected region, adding some random offset for a more natural distribution
    let cowX = random(region.minX, region.maxX) + random(-10, 10);
    let cowY = random(region.minY, region.maxY) + random(-10, 10);
    
    // Ensure not near river
    let riverY = bridge.riverRow;
    if (abs(cowY - riverY) < 20) {
      // If too close to river, move up or down
      cowY = cowY < riverY ? riverY - 25 : riverY + 25;
    }
    
    // Ensure coordinates are within reasonable range
    cowX = constrain(cowX, 10, cols - 10);
    cowY = constrain(cowY, 10, rows - 10);
    
    // Create cow object
    let cowColors = [
      color(60, 30, 10, 240), // Brown
      color(220, 220, 200, 240) // Holstein white
    ];
    
    let selectedColor = cowColors[i % cowColors.length];
    let isHolstein = (i % 2 === 0); // Half are spotted cows, half are solid color cows
    
    let cow = {
      x: cowX,
      y: cowY,
      size: random(20, 25),
      bodyColor: selectedColor,
      isHolstein: isHolstein,
      spotColor: color(40, 40, 40),
      headColor: selectedColor,
      legColor: color(40, 40, 40),
      rotation: random(TWO_PI),
      moveTimer: random(150, 300),
      state: 'idle',
      walkSpeed: random(0.02, 0.04),
      eatingTimer: 0,
      targetX: cowX,
      targetY: cowY
    };
    
    cowList.push(cow);
  }
  
  console.log(`Successfully created ${rabbitList.length} rabbits and ${cowList.length} cows`);
  
  // Add floating text to indicate animal positions
  setTimeout(() => {
    // Add floating text for each rabbit
    rabbitList.forEach(rabbit => {
      addFloatingText("🐰White Rabbit", rabbit.x, rabbit.y, 
                      terrain[Math.floor(rabbit.x)][Math.floor(rabbit.y)] + 40, 8000);
    });
    
    // Add floating text for each cow
    cowList.forEach(cow => {
      addFloatingText("🐄Cow", cow.x, cow.y, 
                      terrain[Math.floor(cow.x)][Math.floor(cow.y)] + 60, 8000);
    });
  }, 2000);
  
  // Initialize dogs
  initializeDogs();
}

// Add dog initialization function
let dogList = [];

function initializeDogs() {
  console.log("Starting dog initialization...");
  
  // Clear previous list
  dogList = [];
  
  // Create dogs (20)
  let numDogs = 20;
  
  // Dog regional distribution - scattered across the map
  const dogRegions = [
    {minX: 30, maxX: 70, minY: 30, maxY: 70},      // Central area
    {minX: cols-80, maxX: cols-40, minY: 30, maxY: 70},     // Right side
    {minX: 30, maxX: 70, minY: rows-80, maxY: rows-40},     // Bottom area
    {minX: cols/2-50, maxX: cols/2+50, minY: rows/2-50, maxY: rows/2+50}  // Center area
  ];
  
  // Dog colors
  const dogColors = [
    color(120, 90, 60),  // Brown
    color(40, 30, 20),   // Dark brown/black
    color(200, 180, 140), // Light brown/beige
    color(240, 240, 240)  // White
  ];
  
  for (let i = 0; i < numDogs; i++) {
    // Select a region for each dog
    let region = dogRegions[i % dogRegions.length];
    
    // Randomly select a position within the selected region
    let dogX = random(region.minX, region.maxX) + random(-10, 10);
    let dogY = random(region.minY, region.maxY) + random(-10, 10);
    
    // Ensure not near river
    let riverY = bridge.riverRow;
    if (abs(dogY - riverY) < 15) {
      // If too close to river, move in opposite direction
      dogY = dogY < riverY ? riverY - 15 : riverY + 15;
    }
    
    // Ensure coordinates are within reasonable range
    dogX = constrain(dogX, 8, cols - 8);
    dogY = constrain(dogY, 8, rows - 8);
    
    // Select dog color
    let selectedColor = dogColors[floor(random(dogColors.length))];
    
    // Create dog object
    let dog = {
      x: dogX,
      y: dogY,
      size: random(8, 12),      // Dog size
      bodyColor: selectedColor,
      earColor: selectedColor,
      legColor: selectedColor,
      tailColor: selectedColor,
      rotation: random(TWO_PI),
      moveTimer: random(30, 100),
      state: 'idle',            // idle, walking, running
      walkSpeed: random(0.05, 0.12),
      runSpeed: random(0.15, 0.25),
      targetX: dogX,
      targetY: dogY,
      tailWag: 0,               // Tail wagging counter
      tailWagSpeed: random(0.1, 0.2),
      breed: floor(random(3)),   // 0: short hair, 1: long hair, 2: medium
      furPositions: [] // Store fur positions for long-haired dogs
    };
    
    // If long-haired dog, pre-calculate fur positions
    if (dog.breed === 1) {
      for (let i = 0; i < 5; i++) {
        dog.furPositions.push({
          x: dog.size * random(-0.7, 0.7),
          y: dog.size * random(-0.4, 0.4),
          z: dog.size * random(-0.4, 0.4),
          size: dog.size * (0.25 + random(0.1))
        });
      }
    }
    
    dogList.push(dog);
  }
  
  console.log(`Successfully created ${dogList.length} dogs`);
  
  // Add floating text to indicate dog positions
  setTimeout(() => {
    // Add floating text for each dog
    dogList.forEach(dog => {
      addFloatingText("🐕Dog", dog.x, dog.y, 
                      terrain[Math.floor(dog.x)][Math.floor(dog.y)] + 40, 8000);
    });
  }, 2000);
}

// Update and draw dogs
function updateAndDrawDogs() {
  if (dogList.length === 0) return;
  
  // Global render state reset
  noStroke();
  
  for (let dog of dogList) {
    // Only update position and state when not frozen
    if (!fountainChallenge.allObjectsFrozen) {
      // Update timer
      dog.moveTimer--;
      
      // Update tail wagging
      dog.tailWag += dog.tailWagSpeed;
      if (dog.tailWag > TWO_PI) {
        dog.tailWag -= TWO_PI;
      }
      
      // Execute different behaviors based on dog state
      if (dog.state === 'idle') {
        // Idle state: occasionally decide to move
        if (dog.moveTimer <= 0) {
          // Decide next behavior
          let stateRoll = random();
          if (stateRoll < 0.7) { // 70% chance to move
            // 60% walking, 40% running
            dog.state = (random() < 0.6) ? 'walking' : 'running';
            

            
            // Select new target position
            let newX = dog.x + random(-12, 12);
            let newY = dog.y + random(-12, 12);
            
            // Ensure not approaching river
            let riverY = bridge.riverRow;
            if (abs(newY - riverY) < 12) {
              // If too close to river, move in opposite direction
              newY = dog.y + (dog.y < riverY ? -10 : 10);
            }
            
            // Ensure not running off map
            newX = constrain(newX, 8, cols - 8);
            newY = constrain(newY, 8, rows - 8);
            
            dog.targetX = newX;
            dog.targetY = newY;
            
            // Face target direction
            dog.rotation = atan2(dog.targetY - dog.y, dog.targetX - dog.x);
            
            // Set movement time
            dog.moveTimer = random(30, 80);
          } else {
            // Continue idle, randomly turn
            dog.rotation = random(TWO_PI);
            dog.moveTimer = random(50, 120);
          }
        }
      } else if (dog.state === 'walking') {
        // Walking state: move toward target
        let dx = dog.targetX - dog.x;
        let dy = dog.targetY - dog.y;
        let distance = sqrt(dx*dx + dy*dy);
        
        if (distance > 0.1 && dog.moveTimer > 0) {
          // Continue moving
          dog.x += dx * dog.walkSpeed;
          dog.y += dy * dog.walkSpeed;
        } else {
          // Reached target or time up, enter idle state
          dog.state = 'idle';
          dog.moveTimer = random(30, 80);
        }
      } else if (dog.state === 'running') {
        // Running state: move quickly toward target
        let dx = dog.targetX - dog.x;
        let dy = dog.targetY - dog.y;
        let distance = sqrt(dx*dx + dy*dy);
        
        if (distance > 0.1 && dog.moveTimer > 0) {
          // Continue moving (faster than walking)
          dog.x += dx * dog.runSpeed;
          dog.y += dy * dog.runSpeed;
        } else {
          // Reached target or time up, enter idle state
          dog.state = 'idle';
          dog.moveTimer = random(40, 100);
        }
      }
    }
    
    // Draw dog
    push();
    
    // Reset render state
    noFill();
    noStroke();
    
    // Calculate dog's height on terrain
    let terrainHeight = terrain[Math.floor(dog.x)][Math.floor(dog.y)];
    
    // Place dog on terrain - using same coordinate system as other animals
    translate(dog.x * scl, dog.y * scl, terrainHeight + 7);
    
    // Rotate based on dog's movement direction
    rotateZ(dog.rotation);
    
    // Draw dog body (main body) - support grayscale mode
    noStroke();
    let bodyColor = dog.bodyColor;
    if (fountainChallenge.grayScaleMode) {
      let r = red(bodyColor), g = green(bodyColor), b = blue(bodyColor), a = alpha(bodyColor);
      bodyColor = toGrayScale(r, g, b, a);
    }
    fill(bodyColor);
    
    // Draw different body shapes based on breed
    if (dog.breed === 0) { // Short-haired dog
      ellipsoid(dog.size * 0.8, dog.size * 0.5, dog.size * 0.5);
    } else if (dog.breed === 1) { // Long-haired dog
      ellipsoid(dog.size * 0.9, dog.size * 0.55, dog.size * 0.55);
      // Add fluffy fur effect
      if (dog.furPositions && dog.furPositions.length > 0) {
        // Use pre-calculated fixed positions
        for (let fur of dog.furPositions) {
          push();
          translate(fur.x, fur.y, fur.z);
          fill(dog.bodyColor);
          noStroke();
          sphere(fur.size);
          pop();
        }
      }
    } else { // Medium dog
      ellipsoid(dog.size * 0.85, dog.size * 0.5, dog.size * 0.55);
    }
    
    // Draw dog head
    push();
    translate(dog.size * 0.7, 0, dog.size * 0.3);
    
    // Head
    fill(bodyColor);
    sphere(dog.size * 0.4);
    
    // Snout
    push();
    translate(dog.size * 0.3, 0, -dog.size * 0.05);
    fill(bodyColor);
    ellipsoid(dog.size * 0.35, dog.size * 0.2, dog.size * 0.2);
    
    // Nose
    translate(dog.size * 0.25, 0, 0);
    let noseColor = color(20, 20, 20);
    if (fountainChallenge.grayScaleMode) {
      noseColor = toGrayScale(20, 20, 20);
    }
    fill(noseColor);
    sphere(dog.size * 0.08);
    pop();
    
    // Eyes
    let eyeColor = color(30, 30, 30);
    if (fountainChallenge.grayScaleMode) {
      eyeColor = toGrayScale(30, 30, 30);
    }
    fill(eyeColor);
    push();
    translate(dog.size * 0.2, -dog.size * 0.15, dog.size * 0.15);
    sphere(dog.size * 0.08);
    pop();
    
    push();
    translate(dog.size * 0.2, dog.size * 0.15, dog.size * 0.15);
    sphere(dog.size * 0.08);
    pop();
    
    // Ears - based on breed
    let earColor = dog.earColor;
    if (fountainChallenge.grayScaleMode) {
      let r = red(earColor), g = green(earColor), b = blue(earColor), a = alpha(earColor);
      earColor = toGrayScale(r, g, b, a);
    }
    fill(earColor);
    if (dog.breed === 0) { // Short ears
      push();
      translate(0, -dog.size * 0.25, dog.size * 0.3);
      rotateZ(-PI/4);
      rotateX(PI/6);
      ellipsoid(dog.size * 0.15, dog.size * 0.1, dog.size * 0.25);
      pop();
      
      push();
      translate(0, dog.size * 0.25, dog.size * 0.3);
      rotateZ(PI/4);
      rotateX(PI/6);
      ellipsoid(dog.size * 0.15, dog.size * 0.1, dog.size * 0.25);
      pop();
    } else if (dog.breed === 1) { // Floppy ears
      push();
      translate(0, -dog.size * 0.2, dog.size * 0.2);
      rotateZ(-PI/6);
      rotateX(PI/3);
      ellipsoid(dog.size * 0.1, dog.size * 0.08, dog.size * 0.3);
      pop();
      
      push();
      translate(0, dog.size * 0.2, dog.size * 0.2);
      rotateZ(PI/6);
      rotateX(PI/3);
      ellipsoid(dog.size * 0.1, dog.size * 0.08, dog.size * 0.3);
      pop();
    } else { // Pointed ears
      push();
      translate(-dog.size * 0.05, -dog.size * 0.2, dog.size * 0.3);
      rotateZ(-PI/8);
      rotateX(-PI/8);
      ellipsoid(dog.size * 0.1, dog.size * 0.05, dog.size * 0.35);
      pop();
      
      push();
      translate(-dog.size * 0.05, dog.size * 0.2, dog.size * 0.3);
      rotateZ(PI/8);
      rotateX(-PI/8);
      ellipsoid(dog.size * 0.1, dog.size * 0.05, dog.size * 0.35);
      pop();
    }
    
    pop(); // End head drawing
    
    // Draw tail - add wagging animation
    push();
    translate(-dog.size * 0.6, 0, dog.size * 0.2);
    rotateZ(PI + sin(dog.tailWag) * 0.5); // Tail wagging
    rotateX(-PI/8);
    
    // Tail color processing
    let tailColor = dog.tailColor;
    if (fountainChallenge.grayScaleMode) {
      let r = red(tailColor), g = green(tailColor), b = blue(tailColor), a = alpha(tailColor);
      tailColor = toGrayScale(r, g, b, a);
    }
    
    if (dog.breed === 0) { // Short tail
      fill(tailColor);
      cone(dog.size * 0.1, dog.size * 0.3, 8, 1);
    } else if (dog.breed === 1) { // Fluffy tail
      fill(tailColor);
      push();
      translate(0, 0, -dog.size * 0.2);
      cylinder(dog.size * 0.15, dog.size * 0.4, 8, 1);
      for (let i = 0; i < 4; i++) {
        push();
        translate(
          random(-0.1, 0.1) * dog.size,
          random(-0.1, 0.1) * dog.size,
          -i * 0.1 * dog.size
        );
        sphere(dog.size * (0.15 - i * 0.02));
        pop();
      }
      pop();
    } else { // Long tail
      fill(tailColor);
      cylinder(dog.size * 0.1, dog.size * 0.5, 8, 1);
    }
    pop();
    
    // Draw dog legs - Four legs, support grayscale mode
    let legColor = dog.legColor;
    if (fountainChallenge.grayScaleMode) {
      let r = red(legColor), g = green(legColor), b = blue(legColor), a = alpha(legColor);
      legColor = toGrayScale(r, g, b, a);
    }
    fill(legColor);
    
    // Set leg animation based on dog state
    let legAngle = 0;
    if (dog.state === 'walking') {
      // Walking leg movement
      legAngle = sin(frameCount * 0.3) * 0.3;
    } else if (dog.state === 'running') {
      // Running leg movement larger
      legAngle = sin(frameCount * 0.4) * 0.5;
    }
    
    // Front legs
    push();
    translate(dog.size * 0.3, -dog.size * 0.25, -dog.size * 0.4);
    rotateX(HALF_PI + legAngle);
    cylinder(dog.size * 0.1, dog.size * 0.8, 8, 1);
    pop();
    
    push();
    translate(dog.size * 0.3, dog.size * 0.25, -dog.size * 0.4);
    rotateX(HALF_PI - legAngle);
    cylinder(dog.size * 0.1, dog.size * 0.8, 8, 1);
    pop();
    
    // Back legs
    push();
    translate(-dog.size * 0.3, -dog.size * 0.25, -dog.size * 0.4);
    rotateX(HALF_PI - legAngle);
    cylinder(dog.size * 0.1, dog.size * 0.8, 8, 1);
    pop();
    
    push();
    translate(-dog.size * 0.3, dog.size * 0.25, -dog.size * 0.4);
    rotateX(HALF_PI + legAngle);
    cylinder(dog.size * 0.1, dog.size * 0.8, 8, 1);
    pop();
    
    pop(); // End entire dog drawing
  }
  
  // End time reset render state
  noStroke();
  noFill();
}

// Update and draw rabbits
function updateAndDrawRabbits() {
  if (rabbitList.length === 0) return;
  
  // Global render state reset
  noStroke();
  
  for (let rabbit of rabbitList) {
    // Only update position and state when not frozen
    if (!fountainChallenge.allObjectsFrozen) {
      // Update timer
      rabbit.moveTimer--;
    
      // Execute different behaviors based on rabbit state
      if (rabbit.state === 'idle') {
        // Idle state: occasionally decide to move or continue idle
        if (rabbit.moveTimer <= 0) {
          // Decide whether to move or continue idle
          if (random() < 0.8) { // Rabbit more active
            // 70% chance to choose hopping, 30% chance to choose walking
            if (random() < 0.7) {
              rabbit.state = 'hopping';
              rabbit.hopPhase = 0;
              
              // Play thump sound when starting to hop
              if (typeof playAnimalSound === 'function') {
                playAnimalSound('rabbit', 'thump', rabbitList.indexOf(rabbit));
              }
            } else {
              rabbit.state = 'walking';
            }
            
            // Select new target position, rabbit moves over a larger range
            let newX = rabbit.x + random(-8, 8);
            let newY = rabbit.y + random(-8, 8);
            
            // Ensure not running into water
            let riverY = bridge.riverRow;
            if (abs(newY - riverY) < 10) {
              // If too close to river, move in opposite direction
              newY = rabbit.y + (rabbit.y < riverY ? -5 : 5);
            }
            
            // Ensure not running off map
            newX = constrain(newX, 5, cols - 5);
            newY = constrain(newY, 5, rows - 5);
            
            rabbit.targetX = newX;
            rabbit.targetY = newY;
            
            // Face target direction
            rabbit.rotation = atan2(rabbit.targetY - rabbit.y, rabbit.targetX - rabbit.x);
            
            // Set movement time
            rabbit.moveTimer = random(40, 100);
          } else {
            // Continue idle, randomly turn
            rabbit.rotation = random(TWO_PI);
            rabbit.moveTimer = random(50, 150);
          }
        }
      } else if (rabbit.state === 'walking') {
        // Walking state: move toward target
        let dx = rabbit.targetX - rabbit.x;
        let dy = rabbit.targetY - rabbit.y;
        let distance = sqrt(dx*dx + dy*dy);
        
        if (distance > 0.1 && rabbit.moveTimer > 0) {
          // Continue moving
          rabbit.x += dx * rabbit.walkSpeed;
          rabbit.y += dy * rabbit.walkSpeed;
        } else {
          // Reached target or time up, enter idle state
          rabbit.state = 'idle';
          rabbit.moveTimer = random(30, 80);
        }
      } else if (rabbit.state === 'hopping') {
        // Hopping state: move toward target
        rabbit.hopPhase += rabbit.hopSpeed;
        
        if (rabbit.hopPhase < 1) {
          // Hopping
          rabbit.hopHeight = sin(PI * rabbit.hopPhase) * rabbit.maxHopHeight;
          
          // Move simultaneously toward target direction
          let dx = rabbit.targetX - rabbit.x;
          let dy = rabbit.targetY - rabbit.y;
          let distance = sqrt(dx*dx + dy*dy);
          
          if (distance > 0.1) {
            // Move faster during hopping than walking
            rabbit.x += dx * rabbit.walkSpeed * 1.5;
            rabbit.y += dy * rabbit.walkSpeed * 1.5;
          }
        } else {
          // Hopping end
          rabbit.hopPhase = 0;
          rabbit.hopHeight = 0;
          
          // If not reached target and time remains, continue hopping
          let dx = rabbit.targetX - rabbit.x;
          let dy = rabbit.targetY - rabbit.y;
          let distance = sqrt(dx*dx + dy*dy);
          
          if (distance > 0.5 && rabbit.moveTimer > 0) {
            // Continue hopping
            rabbit.state = 'hopping';
          } else {
            // End hopping
            rabbit.state = 'idle';
            rabbit.moveTimer = random(30, 80);
          }
        }
      }
    }
    
    // Draw rabbit
    push();
    
    // Reset render state
    noFill();
    noStroke();
    
    // Calculate rabbit's height on terrain
    let terrainHeight = terrain[Math.floor(rabbit.x)][Math.floor(rabbit.y)];
    
    // Place rabbit on terrain - corrected placement with sheep
    translate(rabbit.x * scl, rabbit.y * scl, terrainHeight + rabbit.hopHeight + 7);
    
    // Rotate based on rabbit's movement direction
    rotateZ(rabbit.rotation);
    
    // Draw rabbit body (main body) - support grayscale mode
    noStroke();
    let bodyColor = color(255, 255, 255, 240);
    if (fountainChallenge.grayScaleMode) {
      bodyColor = toGrayScale(255, 255, 255, 240);
    }
    fill(bodyColor);
    ellipsoid(rabbit.size * 0.7, rabbit.size * 0.5, rabbit.size * 0.6);
    
    // Draw rabbit head
    push();
    translate(rabbit.size * 0.5, 0, rabbit.size * 0.2);
    
    // Head
    noStroke();
    let headColor = color(255, 255, 255);
    if (fountainChallenge.grayScaleMode) {
      headColor = toGrayScale(255, 255, 255);
    }
    fill(headColor);
    sphere(rabbit.size * 0.4);
    
    // Eyes
    noStroke();
    let eyeColor = color(30, 30, 30);
    if (fountainChallenge.grayScaleMode) {
      eyeColor = toGrayScale(30, 30, 30);
    }
    fill(eyeColor);
    push();
    translate(rabbit.size * 0.15, -rabbit.size * 0.15, rabbit.size * 0.15);
    sphere(rabbit.size * 0.08);
    pop();
    
    push();
    translate(rabbit.size * 0.15, rabbit.size * 0.15, rabbit.size * 0.15);
    sphere(rabbit.size * 0.08);
    pop();
    
    // Ears - Longer rabbit ears
    noStroke();
    let earColor = color(255, 255, 255);
    if (fountainChallenge.grayScaleMode) {
      earColor = toGrayScale(255, 255, 255);
    }
    fill(earColor);
    push();
    translate(0, -rabbit.size * 0.15, rabbit.size * 0.3);
    rotateZ(-PI/4);
    rotateX(PI/4);
    ellipsoid(rabbit.size * 0.1, rabbit.size * 0.05, rabbit.size * 0.5); // Long ears
    pop();
    
    push();
    translate(0, rabbit.size * 0.15, rabbit.size * 0.3);
    rotateZ(PI/4);
    rotateX(PI/4);
    ellipsoid(rabbit.size * 0.1, rabbit.size * 0.05, rabbit.size * 0.5); // Long ears
    pop();
    
    // Mouth
    let noseColor = color(255, 100, 100);
    if (fountainChallenge.grayScaleMode) {
      noseColor = toGrayScale(255, 100, 100);
    }
    fill(noseColor);
    push();
    translate(rabbit.size * 0.25, 0, 0);
    sphere(rabbit.size * 0.1);
    pop();
    
    pop(); // End head drawing
    
    // Draw tail - Fluffy small ball
    push();
    translate(-rabbit.size * 0.6, 0, rabbit.size * 0.2);
    noStroke();
    let tailColor = color(255, 255, 255);
    if (fountainChallenge.grayScaleMode) {
      tailColor = toGrayScale(255, 255, 255);
    }
    fill(tailColor);
    sphere(rabbit.size * 0.2);
    pop();
    
    // Draw rabbit legs - Four thin long legs, support grayscale mode
    noStroke();
    let legColor = rabbit.legColor;
    if (fountainChallenge.grayScaleMode) {
      let r = red(legColor), g = green(legColor), b = blue(legColor), a = alpha(legColor);
      legColor = toGrayScale(r, g, b, a);
    }
    fill(legColor);
    
    // Set leg animation based on rabbit state
    let legAngle = 0;
    if (rabbit.state === 'walking') {
      // Walking leg movement
      legAngle = sin(frameCount * 0.3) * 0.4; // Rabbit legs move faster
    } else if (rabbit.state === 'hopping') {
      // Hopping back legs straight, front legs fold
      legAngle = PI/4;
    }
    
    // Front legs
    push();
    translate(rabbit.size * 0.3, -rabbit.size * 0.3, -rabbit.size * 0.4);
    rotateX(HALF_PI + legAngle);
    noStroke();
    ellipsoid(rabbit.size * 0.15, rabbit.size * 0.15, rabbit.size * 0.4); // Thicker shorter legs
    pop();
    
    push();
    translate(rabbit.size * 0.3, rabbit.size * 0.3, -rabbit.size * 0.4);
    rotateX(HALF_PI - legAngle);
    noStroke();
    ellipsoid(rabbit.size * 0.15, rabbit.size * 0.15, rabbit.size * 0.4);
    pop();
    
    // Back legs - Rabbit back legs thicker and longer
    push();
    translate(-rabbit.size * 0.3, -rabbit.size * 0.3, -rabbit.size * 0.4);
    rotateX(HALF_PI - legAngle * 1.5);
    noStroke();
    ellipsoid(rabbit.size * 0.2, rabbit.size * 0.2, rabbit.size * 0.5); // Back legs thicker and longer
    pop();
    
    push();
    translate(-rabbit.size * 0.3, rabbit.size * 0.3, -rabbit.size * 0.4);
    rotateX(HALF_PI + legAngle * 1.5);
    noStroke();
    ellipsoid(rabbit.size * 0.2, rabbit.size * 0.2, rabbit.size * 0.5);
    pop();
    
    pop(); // End entire rabbit drawing
  }
  
  // End time reset render state
  noStroke();
  noFill();
}

// Update and draw cows
function updateAndDrawCows() {
  if (cowList.length === 0) return;
  
  // Global render state reset
  noFill();
  noStroke();
  
  for (let cow of cowList) {
    // Only update position and state when not frozen
    if (!fountainChallenge.allObjectsFrozen) {
      // Update timer
      cow.moveTimer--;
      
      // Execute different behaviors based on cow state
      if (cow.state === 'idle') {
        // Idle state: occasionally decide to move or eat grass
        if (cow.moveTimer <= 0) {
          // Decide next state
          let stateRoll = random();
          if (stateRoll < 0.3) { // 30% chance to move
            cow.state = 'walking';
            
            // Select new target position, cow moves over a smaller range
            let newX = cow.x + random(-5, 5);
            let newY = cow.y + random(-5, 5);
            
            // Ensure not running into water
            let riverY = bridge.riverRow;
            if (abs(newY - riverY) < 12) {
              // If too close to river, move in opposite direction
              newY = cow.y + (cow.y < riverY ? -5 : 5);
            }
            
            // Ensure not running off map
            newX = constrain(newX, 10, cols - 10);
            newY = constrain(newY, 10, rows - 10);
            
            cow.targetX = newX;
            cow.targetY = newY;
            
            // Face target direction
            cow.rotation = atan2(cow.targetY - cow.y, cow.targetX - cow.x);
            
            // Set movement time
            cow.moveTimer = random(100, 200);
          } else if (stateRoll < 0.7) { // 40% chance to eat grass
            cow.state = 'eating';
            cow.eatingTimer = random(100, 200);
            cow.moveTimer = cow.eatingTimer;
            

          } else { // 30% chance to continue idle
            // Continue idle, randomly turn
            cow.rotation = random(TWO_PI);
            cow.moveTimer = random(150, 300);
          }
        }
      } else if (cow.state === 'walking') {
        // Walking state: move toward target
        let dx = cow.targetX - cow.x;
        let dy = cow.targetY - cow.y;
        let distance = sqrt(dx*dx + dy*dy);
        
        if (distance > 0.1 && cow.moveTimer > 0) {
          // Continue moving
          cow.x += dx * cow.walkSpeed;
          cow.y += dy * cow.walkSpeed;
        } else {
          // Reached target or time up, enter idle state
          cow.state = 'idle';
          cow.moveTimer = random(100, 200);
        }
      } else if (cow.state === 'eating') {
        // Eating state: stay still, head up and down
        if (cow.moveTimer <= 0) {
          // Eating end, enter idle state
          cow.state = 'idle';
          cow.moveTimer = random(100, 200);
        }
      }
    }
    
    // Draw cow
    push();
    
    // Reset render state
    noFill();
    noStroke();
    
    // Calculate cow's height on terrain
    let terrainHeight = terrain[Math.floor(cow.x)][Math.floor(cow.y)];
    
    // Place cow on terrain - using same coordinate system as sheep
    translate(cow.x * scl, cow.y * scl, terrainHeight + 7);
    
    // Rotate based on cow's movement direction
    rotateZ(cow.rotation);
    
    // Draw cow body (main body) - support grayscale mode
    noStroke();
    let bodyColor = cow.bodyColor;
    if (fountainChallenge.grayScaleMode) {
      let r = red(bodyColor), g = green(bodyColor), b = blue(bodyColor), a = alpha(bodyColor);
      bodyColor = toGrayScale(r, g, b, a);
    }
    fill(bodyColor);
    
    // Body
    push();
    if (cow.isHolstein) {
      // If cow, need to draw pattern
      noStroke();
      ellipsoid(cow.size * 1.0, cow.size * 0.6, cow.size * 0.8);
      
      // Add black spots - support grayscale mode
      noStroke();
      let spotColor = cow.spotColor;
      if (fountainChallenge.grayScaleMode) {
        let r = red(spotColor), g = green(spotColor), b = blue(spotColor), a = alpha(spotColor);
        spotColor = toGrayScale(r, g, b, a);
      }
      fill(spotColor);
      
      // Use fixed spot positions
      const spotPositions = [
        {x: -0.5, y: -0.2, z: 0.4, size: 0.3},
        {x: 0.3, y: 0.25, z: 0.5, size: 0.25},
        {x: -0.2, y: 0.3, z: -0.3, size: 0.2},
        {x: 0.6, y: -0.1, z: -0.1, size: 0.35},
        {x: -0.4, y: -0.3, z: -0.4, size: 0.3}
      ];
      
      // Draw fixed position spots
      for (let spot of spotPositions) {
        push();
        translate(
          cow.size * spot.x,
          cow.size * spot.y,
          cow.size * spot.z
        );
        sphere(cow.size * spot.size);
        pop();
      }
    } else {
      // Regular cow, solid color
      noStroke();
      ellipsoid(cow.size * 1.0, cow.size * 0.6, cow.size * 0.8);
    }
    pop();
    
    // Draw cow head
    push();
    translate(cow.size * 0.8, 0, cow.size * 0.2);
    
    // Head - support grayscale mode
    noStroke();
    let headColor = cow.headColor;
    if (fountainChallenge.grayScaleMode) {
      let r = red(headColor), g = green(headColor), b = blue(headColor), a = alpha(headColor);
      headColor = toGrayScale(r, g, b, a);
    }
    fill(headColor);
    
    // If cow in eating state, head will move up and down
    if (cow.state === 'eating') {
             // Simulate cow lowering head to eat grass action
      rotateX(sin(frameCount * 0.05) * 0.2 + 0.3);
    }
    
    // Head shape
    ellipsoid(cow.size * 0.5, cow.size * 0.35, cow.size * 0.4);
    
    // Eyes
    noStroke();
    fill(30, 30, 30);
    push();
    translate(cow.size * 0.2, -cow.size * 0.2, cow.size * 0.15);
    sphere(cow.size * 0.08);
    pop();
    
    push();
    translate(cow.size * 0.2, cow.size * 0.2, cow.size * 0.15);
    sphere(cow.size * 0.08);
    pop();
    
    // Ears
    noStroke();
    fill(cow.headColor);
    push();
    translate(-cow.size * 0.1, -cow.size * 0.25, cow.size * 0.2);
    rotateZ(-PI/4);
    rotateX(PI/6);
    ellipsoid(cow.size * 0.15, cow.size * 0.1, cow.size * 0.2);
    pop();
    
    push();
    translate(-cow.size * 0.1, cow.size * 0.25, cow.size * 0.2);
    rotateZ(PI/4);
    rotateX(PI/6);
    ellipsoid(cow.size * 0.15, cow.size * 0.1, cow.size * 0.2);
    pop();
    
    // Nose
    fill(100, 100, 100);
    push();
    translate(cow.size * 0.4, 0, 0);
    rotateY(HALF_PI);
    ellipsoid(cow.size * 0.2, cow.size * 0.15, cow.size * 0.1);
    pop();
    
    // Draw cow horns
    noStroke();
    fill(240, 230, 200); // Beige
    push();
    translate(cow.size * 0.1, -cow.size * 0.25, cow.size * 0.3);
    rotateZ(-PI/4);
    rotateX(-PI/8);
    cone(cow.size * 0.08, cow.size * 0.3, 8, 1);
    pop();
    
    push();
    translate(cow.size * 0.1, cow.size * 0.25, cow.size * 0.3);
    rotateZ(PI/4);
    rotateX(-PI/8);
    cone(cow.size * 0.08, cow.size * 0.3, 8, 1);
    pop();
    
    // Draw cow tail
    push();
    translate(-cow.size * 0.8, 0, cow.size * 0.3);
    
    // Tail base
    noStroke();
    fill(cow.bodyColor);
    rotateZ(PI);
    rotateX(-PI/8);
    cylinder(cow.size * 0.1, cow.size * 0.6, 8, 1);
    
    // Tail brush
    translate(0, 0, -cow.size * 0.5);
    noStroke();
    fill(40, 40, 40); // Tail end usually black
    sphere(cow.size * 0.15);
    pop();
    
    // Draw cow legs - Four thick legs
    noStroke();
    fill(cow.legColor);
    
    // Adjust leg connection points and angles
    let legBaseHeight = -cow.size * 0.7; // Raise leg connection point
    let legWidth = cow.size * 0.15;
    let legLength = cow.size * 1.4;
    
    // Set leg animation based on cow state
    let legAngle = 0;
    if (cow.state === 'walking') {
      // Walking leg movement
      legAngle = sin(frameCount * 0.1) * 0.2; // Cow legs move slower
    }
    
    // Front legs
    push();
    translate(cow.size * 0.6, -cow.size * 0.3, legBaseHeight);
    rotateX(HALF_PI + legAngle);
    ellipsoid(legWidth, legWidth, legLength * 0.5); // Use ellipsoid instead of cylinder
    pop();
    
    push();
    translate(cow.size * 0.6, cow.size * 0.3, legBaseHeight);
    rotateX(HALF_PI - legAngle);
    ellipsoid(legWidth, legWidth, legLength * 0.5);
    pop();
    
    // Back legs
    push();
    translate(-cow.size * 0.6, -cow.size * 0.3, legBaseHeight);
    rotateX(HALF_PI - legAngle);
    ellipsoid(legWidth, legWidth, legLength * 0.5);
    pop();
    
    push();
    translate(-cow.size * 0.6, cow.size * 0.3, legBaseHeight);
    rotateX(HALF_PI + legAngle);
    ellipsoid(legWidth, legWidth, legLength * 0.5);
    pop();
    
    pop(); // End head
    
    pop(); // End entire cow drawing
  }
  
  // End time reset render state
  noStroke();
  noFill();
} 