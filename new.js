// Game canvas setup
const canvas = document.createElement('canvas');
/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext('2d');
if (!ctx) {
    throw new Error('Could not get 2D context from canvas');
}

// Add CSS to body and canvas
document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.backgroundColor = '#1D201F';
document.body.style.overflow = 'hidden';  // Prevent scrollbars

// Create multiplayer button container
const multiplayerContainer = document.createElement('div');
multiplayerContainer.style.position = 'fixed';
multiplayerContainer.style.bottom = '20px';
multiplayerContainer.style.left = '50%';
multiplayerContainer.style.transform = 'translateX(-50%)';
multiplayerContainer.style.textAlign = 'center';
multiplayerContainer.style.zIndex = '1000';

// Create multiplayer button
const multiplayerButton = document.createElement('button');
multiplayerButton.textContent = 'MULTIPLAYER';
multiplayerButton.style.backgroundColor = '#1D201F';
multiplayerButton.style.border = '2px dashed #D1D1D1';
multiplayerButton.style.color = '#D1D1D1';
multiplayerButton.style.padding = '10px 20px';
multiplayerButton.style.cursor = 'pointer';
multiplayerButton.style.fontFamily = 'Humane';
multiplayerButton.style.fontSize = '24px';
multiplayerButton.style.letterSpacing = '2px';

// Create modal for code sharing
const modal = document.createElement('div');
modal.style.display = 'none';
modal.style.position = 'fixed';
modal.style.top = '50%';
modal.style.left = '50%';
modal.style.transform = 'translate(-50%, -50%)';
modal.style.backgroundColor = '#1D201F';
modal.style.border = '2px dashed #D1D1D1';
modal.style.padding = '20px';
modal.style.zIndex = '1001';
modal.style.textAlign = 'center';
modal.style.fontFamily = 'Humane';
modal.style.letterSpacing = '2px';

// Generate random room code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

let myRoomCode = generateRoomCode();
let isHost = false;
let isMultiplayer = false;

// Add click handler for multiplayer button
multiplayerButton.addEventListener('click', () => {
    // Initialize WebSocket if not already done
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        initializeWebSocket();
    }
    
    // Generate new room code only if we don't have one
    if (!isMultiplayer) {
        myRoomCode = generateRoomCode();
    }

    modal.style.display = 'block';
    modal.innerHTML = `
        <div style="color: #D1D1D1; margin-bottom: 20px;">
            <div style="font-size: 24px; margin-bottom: 10px;">YOUR CODE</div>
            <div style="font-size: 32px; margin-bottom: 20px;">${myRoomCode}</div>
            <div style="font-size: 24px; margin-bottom: 10px;">JOIN GAME</div>
            <input type="text" id="joinCode" placeholder="Enter code" 
                style="background: #1D201F; border: 2px dashed #D1D1D1; color: #D1D1D1; 
                padding: 5px; margin-bottom: 10px; font-family: Humane; font-size: 20px; 
                text-align: center; letter-spacing: 2px;">
            <br>
            <button id="joinButton" 
                style="background: #1D201F; border: 2px dashed #D1D1D1; color: #D1D1D1;
                padding: 5px 15px; margin-top: 10px; cursor: pointer; font-family: Humane;
                font-size: 20px; letter-spacing: 2px;">JOIN</button>
            <button id="closeModal" 
                style="background: #1D201F; border: 2px dashed #D1D1D1; color: #D1D1D1;
                padding: 5px 15px; margin-top: 10px; margin-left: 10px; cursor: pointer;
                font-family: Humane; font-size: 20px; letter-spacing: 2px;">CLOSE</button>
            <button id="hostGame" 
                style="background: #1D201F; border: 2px dashed #D1D1D1; color: #D1D1D1;
                padding: 5px 15px; margin-top: 10px; margin-left: 10px; cursor: pointer;
                font-family: Humane; font-size: 20px; letter-spacing: 2px;">HOST GAME</button>
        </div>
    `;

    // Add event listeners for the modal buttons
    document.getElementById('closeModal').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    document.getElementById('joinButton').addEventListener('click', () => {
        const code = document.getElementById('joinCode').value.toUpperCase();
        if (code && code.length === 6) {
            joinGame(code);
        }
    });

    document.getElementById('hostGame').addEventListener('click', () => {
        joinGame(myRoomCode);
    });
});

// Add elements to the document
multiplayerContainer.appendChild(multiplayerButton);
document.body.appendChild(multiplayerContainer);
document.body.appendChild(modal);

canvas.style.display = 'block';  // Remove any default spacing
canvas.style.backgroundColor = '#1D201F';
canvas.style.border = '5px dashed #D1D1D1';  // Changed from dotted to dashed

// Function to update canvas size
function updateCanvasSize() {
    // Use clientWidth instead of innerWidth to account for scrollbars
    canvas.width = document.documentElement.clientWidth;
    canvas.height = 600;  // Keep fixed height
}

// Function to create initial platform configuration
function createInitialPlatforms() {
    const platformWidth = 100;
    const gapBetweenPlatforms = 10;  // Fixed 10 pixel gap
    
    // Calculate total width needed for all platforms and gaps
    const totalWidth = (platformWidth * 3) + (gapBetweenPlatforms * 2);
    
    // Calculate starting X position to center the group
    const startX = Math.round((canvas.width - totalWidth) / 2);  // Round to avoid subpixel rendering
    
    return [
        createPlatform(startX, 300, platformWidth, '#79312D', true),
        createPlatform(startX + platformWidth + gapBetweenPlatforms, 300, platformWidth, '#273D3E'),
        createPlatform(startX + (platformWidth + gapBetweenPlatforms) * 2, 300, platformWidth, '#21282B')
    ];
}

// Helper function to create a platform with consistent properties
function createPlatform(x, y, width, color, isDisappearing = false) {
    return {
        x: x,
        y: y,
        width: width,
        height: width,
        color: color,
        timer: isDisappearing ? null : undefined,
        countdown: isDisappearing ? 3 : undefined,
        hookGiven: false
    };
}

// Initialize platforms array
let platforms = createInitialPlatforms();

// Function to reset platform positions
function resetPlatformPositions() {
    platforms = createInitialPlatforms();
}

// Initial size setup
updateCanvasSize();
resetPlatformPositions();

// Handle window resizing
window.addEventListener('resize', () => {
    const oldWidth = canvas.width;
    updateCanvasSize();
    
    // If game hasn't started, just recreate platforms centered in new width
    if (!player.hasMoved) {
        resetPlatformPositions();
        // Center player
        player.x = canvas.width/2 - player.width/2;
    } else {
        // Find and center only the initial platforms (first 3)
        const initialPlatforms = platforms.slice(0, 3);
        const otherPlatforms = platforms.slice(3);
        
        // Center the initial platforms group
        const groupWidth = (initialPlatforms[2].x + initialPlatforms[2].width) - initialPlatforms[0].x;
        const currentCenter = initialPlatforms[0].x + groupWidth/2;
        const targetCenter = canvas.width/2;
        const offset = targetCenter - currentCenter;
        
        // Move initial platforms by the offset
        initialPlatforms.forEach(platform => {
            platform.x += offset;
        });
        
        // Scale other platforms proportionally
        const widthRatio = canvas.width / oldWidth;
        otherPlatforms.forEach(platform => {
            platform.x = platform.x * widthRatio;
        });
        
        // Recombine platforms
        platforms = [...initialPlatforms, ...otherPlatforms];

        // Keep player's position relative to the center of the screen
        const playerDistanceFromCenter = player.x + player.width/2 - oldWidth/2;
        player.x = canvas.width/2 + playerDistanceFromCenter - player.width/2;
    }
});

document.body.appendChild(canvas);

// Game objects
const player = {
    x: canvas.width/2 - 15,
    y: 200,
    width: 30,
    height: 30,
    normalHeight: 30,
    squashAmount: 0,
    squashSpeed: 0.3,
    maxSquash: 10,
    velocityY: 0,
    velocityX: 0,
    speed: 5,
    boostedSpeed: 12,
    airControl: 0.8,
    airFriction: 0.92,
    jumpForce: -5,
    superJumpForce: -19,
    isJumping: false,
    lastDirection: 0,
    canJump: true,
    onSuperJumpPlatform: false,
    onSpeedPlatform: false,
    jumpMomentum: 0,
    highestY: 200,
    hasMoved: false,
    doubleJumps: 0,
    canDoubleJump: false,
    jumpKeyReleased: true,
    isCurrentJumpSuper: false,
    hooks: 0,
    counterOpacity: 0,
    label: 'PLAYER 1',
    isHooked: false,
    hookX: 0,
    hookY: 0,
    ropeLength: 0,
    activeRopes: []  // Array to store released ropes
};

// Physics constants
const gravity = 0.5;
const friction = 0.8;

// Input handling
const keys = {};
document.addEventListener('keydown', (e) => {
    // Map both WASD and arrow keys to the same actions
    switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
            keys['ArrowUp'] = true;
            break;
        case 'a':
        case 'arrowleft':
            keys['ArrowLeft'] = true;
            break;
        case 's':
        case 'arrowdown':
            keys['ArrowDown'] = true;
            break;
        case 'd':
        case 'arrowright':
            keys['ArrowRight'] = true;
            break;
    }
});

