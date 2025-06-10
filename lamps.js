// Initialize lamp function
function initializeLamps() {
  lampList = [];
  
  // Create a local object position tracking array
  let localPlacedObjects = [];
  
  // Place lamps on both sides of the river
  let riverCenterX = cols / 2;
  let riverWidth = 12;
  let lampSpacing = 15; // Place one lamp every 15 grid units
  
  // Helper function - check if two objects overlap
  function isOverlapping(x1, y1, r1, x2, y2, r2) {
    let distance = dist(x1, y1, x2, y2);
    return distance < (r1 + r2 + 2); // Add extra safety distance
  }
  
  // Check if position overlaps with other lamps
  function isPositionAvailable(x, y, radius) {
    for (let obj of localPlacedObjects) {
      if (isOverlapping(x, y, radius, obj.x, obj.y, obj.r)) {
        return false;
      }
    }
    return true;
  }
  
  // Left side of river
  for (let y = 10; y < rows - 10; y += lampSpacing) {
    let x = riverCenterX - riverWidth - 2; // Leave some distance from river edge
    
    // Ensure position is suitable
    if (x >= 0 && x < cols && y >= 0 && y < rows) {
      // Check if too close to other objects
      if (isPositionAvailable(x, y, 8)) {
        let lampColor = color(255, 255, 220); // Pure white light
        let poleColor = color(80, 80, 80); // Gray lamp pole
        
        lampList.push({
          x: x,
          y: y,
          px: x * scl,
          py: y * scl,
          pz: terrain[x][y],
          height: 35, // Lamp pole height
          poleRadius: 1.2, // Lamp pole radius
          lampSize: 4, // Light bulb size
          lampColor: lampColor,
          poleColor: poleColor,
          glowIntensity: random(0.8, 1.2)
        });
        
        // Add to local placed objects list
        localPlacedObjects.push({x: x, y: y, r: 8});
      }
    }
  }
  
  // Right side of river
  for (let y = 10; y < rows - 10; y += lampSpacing) {
    let x = riverCenterX + riverWidth + 2; // Leave some distance from river edge
    
    // Ensure position is suitable
    if (x >= 0 && x < cols && y >= 0 && y < rows) {
      // Check if too close to other objects
      if (isPositionAvailable(x, y, 8)) {
        let lampColor = color(255, 255, 220); // Pure white light
        let poleColor = color(80, 80, 80); // Gray lamp pole
        
        lampList.push({
          x: x,
          y: y,
          px: x * scl,
          py: y * scl,
          pz: terrain[x][y],
          height: 35, // Lamp pole height
          poleRadius: 1.2, // Lamp pole radius
          lampSize: 4, // Light bulb size
          lampColor: lampColor,
          poleColor: poleColor,
          glowIntensity: random(0.8, 1.2)
        });
        
        // Add to local placed objects list
        localPlacedObjects.push({x: x, y: y, r: 8});
      }
    }
  }
  
  console.log(`Initialized ${lampList.length} lamps`);
}

// Draw lamps - ensure perpendicular to ground
function drawLamps() {
  for (let lamp of lampList) {
    push();
    
    // Move to lamp position
    translate(lamp.px, lamp.py, lamp.pz);
    
    // Base - flat cylinder
    push();
    fill(60, 60, 60);
    noStroke();
    cylinder(lamp.poleRadius * 2.5, 2, 16, 1);
    pop();
    
    // Main lamp pole - perpendicular to ground
    push();
    fill(lamp.poleColor);
    noStroke();
    rotateX(-PI/2); // Key modification: rotate 90 degrees to make pole perpendicular to ground
    translate(0, lamp.height/2, 0);
    cylinder(lamp.poleRadius, lamp.height, 8, 1);
    
    // Light bulb and shade - at top of pole
    translate(0, lamp.height/2, 0); // Move to top of pole
    
    // Light bulb base
    fill(50, 50, 50);
    sphere(lamp.poleRadius * 1.8);
    
    // Lamp shade
    translate(0, lamp.lampSize, 0);
    fill(200, 200, 200, 180);
    sphere(lamp.lampSize);
    
    // Light - glowing effect
    let frameAlpha = 220 + sin(frameCount * 0.1) * 35;
    fill(255, 255, 220, frameAlpha);
    sphere(lamp.lampSize * 0.7);
    pop();
    
    pop(); // Entire lamp
  }
} 