document.addEventListener('keyup', (e) => {
    // Map both WASD and arrow keys to the same actions
    switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
            keys['ArrowUp'] = false;
            break;
        case 'a':
        case 'arrowleft':
            keys['ArrowLeft'] = false;
            break;
        case 's':
        case 'arrowdown':
            keys['ArrowDown'] = false;
            break;
        case 'd':
        case 'arrowright':
            keys['ArrowRight'] = false;
            break;
    }
});

// Add after Game objects section
const input = {
    lastKeyPressed: null
};

// Update the camera object
const camera = {
    y: 0,
    followThreshold: canvas.height/3,  // Follow starts at top third of screen
    verticalOffset: -30  // Larger offset to keep player higher in view
};

// Add after platforms array
let highestPlatform = 300; // Starting y-position of first platforms
const platformColors = ['#79312D', '#273D3E', '#21282B'];
const platformGap = 150; // Vertical space between platform rows

// Add font setup for countdown display
ctx.font = '48px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

// Add high score tracking
let highScore = parseInt(localStorage.getItem('jumpGameHighScore')) || 0;

// Add particle system
const particles = [];
const particleColors = ['#8B8B8B', '#707070', '#595959'];  // Different shades of gray for dust

class Particle {
    constructor(x, y, force) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 4 + 2;  // Random size between 2-6
        this.speedX = (Math.random() - 0.5) * force * 2;  // Spread based on impact force
        this.speedY = (Math.random() * -force) / 2;  // Initial upward velocity
        this.gravity = 0.2;
        this.life = 1;  // Life from 1 to 0
        this.decay = Math.random() * 0.02 + 0.02;  // Random decay rate
        this.color = particleColors[Math.floor(Math.random() * particleColors.length)];
    }

    update() {
        this.x += this.speedX;
        this.speedY += this.gravity;
        this.y += this.speedY;
        this.life -= this.decay;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

function createLandingParticles(x, y, width, force) {
    const numParticles = Math.min(Math.floor(force * 3), 20);  // More particles for harder impacts, max 20
    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle(
            x + Math.random() * width,  // Random position across player width
            y + player.height,          // Bottom of player
            force
        ));
    }
}

function generateNewPlatforms() {
    const playerHeight = isMultiplayer ? Math.min(player.y, otherPlayer ? otherPlayer.y : player.y) : player.y;
    if (playerHeight < highestPlatform - 300) {
        // If we're not the host, request platform generation instead of generating
        if (isMultiplayer && !isHost) {
            ws.send(JSON.stringify({
                type: 'requestNewPlatforms',
                highestPlatform: highestPlatform - platformGap,
                generated: false,
                screenWidth: canvas.width,
                playerY: player.y
            }));
            return;
        }

        // Rest of the platform generation code stays the same
        const numPlatforms = Math.floor(Math.random() * 2) + 2;
        const newPlatforms = [];
        const platformWidth = 100;
        const minGapBetweenPlatforms = 20;

        function isValidPosition(x, existingPlatforms) {
            for (const platform of existingPlatforms) {
                if (Math.abs(x - platform.x) < platformWidth + minGapBetweenPlatforms) {
                    return false;
                }
            }
            return true;
        }

        // Generate platforms with random positions
        for (let i = 0; i < numPlatforms; i++) {
            let x;
            let attempts = 0;
            do {
                x = Math.random() * (canvas.width - platformWidth);
                attempts++;
            } while (!isValidPosition(x, newPlatforms) && attempts < 10);

            const platform = {
                x: x,
                y: highestPlatform - platformGap,
                width: platformWidth,
                height: platformWidth,
                color: i === 0 ? '#21282B' : platformColors[Math.floor(Math.random() * 2)],
                timer: i === 0 ? null : null,
                countdown: i === 0 ? null : 3,
                hookGiven: false
            };
            newPlatforms.push(platform);
        }

        platforms.push(...newPlatforms);
        highestPlatform -= platformGap;

        // Remove platforms that are too far below
        const lowestPlayerY = isMultiplayer ? 
            Math.max(player.y, otherPlayer ? otherPlayer.y : player.y) : 
            player.y;
        platforms = platforms.filter(platform => 
            platform.y < lowestPlayerY + canvas.height * 2
        );

        // If we're the host, send the new platforms to other players
        if (isMultiplayer && isHost) {
            ws.send(JSON.stringify({
                type: 'platformUpdate',
                platforms: platforms.map(platform => ({
                    ...platform,
                    x: platform.x * (800 / canvas.width) // Convert to standard width
                })),
                highestPlatform: highestPlatform,
                generated: true
            }));
        }
    }
}

// Add after physics constants
// Ghost player system
let currentRunPositions = [];  // Store positions for current run
let allPreviousRuns = [];     // Store all previous runs, not just the last one
let ghostReplayFrames = [];   // Track frame for each ghost

// Modify resetGame function to handle multiple ghosts
function resetGame() {
    // Save current run before reset if player has moved
    if (player.hasMoved && currentRunPositions.length > 0) {
        // Keep only the last 5 runs to prevent too many ghosts
        if (allPreviousRuns.length >= 5) {
            allPreviousRuns.shift();  // Remove oldest run
        }
        allPreviousRuns.push([...currentRunPositions]);
        ghostReplayFrames = allPreviousRuns.map(() => 0);  // Reset all ghost frames
    }
    
    // If player was holding a rope when they died, convert it to a released rope
    if (player.isHooked) {
        const numSegments = 10;
        const centerX = player.x + player.width/2;
        const centerY = player.y + player.height/2;
        const dx = centerX - player.hookX;
        const dy = centerY - player.hookY;
        const totalLength = Math.sqrt(dx * dx + dy * dy);
        const segmentLength = totalLength / numSegments;
        
        const points = [];
        // Add hook point (stays fixed)
        points.push({
            x: player.hookX,
            y: player.hookY,
            velocityY: 0,
            velocityX: 0,
            isAnchored: true
        });
        
        // Add points along the rope's length
        for (let i = 1; i <= numSegments; i++) {
            const t = i / numSegments;
            points.push({
                x: player.hookX + dx * t,
                y: player.hookY + dy * t,
                velocityY: 0,
                velocityX: 0,
                isAnchored: false
            });
        }
        
        player.activeRopes.push({
            points: points,
            segmentLength: segmentLength,
            totalLength: totalLength,
            windOffset: Math.random() * Math.PI * 2
        });
    }
    
    // Reset current run tracking
    currentRunPositions = [];

    // Update high score before reset if needed
    const currentScore = Math.max(0, Math.floor((200 - player.highestY) / 10));
    if (currentScore > highScore) {
        highScore = currentScore;
        localStorage.setItem('jumpGameHighScore', highScore.toString());
    }

    // Reset player position and physics
    player.x = canvas.width/2 - 15;
    player.y = 200;
    player.velocityY = 0;
    player.velocityX = 0;
    player.isJumping = false;
    player.lastDirection = 0;
    player.canJump = true;
    player.onSuperJumpPlatform = false;
    player.onSpeedPlatform = false;
    player.jumpMomentum = 0;
    player.highestY = 200;
    player.hasMoved = false;
    player.doubleJumps = 0;
    player.canDoubleJump = false;
    player.jumpKeyReleased = true;
    player.isCurrentJumpSuper = false;
    player.squashAmount = 0;
    player.height = player.normalHeight;
    player.hooks = 0;
    player.counterOpacity = 0;
    player.isHooked = false;  // Release any held rope

    // Reset camera
    camera.y = camera.verticalOffset;

    // Reset platforms using standard width if in multiplayer
    platforms = createInitialPlatforms();

    // Reset highest platform tracker
    highestPlatform = 300;
}

// Add mouse position tracking
const mouse = {
    x: 0,
    y: 0,
    isClicked: false
};

// Track mouse position
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top - camera.y;  // Adjust for camera
});

// Modify the mousedown event handler for rope creation
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top - camera.y;

    if (player.isHooked) {
        // Store the current rope before releasing
        const numSegments = 10;
        const centerX = player.x + player.width/2;
        const centerY = player.y + player.height/2;
        const dx = centerX - player.hookX;
        const dy = centerY - player.hookY;
        const totalLength = Math.sqrt(dx * dx + dy * dy);
        const segmentLength = totalLength / numSegments;
        
        const points = [];
        // Add hook point (stays fixed)
        points.push({
            x: player.hookX,
            y: player.hookY,
            velocityY: 0,
            velocityX: 0,
            isAnchored: true
        });
        
        // Add points along the rope's length
        for (let i = 1; i <= numSegments; i++) {
            const t = i / numSegments;
            points.push({
                x: player.hookX + dx * t,
                y: player.hookY + dy * t,
                velocityY: 0,
                velocityX: 0,
                isAnchored: false
            });
        }
        
        const newRope = {
            points: points,
            segmentLength: segmentLength,
            totalLength: totalLength,
            windOffset: Math.random() * Math.PI * 2
        };
        
        player.activeRopes.push(newRope);
        
        // Send rope release update to other player
        if (isMultiplayer) {
            ws.send(JSON.stringify({
                type: 'ropeUpdate',
                action: 'release',
                rope: {
                    points: points.map(p => ({ x: p.x * (800 / canvas.width), y: p.y, isAnchored: p.isAnchored })),
                    segmentLength: segmentLength * (800 / canvas.width),
                    totalLength: totalLength * (800 / canvas.width),
                    windOffset: newRope.windOffset
                }
            }));
        }
        
        player.isHooked = false;
    } else {
        // Create new rope
        player.hookX = clickX;
        player.hookY = clickY;
        player.isHooked = true;
        
        // Calculate initial rope length
        const dx = clickX - (player.x + player.width/2);
        const dy = clickY - (player.y + player.height/2);
        player.ropeLength = Math.sqrt(dx * dx + dy * dy);
        
        // Send rope creation update to other player
        if (isMultiplayer) {
            ws.send(JSON.stringify({
                type: 'ropeUpdate',
                action: 'create',
                hookX: clickX * (800 / canvas.width),
                hookY: clickY,
                ropeLength: player.ropeLength * (800 / canvas.width)
            }));
        }
    }
});

// Remove the right-click handler since we're using left-click for release
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Add after particle system and before rope classes
class Bird {
    constructor(isSmall = false) {
        this.isSmall = isSmall;
        this.direction = Math.random() < 0.5 ? -1 : 1;
        this.x = this.direction === 1 ? -20 : canvas.width + 20;
        const spawnHeightRange = 400;
        this.y = player.y - spawnHeightRange/2 + Math.random() * spawnHeightRange;
        this.speed = isSmall ? (1.5 + Math.random() * 1.5) : (2 + Math.random() * 2);
        this.wingOffset = 0;
        this.wingSpeed = isSmall ? 0.15 : 0.1;
        this.wingDirection = 1;
        this.size = isSmall ? 4 : 6;
        this.pushForce = isSmall ? 6 : 8;
        this.bodyX = 0;
        this.bounceForce = isSmall ? -6 : -8;
        this.isBehindTitle = Math.random() < 0.4;
        this.isPerched = false;
        this.targetPlatform = null;
        this.perchTimer = 0;
        this.maxPerchTime = 3000 + Math.random() * 2000;
        this.velocityY = 0;
        this.isFleeingDiagonally = false;
        this.fleeTimer = 0;
        this.maxFleeTime = 30; // About 0.5 seconds at 60fps
    }

    findPerchTarget() {
        // Only look for platforms if we're not already perched
        if (!this.isPerched) {
            for (const platform of platforms) {
                // Skip platforms that:
                // 1. The player is on
                // 2. Are red and have disappeared (countdown <= 0)
                // 3. Are red and have started their countdown
                const playerOnPlatform = 
                    player.x + player.width > platform.x &&
                    player.x < platform.x + platform.width &&
                    player.y + player.height >= platform.y &&
                    player.y + player.height <= platform.y + platform.height;
                
                const isDisappearingPlatform = platform.color === '#79312D' && 
                    (platform.countdown <= 0 || platform.timer !== null);
                
                if (!playerOnPlatform && !isDisappearingPlatform) {
                    // Choose either left or right edge
                    const edgeX = Math.random() < 0.5 ? platform.x : platform.x + platform.width;
                    const distanceToEdge = Math.abs(this.x - edgeX);
                    const heightDifference = Math.abs(this.y - (platform.y - this.size));
                    
                    // Only consider platforms that are ahead in our direction of travel
                    const isAheadOfUs = (this.direction === 1 && edgeX > this.x) || 
                                      (this.direction === -1 && edgeX < this.x);
                    
                    // If we're close enough to the platform and it's roughly at our height
                    // and it's in the direction we're moving
                    if (distanceToEdge < 100 && heightDifference < 30 && isAheadOfUs) {
                        this.targetPlatform = platform;
                        this.targetX = edgeX;
                        return true;
                    }
                }
            }
        }
        return false;
    }

    update() {
        if (this.isPerched) {
            // Check if player landed on the platform or if it's a red platform that started countdown
            const playerLanded = 
                player.x + player.width > this.targetPlatform.x &&
                player.x < this.targetPlatform.x + this.targetPlatform.width &&
                player.y + player.height >= this.targetPlatform.y &&
                player.y + player.height <= this.targetPlatform.y + this.targetPlatform.height;

            const platformDisappearing = 
                this.targetPlatform.color === '#79312D' && 
                (this.targetPlatform.countdown <= 0 || this.targetPlatform.timer !== null);

            if (playerLanded || platformDisappearing) {
                // Fly away from the player's position
                const playerCenterX = player.x + player.width/2;
                const birdCenterX = this.x + this.size;
                // Set direction away from player
                this.direction = playerCenterX > birdCenterX ? -1 : 1;
                
                this.isPerched = false;
                this.velocityY = -4; // Stronger initial upward boost
                this.perchTimer = 0;
                this.targetPlatform = null;
                this.isFleeingDiagonally = true;
                this.fleeTimer = 0;
            } else {
                // Rest of perched behavior...
                this.perchTimer += 16;
                if (this.perchTimer >= this.maxPerchTime) {
                    this.isPerched = false;
                    this.direction = Math.random() < 0.5 ? -1 : 1;
                    this.velocityY = -2;
                    this.perchTimer = 0;
                    this.targetPlatform = null;
                }
                this.wingOffset += (this.wingSpeed * 0.5) * this.wingDirection;
            }
        } else {
            if (this.isFleeingDiagonally) {
                // Update diagonal flight
                this.fleeTimer++;
                this.x += this.speed * 1.5 * this.direction; // Faster horizontal movement while fleeing
                this.y += this.velocityY;
                this.velocityY += 0.15; // Gradually reduce upward movement
                
                if (this.fleeTimer >= this.maxFleeTime) {
                    this.isFleeingDiagonally = false;
                    this.velocityY = 0;
                }
            } else if (this.isSmall && this.findPerchTarget()) {
                // Move towards perch point with smoother movement
                const dx = this.targetX - this.x;
                const dy = (this.targetPlatform.y - this.size) - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 2) {
                    // Close enough to perch
                    this.isPerched = true;
                    this.x = this.targetX;
                    this.y = this.targetPlatform.y - this.size;
                } else {
                    // Smoother approach to perch point
                    const speed = Math.min(this.speed, dist * 0.2); // Slow down as we get closer
                    this.x += (dx / dist) * speed;
                    this.y += (dy / dist) * speed;
                }
            } else {
                // Normal movement
        this.x += this.speed * this.direction;
            }
            
        this.bodyX = this.x + (this.direction === 1 ? this.size * 0.8 : -this.size * 2.8);
        }
        
        // Rest of the method...
        this.wingOffset += this.wingSpeed * this.wingDirection;
        if (this.wingOffset > 0.5 || this.wingOffset < -0.5) {
            this.wingDirection *= -1;
        }

        const collision = this.checkPlayerCollision();
        if (collision) {
            // Create feather particles at the collision point
            const birdCenterX = this.x + (this.direction === 1 ? this.size * 1.5 : -this.size * 0.5);
            const birdCenterY = this.y;
            for (let i = 0; i < (this.isSmall ? 8 : 12); i++) {
                featherParticles.push(new FeatherParticle(birdCenterX, birdCenterY, this.isSmall));
            }

            // Push player in the same direction as the bird
            if (collision === 'top') {
                player.velocityY = this.bounceForce;
                player.velocityX = this.direction * Math.max(Math.abs(this.speed * 2), 4);
                player.isJumping = true;
                player.canJump = false;
                player.canDoubleJump = true;
            } else {
                player.velocityX = this.direction * Math.max(Math.abs(this.pushForce * 2), 6);
                player.velocityY = this.bounceForce * 0.7;
                player.isJumping = true;
            }
            return false;  // Remove bird after collision
        }

        return this.x > -50 && 
               this.x < canvas.width + 50 && 
               Math.abs((this.y + camera.y) - (player.y + camera.y)) < canvas.height;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.isSmall ? '#FFA500' : '#F8DC6B';  // Orange for small birds, golden for regular
        
        if (this.isSmall && this.isPerched) {
            // Draw sitting bird
            // Body is more rounded and lower to the platform
            ctx.fillRect(
                this.x + (this.direction === 1 ? 0 : -this.size * 2), 
                this.y,
                this.size * 2,
                this.size * 1.2
            );
            
            // Head is tucked in closer to body
            ctx.fillRect(
                this.x + (this.direction === 1 ? this.size * 2 : -this.size * 2.8), 
                this.y - this.size * 0.3,
                this.size * 0.8,
                this.size * 0.8
            );
            
            // Beak
            ctx.fillRect(
                this.x + (this.direction === 1 ? this.size * 2.8 : -this.size * 3.2), 
                this.y - this.size * 0.1,
                this.size * 0.4,
                this.size * 0.3
            );
            
            // Folded wings (just a small bump on the side)
            ctx.fillRect(
                this.bodyX + this.size * 0.25,
                this.y + this.size * 0.2,
                this.size,
                this.size * 0.4
            );
            
        } else {
            // Draw normal flying bird
        // Draw tail feathers
        ctx.fillRect(
            this.x + (this.direction === 1 ? 0 : -this.size * 2), 
            this.y - this.size/4,
            this.size * 0.8,
            this.size
        );
        
        // Draw body (longer and more streamlined)
        ctx.fillRect(
            this.bodyX, 
            this.y,
            this.size * 2,
            this.size
        );
        
        // Draw head with beak
        ctx.fillRect(
            this.x + (this.direction === 1 ? this.size * 2.8 : -this.size * 3.6), 
            this.y - this.size/3,
            this.size * 0.8,
            this.size * 0.8
        );
        
        // Draw beak
        ctx.fillRect(
            this.x + (this.direction === 1 ? this.size * 3.6 : -this.size * 4), 
            this.y - this.size/6,
            this.size * 0.4,
            this.size * 0.4
        );
        
            // Draw wings with reduced animation range when perched
            const wingOffsetMultiplier = this.isPerched ? 0.3 : 1;
        ctx.fillRect(
            this.bodyX + this.size * 0.25,
                this.y - this.size * 0.5 + this.wingOffset * this.size * wingOffsetMultiplier,
            this.size * 1.5,
            this.size
        );
        }
        
        ctx.restore();
    }

    checkPlayerCollision() {
        // Define bird hitbox
        const birdWidth = this.size * 3;
        const birdHeight = this.size * 1.5;
        const birdX = this.x + (this.direction === 1 ? 0 : -this.size);
        const birdY = this.y - this.size/2;

        // Check if player is within bird's horizontal bounds
        const horizontalCollision = (
            player.x + player.width > birdX &&
            player.x < birdX + birdWidth
        );

        // Check vertical collision, accounting for camera offset
        const playerBottom = player.y + player.height;
        const playerTop = player.y;
        const birdTop = birdY;
        const birdBottom = birdY + birdHeight;

        if (horizontalCollision) {
            if (playerBottom >= birdTop && 
                playerBottom <= birdTop + birdHeight/2 && 
                player.velocityY > 0) {
                return 'top';
            }
            
            if (playerTop < birdBottom && playerBottom > birdTop) {
                return 'side';
            }
        }
        return false;
    }
}

// Add birds array to track all birds
const birds = [];
const maxBirds = 5;  // Maximum number of birds at once
const birdSpawnChance = 0.02;  // 2% chance each frame to spawn a new bird

// Load custom fonts with different weights
const titleFont = new FontFace('Humane', 'url(Humane-VF.ttf)', {
    weight: '900'  // Black weight for title
});

const regularFont = new FontFace('Humane', 'url(Humane-VF.ttf)', {
    weight: 'bold'  // Bold weight for all other text
});

Promise.all([titleFont.load(), regularFont.load()]).then(function(loadedFaces) {
    loadedFaces.forEach(face => document.fonts.add(face));
}).catch(function(error) {
    console.error('Font loading failed:', error);
});

// Add after the ghost player system
// Multiplayer system
let otherPlayer = null;
let ws = null;
let playerId = null;
let bothPlayersReady = false;
let hasMovedInMultiplayer = false;

// Add server configuration
const SERVER_CONFIG = {
    WS_URL: window.location.hostname === 'localhost' 
        ? 'ws://localhost:3000'
        : `wss://${window.location.hostname}`
};

function initializeWebSocket() {
    // Connect to WebSocket server using configured URL
    ws = new WebSocket(SERVER_CONFIG.WS_URL);

    ws.onopen = () => {
        console.log('Connected to server');
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        alert('Failed to connect to game server. Please try again later.');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };

    ws.onclose = () => {
        console.log('Disconnected from server');
        isMultiplayer = false;
        otherPlayer = null;
        // Reset multiplayer state
        playerId = null;
        bothPlayersReady = false;
        hasMovedInMultiplayer = false;
    };
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'join':
            if (data.success) {
                isMultiplayer = true;
                isHost = data.isHost;
                playerId = data.playerId;
                
                // Set player labels based on host status
                player.label = isHost ? 'PLAYER 1' : 'PLAYER 2';
                
                // Reset player position to center for both host and guest
                player.x = canvas.width/2 - player.width/2;
                
                if (!isHost) {
                    // Guest moves slightly to the right after centering
                    player.x += 45;
                    // Request initial platform positions from host
                    ws.send(JSON.stringify({
                        type: 'requestInitialState',
                        screenWidth: canvas.width
                    }));
                } else {
                    // Host moves slightly to the left after centering
                    player.x -= 45;
                    // Keep current platform positions for host
                }
                player.y = 200;
                    modal.style.display = 'none';
            }
            break;
            
        case 'requestInitialState':
            if (isHost) {
                // Convert current platform positions to standard width
                const standardWidth = 800;
                const widthRatio = standardWidth / canvas.width;
                
                const standardPlatforms = platforms.map(platform => ({
                    ...platform,
                    x: platform.x * widthRatio
                }));
                
                ws.send(JSON.stringify({
                    type: 'initialState',
                    platforms: standardPlatforms,
                    highestPlatform: highestPlatform,
                    standardWidth: standardWidth
                }));
            }
            break;
            
        case 'initialState':
            if (!isHost) {
                const standardWidth = data.standardWidth;
                const widthRatio = canvas.width / standardWidth;
                
                // Adjust platform positions based on width ratio
                platforms = data.platforms.map(platform => ({
                    ...platform,
                    x: platform.x * widthRatio
                }));
                
                // Adjust player position based on width ratio
                player.x = player.x * widthRatio;
                
                highestPlatform = data.highestPlatform;
            }
            break;
            
        case 'platformUpdate':
            if (!isHost) {
                const standardWidth = 800;
                const widthRatio = canvas.width / standardWidth;
                
                // Always update platforms when receiving a platform update
                platforms = data.platforms.map(platform => ({
                    ...platform,
                    x: platform.x * widthRatio
                }));
                
                // Update highestPlatform to match host's state
                if (data.highestPlatform < highestPlatform) {
                    highestPlatform = data.highestPlatform;
                }
            }
            break;
            
        case 'playerUpdate':
            if (otherPlayer === null) {
                otherPlayer = {
                    x: data.x,
                    y: data.y,
                    width: 30,
                    height: 30,
                    velocityX: data.velocityX,
                    velocityY: data.velocityY,
                    label: isHost ? 'PLAYER 2' : 'PLAYER 1',
                    isHooked: data.isHooked,
                    hookX: data.hookX,
                    hookY: data.hookY,
                    ropeLength: data.ropeLength,
                    activeRopes: []
                };
            } else {
                // Convert positions based on screen width ratio
                const standardWidth = 800;
                const widthRatio = canvas.width / standardWidth;
                otherPlayer.x = data.x * widthRatio;
                otherPlayer.y = data.y;
                otherPlayer.velocityX = data.velocityX * widthRatio;
                otherPlayer.velocityY = data.velocityY;
                otherPlayer.isHooked = data.isHooked;
                otherPlayer.hookX = data.hookX * widthRatio;
                otherPlayer.hookY = data.hookY;
                otherPlayer.ropeLength = data.ropeLength * widthRatio;
            }
            break;
        case 'readyState':
            bothPlayersReady = data.bothPlayersReady;
            console.log('Ready state updated:', bothPlayersReady);  // Debug log
            break;
        case 'playerDisconnect':
            isMultiplayer = false;
            otherPlayer = null;
            otherPlayerRopes = [];  // Clear other player's ropes
            bothPlayersReady = false;
            hasMovedInMultiplayer = false;
            alert('Other player disconnected');
            break;
        case 'requestNewPlatforms':
            if (isHost) {
                // Generate new platforms based on the requesting player's position
                if (data.playerY < highestPlatform - 300) {
                    // Update host's highestPlatform to match the request
                    highestPlatform = data.highestPlatform + platformGap;
                    generateNewPlatforms();
                    
                    // Ensure the platforms are sent to the guest
                    ws.send(JSON.stringify({
                        type: 'platformUpdate',
                        platforms: platforms.map(platform => ({
                            ...platform,
                            x: platform.x * (800 / canvas.width)
                        })),
                        highestPlatform: highestPlatform,
                        generated: true
                    }));
                }
            }
            break;
        case 'platformTimer':
            if (!isHost) {
                const platform = platforms.find(p => 
                    p.x === data.platformX && 
                    p.y === data.platformY
                );
                if (platform) {
                    platform.timer = data.timer;
                    platform.countdown = data.countdown;
                }
            }
            break;
        case 'ropeUpdate':
            if (data.action === 'create') {
                // Other player created a new rope
                const widthRatio = canvas.width / 800;
                otherPlayer.isHooked = true;
                otherPlayer.hookX = data.hookX * widthRatio;
                otherPlayer.hookY = data.hookY;
                otherPlayer.ropeLength = data.ropeLength * widthRatio;
            } else if (data.action === 'release') {
                // Other player released their rope
                const widthRatio = canvas.width / 800;
                otherPlayer.isHooked = false;
                
                // Add the released rope to otherPlayerRopes
                const adjustedRope = {
                    ...data.rope,
                    points: data.rope.points.map(p => ({
                        ...p,
                        x: p.x * widthRatio,
                        velocityX: 0,
                        velocityY: 0
                    })),
                    segmentLength: data.rope.segmentLength * widthRatio,
                    totalLength: data.rope.totalLength * widthRatio
                };
                otherPlayerRopes.push(adjustedRope);
            }
            break;
    }
}

function sendPlayerUpdate() {
    if (ws && ws.readyState === WebSocket.OPEN && isMultiplayer) {
        const standardWidth = 800;
        const widthRatio = standardWidth / canvas.width;
        
        ws.send(JSON.stringify({
            type: 'playerUpdate',
            x: player.x * widthRatio,
            y: player.y,
            velocityX: player.velocityX * widthRatio,
            velocityY: player.velocityY,
            hasMovedBefore: hasMovedInMultiplayer,
            isHooked: player.isHooked,
            hookX: player.isHooked ? player.hookX * widthRatio : 0,
            hookY: player.isHooked ? player.hookY : 0,
            ropeLength: player.isHooked ? player.ropeLength * widthRatio : 0
        }));

        if (isHost) {
            const standardPlatforms = platforms.map(platform => ({
                ...platform,
                x: platform.x * widthRatio
            }));
            
            ws.send(JSON.stringify({
                type: 'platformUpdate',
                platforms: standardPlatforms,
                highestPlatform: highestPlatform,
                standardWidth: standardWidth
            }));
        }

        if (!hasMovedInMultiplayer && (keys['ArrowLeft'] || keys['ArrowRight'] || keys['ArrowUp'])) {
            hasMovedInMultiplayer = true;
        }
    }
}

// Add after the WebSocket initialization functions
function joinGame(code) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        // If not connected, try to connect first
        initializeWebSocket();
        // Wait for connection before sending join message
        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: 'join',
                code: code
            }));
        };
    } else {
        // If already connected, send join message immediately
        ws.send(JSON.stringify({
            type: 'join',
            code: code
        }));
    }
}

// Modify the drawing code to use a single function for player labels
function drawPlayerLabel(x, y, label, opacity = 1) {
    ctx.save();
    ctx.fillStyle = '#D1D1D1';
    ctx.font = 'bold 24px Humane';
    ctx.letterSpacing = '2px';
    ctx.textAlign = 'center';
    ctx.globalAlpha = opacity;
    ctx.fillText(label, x + player.width/2, y - 15);
    ctx.restore();
}

// Helper function to draw platform countdown
function drawPlatformCountdown(platform) {
    if (platform.color === '#79312D' && platform.timer !== null) {
        ctx.save();
        ctx.fillStyle = '#D1D1D1';
        ctx.font = 'bold 64px Humane';
        ctx.letterSpacing = '2px';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            Math.ceil(platform.countdown), 
            platform.x + platform.width/2, 
            platform.y + platform.height/2
        );
        ctx.restore();
    }
}

// Helper function to draw a rope
function drawRope(segments, startX, startY) {
    if (segments && segments.length > 0) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        segments.forEach(segment => {
            ctx.lineTo(segment.x, segment.y);
        });
        ctx.stroke();
    }
}

// Add after particle system
class SuperJumpParticle {
    constructor(x, y, width) {
        this.x = x + Math.random() * width;
        this.y = y;
        this.size = Math.random() * 4 + 3;  // Slightly larger particles
        this.speedY = -(Math.random() * 5 + 3);  // Stronger upward velocity
        this.speedX = (Math.random() - 0.5) * 4;  // More horizontal spread
        this.life = 1;
        this.decay = Math.random() * 0.02 + 0.01;  // Slower decay
        this.gravity = 0.15;
    }

    update() {
        this.speedY += this.gravity;
        this.y += this.speedY;
        this.x += this.speedX;
        this.life -= this.decay;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.fillStyle = '#D1D1D1';  // Changed to light gray for better visibility
        ctx.globalAlpha = this.life;
        ctx.fillRect(
            Math.round(this.x),
            Math.round(this.y),
            Math.round(this.size),
            Math.round(this.size)
        );
        ctx.globalAlpha = 1;
    }
}

// Add to existing variables
const superJumpParticles = [];

// Add after particle system classes
class Raindrop {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 7 + Math.random() * 5;
        this.length = 10 + Math.random() * 5;
        this.angle = Math.PI * 0.25;
        this.width = 1;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        return true;
    }

    draw(ctx) {
        ctx.save();
        ctx.strokeStyle = '#D1D1D1';
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = this.width;
        ctx.beginPath();
        // Draw relative to camera position
        ctx.moveTo(this.x, this.y - camera.y);
        ctx.lineTo(
            this.x - Math.cos(this.angle) * this.length,
            this.y - Math.sin(this.angle) * this.length - camera.y
        );
        ctx.stroke();
        ctx.restore();
    }

    checkCollision(platform) {
        const nextY = this.y + Math.sin(this.angle) * this.speed;
        return this.y <= platform.y && nextY >= platform.y &&
               this.x >= platform.x && this.x <= platform.x + platform.width;
    }
}

// Add to existing variables
const raindrops = [];
const RAIN_DENSITY = 12; // Increased density to compensate for wider angle

// Add after Raindrop class
class RainSplash {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 1;
        this.maxRadius = 3;
        this.opacity = 0.4;
        this.fadeSpeed = 0.05;
    }

    update() {
        this.radius += 0.3;
        this.opacity -= this.fadeSpeed;
        return this.opacity > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.strokeStyle = '#D1D1D1';
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.arc(this.x, this.y - camera.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// Add to existing variables
const rainSplashes = [];

// Feather particle class for bird collisions
class FeatherParticle {
    constructor(x, y, isSmall = false) {
        this.x = x;
        this.y = y;
        this.velocityX = (Math.random() - 0.5) * 4;
        this.velocityY = (Math.random() - 0.5) * 4;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.size = (isSmall ? (Math.random() * 2 + 1.5) : (Math.random() * 3 + 2));
        this.life = 1;
        this.fadeSpeed = 0.02;
        this.isSmall = isSmall;
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.velocityY += 0.05;  // Slight gravity effect
        this.rotation += this.rotationSpeed;
        this.life -= this.fadeSpeed;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y + camera.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.isSmall ? 
            `rgba(255, 165, 0, ${this.life})` :  // Orange for small birds
            `rgba(248, 220, 107, ${this.life})`; // Golden for regular birds
        
        // Draw a simple pixelated feather shape
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        ctx.fillRect(-this.size/4, -this.size, this.size/2, this.size/2);
        
        ctx.restore();
    }
}

// Add featherParticles array to track active feather particles
let featherParticles = [];

// Add after otherPlayer initialization
let otherPlayerRopes = [];  // Store other player's released ropes

// Game loop
function gameLoop() {
    // Update camera position
    if (player.y < camera.followThreshold) {
        camera.y = (camera.followThreshold - player.y) + camera.verticalOffset;
    } else {
        camera.y = camera.verticalOffset;
    }

    // Clear canvas
    ctx.fillStyle = '#1D201F';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update highest point reached
    player.highestY = Math.min(player.y, player.highestY);

    // Draw title and score before camera transform
    if (!player.hasMoved) {
        // Draw birds behind title
        ctx.save();
        ctx.translate(0, camera.y);
        for (let i = birds.length - 1; i >= 0; i--) {
            const bird = birds[i];
            if (bird.isBehindTitle) {
                bird.draw(ctx);
            }
        }
        ctx.restore();

        // Draw title
        ctx.fillStyle = '#D1D1D1';
        ctx.font = '900 164px Humane';
        ctx.letterSpacing = '0px';
        ctx.textAlign = 'center';
        const titleY = canvas.height * 0.2;
        ctx.fillText('FOR LACK OF A BETTER NAME', canvas.width/2, titleY);

        // Draw birds in front of title
        ctx.save();
        ctx.translate(0, camera.y);
        for (let i = birds.length - 1; i >= 0; i--) {
            const bird = birds[i];
            if (!bird.isBehindTitle) {
                bird.draw(ctx);
            }
        }
        ctx.restore();
    } else {
        // Draw all birds when game has started
        ctx.save();
        ctx.translate(0, camera.y);
        birds.forEach(bird => bird.draw(ctx));
        ctx.restore();
    }

    // Draw score and counters before camera transform
    ctx.fillStyle = '#D1D1D1';
    ctx.font = 'bold 32px Humane';
    ctx.letterSpacing = '2px';
    ctx.textAlign = 'center';

    // Draw height indicator
    const indicatorX = 40;
    const indicatorY = 100;
    const indicatorHeight = 400;
    
    // Draw indicator background
    ctx.fillStyle = '#2A2E2D';
    ctx.fillRect(indicatorX - 15, indicatorY, 30, indicatorHeight);
    
    // Draw height marker and number
    const heightValue = Math.max(0, Math.floor((200 - player.y) / 10));
    const heightPercentage = Math.max(0, Math.min(1, heightValue / 100));
    const markerY = indicatorY + (1 - heightPercentage) * indicatorHeight;
    
    // Draw marker line and number
    ctx.fillStyle = '#D1D1D1';
    ctx.fillRect(indicatorX - 12, markerY - 2, 24, 4);
    ctx.font = 'bold 20px Humane';
    ctx.textAlign = 'left';
    ctx.fillText(heightValue.toString(), indicatorX + 20, markerY + 6);
    
    // Draw arrows with glow effect
    const arrowSize = 12;
    const upGlowOpacity = player.velocityY < 0 ? Math.min(1, Math.abs(player.velocityY) / 10) : 0;
    const downGlowOpacity = player.velocityY > 0 ? Math.min(1, Math.abs(player.velocityY) / 10) : 0;
    
    // Draw top arrow with glow
    if (upGlowOpacity > 0) {
        // Draw glow effect
        ctx.save();
        ctx.shadowColor = '#D1D1D1';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#D1D1D1';
        
        // Draw arrow shape
        ctx.beginPath();
        ctx.moveTo(indicatorX - arrowSize, indicatorY - 5);
        ctx.lineTo(indicatorX + arrowSize, indicatorY - 5);
        ctx.lineTo(indicatorX, indicatorY - 25);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    
    // Draw top arrow base shape
    ctx.beginPath();
    ctx.moveTo(indicatorX - arrowSize, indicatorY - 5);
    ctx.lineTo(indicatorX + arrowSize, indicatorY - 5);
    ctx.lineTo(indicatorX, indicatorY - 25);
    ctx.closePath();
    ctx.fillStyle = player.velocityY < 0 ? '#D1D1D1' : '#2A2E2D';
    ctx.fill();
    
    // Draw bottom arrow with glow
    if (downGlowOpacity > 0) {
        // Draw glow effect
        ctx.save();
        ctx.shadowColor = '#D1D1D1';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#D1D1D1';
        
        // Draw arrow shape
        ctx.beginPath();
        ctx.moveTo(indicatorX - arrowSize, indicatorY + indicatorHeight + 5);
        ctx.lineTo(indicatorX + arrowSize, indicatorY + indicatorHeight + 5);
        ctx.lineTo(indicatorX, indicatorY + indicatorHeight + 25);
        ctx.closePath();
        ctx.fill();
    ctx.restore();
    }
    
    // Draw bottom arrow base shape
    ctx.beginPath();
    ctx.moveTo(indicatorX - arrowSize, indicatorY + indicatorHeight + 5);
    ctx.lineTo(indicatorX + arrowSize, indicatorY + indicatorHeight + 5);
    ctx.lineTo(indicatorX, indicatorY + indicatorHeight + 25);
    ctx.closePath();
    ctx.fillStyle = player.velocityY > 0 ? '#D1D1D1' : '#2A2E2D';
    ctx.fill();

    // Update counter opacity
    if (player.hasMoved) {
        player.counterOpacity = Math.min(1, player.counterOpacity + 0.05);
    }
    
    if (player.counterOpacity > 0) {
        // Draw score
        const heightClimbed = Math.max(0, Math.floor((200 - player.highestY) / 10));
        ctx.globalAlpha = player.counterOpacity;
        ctx.fillText(`SCORE: ${heightClimbed}`, canvas.width/2, 30);

        // Draw high score
        ctx.fillText(`HIGH SCORE: ${highScore}`, canvas.width/2, 60);

        // Draw counters at bottom
        ctx.fillText(`DOUBLE-JUMPS: ${player.doubleJumps}`, canvas.width/2 - 100, canvas.height - 30);
        ctx.fillText(`HOOKS: ${player.hooks}`, canvas.width/2 + 100, canvas.height - 30);
        ctx.globalAlpha = 1;
    }

    // Save the current canvas state for game elements
    ctx.save();
    
    // Apply camera transform
    ctx.translate(0, camera.y);

    // Draw platforms with camera offset
    platforms.forEach(platform => {
        if (platform.countdown > 0 || platform.color !== '#79312D') {
            ctx.fillStyle = platform.color;
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            drawPlatformCountdown(platform);
        }
    });

    // Draw particles
    particles.forEach((particle, index) => {
        if (!particle.update()) {
            particles.splice(index, 1);  // Remove dead particles
        } else {
            particle.draw(ctx);
        }
    });

    // Update and spawn birds
    if (birds.length < maxBirds && Math.random() < birdSpawnChance) {
        const isSmall = Math.random() < 0.4; // 40% chance for small birds
        birds.push(new Bird(isSmall));
    }
    
    // Update existing birds
    for (let i = birds.length - 1; i >= 0; i--) {
        const bird = birds[i];
        if (!bird.update()) {
            birds.splice(i, 1);
        }
    }

    // Draw main player's ropes
    if (player.isHooked) {
        ctx.save();
        ctx.strokeStyle = '#D1D1D1';
        ctx.lineWidth = 2;
        
        // Calculate rope segments for dynamic movement
        const numSegments = 10;
        const points = [];
        
        for (let i = 0; i <= numSegments; i++) {
            const t = i / numSegments;
            const centerX = player.x + player.width/2;
            const centerY = player.y + player.height/2;
            
            // Add sine wave movement based on velocity
            const swayAmount = Math.sin(t * Math.PI) * (Math.abs(player.velocityX) * 0.5);
            const dx = (player.hookX - centerX) * t;
            const dy = (player.hookY - centerY) * t;
            
            points.push({
                x: centerX + dx + swayAmount,
                y: centerY + dy + Math.sin(Date.now() / 500 + t * Math.PI) * 2
            });
        }
        
        // Draw the rope
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        // Use quadratic curves for smoother rope
        for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.stroke();
        
        ctx.restore();
    }

    // Draw main player's released ropes
    ctx.save();
    ctx.strokeStyle = '#D1D1D1';
    ctx.lineWidth = 2;
    
    player.activeRopes.forEach((rope, index) => {
        const time = Date.now() / 1000;
        const windStrength = 0.02;
        
        // Multiple iterations to maintain rope length
        for (let iteration = 0; iteration < 5; iteration++) {
            for (let i = 1; i < rope.points.length; i++) {
                const point = rope.points[i];
                const prevPoint = rope.points[i - 1];
                
                if (!point.isAnchored) {
                    if (iteration === 0) {
                        point.velocityY += gravity * 0.5;
                        point.y += point.velocityY;
                        
                        const windPhase = time + rope.windOffset;
                        const windEffect = Math.sin(windPhase * 0.8) * windStrength * (i / rope.points.length) * 3;
                        const secondaryWind = Math.cos(windPhase * 1.2 + i * 0.2) * windStrength * (i / rope.points.length);
                        point.velocityX = (point.velocityX || 0) * 0.98 + windEffect + secondaryWind;
                        point.x += point.velocityX;
                    }
                    
                    const dx = point.x - prevPoint.x;
                    const dy = point.y - prevPoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance !== rope.segmentLength) {
                        const ratio = rope.segmentLength / distance;
                        point.x = prevPoint.x + dx * ratio;
                        point.y = prevPoint.y + dy * ratio;
                    }
                }
            }
        }
        
        // Draw the rope
        ctx.beginPath();
        ctx.moveTo(rope.points[0].x, rope.points[0].y);
        
        for (let i = 1; i < rope.points.length - 1; i++) {
            const xc = (rope.points[i].x + rope.points[i + 1].x) / 2;
            const yc = (rope.points[i].y + rope.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(rope.points[i].x, rope.points[i].y, xc, yc);
        }
        ctx.lineTo(rope.points[rope.points.length - 1].x, rope.points[rope.points.length - 1].y);
        ctx.stroke();
    });
    
    ctx.restore();

    // Draw multiplayer elements
    if (isMultiplayer && otherPlayer && bothPlayersReady) {
        // Draw other player
        ctx.fillStyle = '#D1D1D1';
        ctx.fillRect(otherPlayer.x, otherPlayer.y, otherPlayer.width, otherPlayer.height);
        drawPlayerLabel(otherPlayer.x, otherPlayer.y, otherPlayer.label);

        // Draw other player's active rope
        if (otherPlayer.isHooked) {
            ctx.save();
            ctx.strokeStyle = '#D1D1D1';
            ctx.lineWidth = 2;
            
            const numSegments = 10;
            const points = [];
            
            for (let i = 0; i <= numSegments; i++) {
                const t = i / numSegments;
                const centerX = otherPlayer.x + otherPlayer.width/2;
                const centerY = otherPlayer.y + otherPlayer.height/2;
                
                const swayAmount = Math.sin(t * Math.PI) * (Math.abs(otherPlayer.velocityX) * 0.5);
                const dx = (otherPlayer.hookX - centerX) * t;
                const dy = (otherPlayer.hookY - centerY) * t;
                
                points.push({
                    x: centerX + dx + swayAmount,
                    y: centerY + dy + Math.sin(Date.now() / 500 + t * Math.PI) * 2
                });
            }
            
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            
            for (let i = 1; i < points.length - 1; i++) {
                const xc = (points[i].x + points[i + 1].x) / 2;
                const yc = (points[i].y + points[i + 1].y) / 2;
                ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }
            ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
            ctx.stroke();
            
            ctx.restore();
        }

        // Draw other player's released ropes
        ctx.save();
        ctx.strokeStyle = '#D1D1D1';
        ctx.lineWidth = 2;
        
        otherPlayerRopes.forEach((rope, index) => {
            const time = Date.now() / 1000;
            const windStrength = 0.02;
            
            // Multiple iterations to maintain rope length
            for (let iteration = 0; iteration < 5; iteration++) {
                for (let i = 1; i < rope.points.length; i++) {
                    const point = rope.points[i];
                    const prevPoint = rope.points[i - 1];
                    
                    if (!point.isAnchored) {
                        if (iteration === 0) {
                            point.velocityY += gravity * 0.5;
                            point.y += point.velocityY;
                            
                            const windPhase = time + rope.windOffset;
                            const windEffect = Math.sin(windPhase * 0.8) * windStrength * (i / rope.points.length) * 3;
                            const secondaryWind = Math.cos(windPhase * 1.2 + i * 0.2) * windStrength * (i / rope.points.length);
                            point.velocityX = (point.velocityX || 0) * 0.98 + windEffect + secondaryWind;
                            point.x += point.velocityX;
                        }
                        
                        const dx = point.x - prevPoint.x;
                        const dy = point.y - prevPoint.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance !== rope.segmentLength) {
                            const ratio = rope.segmentLength / distance;
                            point.x = prevPoint.x + dx * ratio;
                            point.y = prevPoint.y + dy * ratio;
                        }
                    }
                }
            }
            
            ctx.beginPath();
            ctx.moveTo(rope.points[0].x, rope.points[0].y);
            
            for (let i = 1; i < rope.points.length - 1; i++) {
                const xc = (rope.points[i].x + rope.points[i + 1].x) / 2;
                const yc = (rope.points[i].y + rope.points[i + 1].y) / 2;
                ctx.quadraticCurveTo(rope.points[i].x, rope.points[i].y, xc, yc);
            }
            ctx.lineTo(rope.points[rope.points.length - 1].x, rope.points[rope.points.length - 1].y);
            ctx.stroke();
        });
        
        ctx.restore();
    }

    // Draw ghost players if we have previous runs and game has started
    if (allPreviousRuns.length > 0 && player.hasMoved) {
        // Draw each ghost with decreasing opacity (older runs are more transparent)
        allPreviousRuns.forEach((run, index) => {
            const opacity = 0.5 - (index * 0.08);  // Decrease opacity for older runs
            if (opacity > 0 && ghostReplayFrames[index] < run.length) {
                ctx.fillStyle = '#D1D1D1';
                ctx.globalAlpha = opacity;
                
                const ghostPos = run[ghostReplayFrames[index]];
                ctx.fillRect(ghostPos.x, ghostPos.y, ghostPos.width, ghostPos.height);
                ghostReplayFrames[index]++;
            }
        });
    }

    // Update and draw super jump particles
    superJumpParticles.forEach((particle, index) => {
        if (!particle.update()) {
            superJumpParticles.splice(index, 1);  // Remove dead particles
        } else {
            particle.draw(ctx);
        }
    });

    // Update and draw released ropes
    ctx.save();
    ctx.strokeStyle = '#D1D1D1';
    ctx.lineWidth = 2;
    
    // Update and draw each released rope
    player.activeRopes.forEach((rope, index) => {
        const time = Date.now() / 1000;
        const windStrength = 0.02;
        
        // Multiple iterations to maintain rope length
        for (let iteration = 0; iteration < 5; iteration++) {
            // Start from the anchor point and work down
            for (let i = 1; i < rope.points.length; i++) {
                const point = rope.points[i];
                const prevPoint = rope.points[i - 1];
                
                if (!point.isAnchored) {
                    if (iteration === 0) {
                        // Apply gravity and wind only on first iteration
                        point.velocityY += gravity * 0.5;
                        point.y += point.velocityY;
                        
                        // Apply wind effect - stronger at the end of the rope
                        const windPhase = time + rope.windOffset;
                        const windEffect = Math.sin(windPhase * 0.8) * windStrength * (i / rope.points.length) * 3;
                        const secondaryWind = Math.cos(windPhase * 1.2 + i * 0.2) * windStrength * (i / rope.points.length);
                        point.velocityX = (point.velocityX || 0) * 0.98 + windEffect + secondaryWind;
                        point.x += point.velocityX;
                    }
                    
                    // Strictly maintain rope length
                    const dx = point.x - prevPoint.x;
                    const dy = point.y - prevPoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance !== rope.segmentLength) {
                        const ratio = rope.segmentLength / distance;
                        point.x = prevPoint.x + dx * ratio;
                        point.y = prevPoint.y + dy * ratio;
                    }
                }
            }
        }
        
        // Draw the rope with smooth curves
        ctx.beginPath();
        ctx.moveTo(rope.points[0].x, rope.points[0].y);
        
        // Use quadratic curves for smoother rope appearance
        for (let i = 1; i < rope.points.length - 1; i++) {
            const xc = (rope.points[i].x + rope.points[i + 1].x) / 2;
            const yc = (rope.points[i].y + rope.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(rope.points[i].x, rope.points[i].y, xc, yc);
        }
        // Draw the last segment
        ctx.lineTo(rope.points[rope.points.length - 1].x, rope.points[rope.points.length - 1].y);
        ctx.stroke();
    });
    
    ctx.restore();

    // Restore canvas state
    ctx.restore();

    // Handle input
    if (keys['ArrowLeft'] && keys['ArrowRight']) {
        player.lastDirection = 0;
    } else if (keys['ArrowLeft']) {
        player.lastDirection = -1;
    } else if (keys['ArrowRight']) {
        player.lastDirection = 1;
    } else {
        player.lastDirection = 0;
    }

    // Apply movement based on last direction with speed boost
    const currentSpeed = player.onSpeedPlatform ? player.boostedSpeed : player.speed;
    const targetVelocityX = player.lastDirection * currentSpeed;

    // Apply air control
    if (player.isJumping) {
        // More responsive air control when speed boosted
        const airControlFactor = player.onSpeedPlatform ? player.airControl * 1.2 : player.airControl;
        
        if (player.lastDirection !== 0) {
            // Accelerate towards target velocity
            player.velocityX = player.velocityX * (1 - airControlFactor) + targetVelocityX * airControlFactor;
        } else {
            // Apply air friction to slow down when no direction is pressed
            player.velocityX *= player.airFriction;
            // Stop completely if very slow
            if (Math.abs(player.velocityX) < 0.1) {
                player.velocityX = 0;
            }
        }
        
        // Add momentum from speed platform
        if (player.jumpMomentum !== 0) {
            player.velocityX += player.jumpMomentum * player.airFriction;
            player.jumpMomentum *= player.airFriction;
            if (Math.abs(player.jumpMomentum) < 0.1) {
                player.jumpMomentum = 0;
            }
        }
    } else {
        // Instant response on ground
        player.velocityX = targetVelocityX;
    }

    // Handle jump input with momentum
    if (keys['ArrowUp']) {
        if (!player.isJumping && player.canJump) {
            player.isCurrentJumpSuper = player.onSuperJumpPlatform;  // Track if this jump is super
            player.velocityY = player.isCurrentJumpSuper ? player.superJumpForce : player.jumpForce;
            player.isJumping = true;
            player.canJump = false;
            player.canDoubleJump = true;  // Enable double jump after initial jump
            player.jumpKeyReleased = false;  // Track that jump key is being held
            
            // Add horizontal momentum when jumping from speed platform
            if (player.onSpeedPlatform) {
                player.jumpMomentum = player.velocityX * 1.5;
            } else {
                player.jumpMomentum = 0;
            }
        } else if (player.isJumping && player.doubleJumps > 0 && player.jumpKeyReleased) {
            // Double jump should be super if the initial jump was from a super jump platform
            const isDoubleJumpSuper = player.isCurrentJumpSuper;
            player.velocityY = isDoubleJumpSuper ? player.superJumpForce : (player.jumpForce * 1.2);
            
            // Create super jump particles if it's a super double jump
            if (isDoubleJumpSuper) {
                // Create more particles with better spread
                for (let i = 0; i < 15; i++) {
                    const particle = new SuperJumpParticle(
                        player.x,
                        player.y + player.height,
                        player.width
                    );
                    superJumpParticles.push(particle);
                }
            }
            
            player.doubleJumps--;
            player.jumpKeyReleased = false;
        }
    } else {
        player.canJump = true;
        player.jumpKeyReleased = true;
    }

    // Apply physics with momentum
    player.velocityY += gravity;  // Always apply gravity
    
    if (!player.isHooked) {
        player.x += player.velocityX;
        player.y += player.velocityY;
    } else {
        // Apply player input for swinging
        if (keys['ArrowLeft']) {
            player.velocityX -= 0.3;
        }
        if (keys['ArrowRight']) {
            player.velocityX += 0.3;
        }
        
        // Apply air resistance
        player.velocityX *= 0.99;
        
        // Update position with velocity
        player.x += player.velocityX;
        player.y += player.velocityY;
        
        // Calculate distance to hook point after movement
        const playerCenterX = player.x + player.width/2;
        const playerCenterY = player.y + player.height/2;
        const dx = playerCenterX - player.hookX;
        const dy = playerCenterY - player.hookY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        
        // If rope is stretched, constrain to rope length
        if (currentDistance > player.ropeLength) {
            const angle = Math.atan2(dy, dx);
            const constrainedX = player.hookX + Math.cos(angle) * player.ropeLength;
            const constrainedY = player.hookY + Math.sin(angle) * player.ropeLength;
            
            // Move player to constrained position
            player.x = constrainedX - player.width/2;
            player.y = constrainedY - player.height/2;
            
            // Project velocity onto rope direction
            const tangentX = -Math.sin(angle);
            const tangentY = Math.cos(angle);
            const dotProduct = player.velocityX * tangentX + player.velocityY * tangentY;
            player.velocityX = tangentX * dotProduct;
            player.velocityY = tangentY * dotProduct;
        }
    }

    // Screen wrapping for horizontal movement
    if (player.x + player.width < 0) {
        player.x = canvas.width;
    } else if (player.x > canvas.width) {
        player.x = -player.width;
    }

    // Check if player fell off the screen (adjust for camera)
    if (player.y - camera.y > canvas.height) {
        resetGame();
    }

    // Platform collision
    for (const platform of platforms) {
        if (platform.countdown <= 0 && platform.color === '#79312D') {
            continue; // Skip collision for disappeared platforms
        }

        if (player.x + player.width > platform.x &&
            player.x < platform.x + platform.width &&
            player.y + player.height > platform.y &&
            player.y + player.height < platform.y + platform.height) {
            
            // Calculate impact force for squash effect
            const impactForce = Math.abs(player.velocityY);
            if (impactForce > 2) {  // Only squash on significant impacts
                player.squashAmount = Math.min(player.maxSquash, impactForce * 1.5);
                player.height = player.normalHeight - player.squashAmount;
                createLandingParticles(player.x, player.y, player.width, impactForce);
            }
            
            player.y = platform.y - player.height;
            player.velocityY = 0;
            player.isJumping = false;
            player.canDoubleJump = false;
            player.onSuperJumpPlatform = (platform.color === '#21282B');
            player.onSpeedPlatform = (platform.color === '#273D3E');

            // Start timer for red platforms and add double jump
            if (platform.color === '#79312D' && platform.timer === null) {
                platform.timer = Date.now();
                player.doubleJumps++;

                // In multiplayer, host sends timer start to other player
                if (isMultiplayer && isHost) {
                    ws.send(JSON.stringify({
                        type: 'platformTimer',
                        platformX: platform.x,
                        platformY: platform.y,
                        timer: platform.timer,
                        countdown: platform.countdown
                    }));
                }
            }
            // Add hook when touching blue-gray platform
            if (platform.color === '#273D3E' && !platform.hookGiven) {
                player.hooks++;
                platform.hookGiven = true;
            }
        }
    }

    // Reset speed boost if not on speed platform and in the air
    if (player.isJumping) {
        player.onSpeedPlatform = false;
    }

    // Update platform timers
    platforms.forEach(platform => {
        if (platform.color === '#79312D' && platform.timer !== null) {
            const elapsed = (Date.now() - platform.timer) / 1000;
            platform.countdown = Math.max(3 - elapsed, 0);
            
            // In multiplayer, host regularly syncs timer state
            if (isMultiplayer && isHost && platform.countdown > 0) {
                ws.send(JSON.stringify({
                    type: 'platformTimer',
                    platformX: platform.x,
                    platformY: platform.y,
                    timer: platform.timer,
                    countdown: platform.countdown
                }));
            }
        }
    });

    // Record current position if game has started
    if (player.hasMoved) {
        currentRunPositions.push({
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height
        });
    }

    // Generate new platforms
    generateNewPlatforms();

    // Update hasMoved flag in input handling
    if (keys['ArrowLeft'] || keys['ArrowRight'] || keys['ArrowUp']) {
        player.hasMoved = true;
    }

    // Spawn new raindrops
    for (let i = 0; i < RAIN_DENSITY; i++) {
        const x = Math.random() * (canvas.width + 2400) - 1200;
        // Spawn relative to camera view in world space
        const y = -camera.y - 200;  // Convert to world space
        raindrops.push(new Raindrop(x, y));
    }

    // Update and draw raindrops
            ctx.save();
    
    raindrops.forEach((drop, index) => {
        // Check bounds in world space
        if (!drop.update() || 
            drop.y > -camera.y + canvas.height + 100 || 
            drop.x < -1200 || 
            drop.x > canvas.width + 1200) {
            raindrops.splice(index, 1);
            return;
        }

        // Check for platform collisions in world space
        for (const platform of platforms) {
            const oldX = drop.x;
            const oldY = drop.y;
            const nextX = oldX + Math.cos(drop.angle) * drop.speed;
            const nextY = oldY + Math.sin(drop.angle) * drop.speed;
            
            // Check if the raindrop's path intersects with the platform
            const rainEndX = drop.x - Math.cos(drop.angle) * drop.length;
            const rainEndY = drop.y - Math.sin(drop.angle) * drop.length;
            
            // Check top edge collision
            if (lineIntersectsLine(
                oldX, oldY, nextX, nextY,
                platform.x, platform.y, platform.x + platform.width, platform.y
            )) {
                // Create top splash effect
            ctx.save();
                ctx.strokeStyle = '#D1D1D1';
                ctx.globalAlpha = 0.4;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(drop.x - 3, platform.y + camera.y);
                ctx.lineTo(drop.x + 3, platform.y + camera.y);
                ctx.stroke();
            ctx.restore();
                
                raindrops.splice(index, 1);
                break;
            }
            
            // Check left edge collision
            if (lineIntersectsLine(
                oldX, oldY, nextX, nextY,
                platform.x, platform.y, platform.x, platform.y + platform.height
            )) {
                // Create side splash effect - vertical line
            ctx.save();
                ctx.strokeStyle = '#D1D1D1';
                ctx.globalAlpha = 0.4;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(platform.x, drop.y + camera.y - 3);
                ctx.lineTo(platform.x, drop.y + camera.y + 3);
                ctx.stroke();
            ctx.restore();
                
                raindrops.splice(index, 1);
                break;
            }
            
            // Additional check for the entire raindrop line segment
            if (lineIntersectsLine(
                drop.x, drop.y, rainEndX, rainEndY,
                platform.x, platform.y, platform.x + platform.width, platform.y
            ) || lineIntersectsLine(
                drop.x, drop.y, rainEndX, rainEndY,
                platform.x, platform.y, platform.x, platform.y + platform.height
            )) {
                // Create appropriate splash effect based on which edge was hit
                const hitTop = Math.abs(drop.y - platform.y) < Math.abs(drop.x - platform.x);
                
                ctx.save();
                ctx.strokeStyle = '#D1D1D1';
                ctx.globalAlpha = 0.4;
                ctx.lineWidth = 1;
                ctx.beginPath();
                
                if (hitTop) {
                    ctx.moveTo(drop.x - 3, platform.y + camera.y);
                    ctx.lineTo(drop.x + 3, platform.y + camera.y);
                } else {
                    ctx.moveTo(platform.x, drop.y + camera.y - 3);
                    ctx.lineTo(platform.x, drop.y + camera.y + 3);
                }
                
                ctx.stroke();
                ctx.restore();
                
                raindrops.splice(index, 1);
                break;
            }
        }
        
        if (drop) {
            // Draw raindrop in screen space
            ctx.strokeStyle = '#D1D1D1';
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = drop.width;
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y + camera.y);
            ctx.lineTo(
                drop.x - Math.cos(drop.angle) * drop.length,
                drop.y + camera.y - Math.sin(drop.angle) * drop.length
            );
            ctx.stroke();
        }
    });
        
        ctx.restore();

    // Update and draw rain splashes
    rainSplashes.forEach((splash, index) => {
        if (!splash.update()) {
            rainSplashes.splice(index, 1);
            return;
        }
        splash.draw(ctx);
    });

    // Update and draw feather particles
    featherParticles = featherParticles.filter(feather => {
        if (!feather.update()) return false;
        feather.draw(ctx);
        return true;
    });

    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();

// Add after player object definition
function checkPlayerCollision(player1, player2) {
    return player1.x < player2.x + player2.width &&
           player1.x + player1.width > player2.x &&
           player1.y < player2.y + player2.height &&
           player1.y + player1.height > player2.y;
}

// Add this helper function for better collision detection
function lineIntersectsRect(x1, y1, x2, y2, rectX, rectY, rectWidth, rectHeight) {
    // Check intersection with each edge of the rectangle
    return (
        lineIntersectsLine(x1, y1, x2, y2, rectX, rectY, rectX + rectWidth, rectY) || // Top
        lineIntersectsLine(x1, y1, x2, y2, rectX, rectY + rectHeight, rectX + rectWidth, rectY + rectHeight) || // Bottom
        lineIntersectsLine(x1, y1, x2, y2, rectX, rectY, rectX, rectY + rectHeight) || // Left
        lineIntersectsLine(x1, y1, x2, y2, rectX + rectWidth, rectY, rectX + rectWidth, rectY + rectHeight) // Right
    );
}

function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Calculate the denominator
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den === 0) return false;
    
    // Calculate intersection point
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
    
    // Check if intersection point lies on both line segments
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
