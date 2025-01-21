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
    canvas.width = window.innerWidth;
    canvas.height = 600;  // Keep fixed height
}

// Initial size setup
updateCanvasSize();

// Handle window resizing
window.addEventListener('resize', () => {
    const oldWidth = canvas.width;
    updateCanvasSize();
    
    // Adjust platform positions to maintain relative spacing when width changes
    const widthRatio = canvas.width / oldWidth;
    platforms.forEach(platform => {
        platform.x = platform.x * widthRatio;
    });
});

document.body.appendChild(canvas);

// Game objects
const player = {
    x: canvas.width/2 - 15,  // Center the player (half of player width)
    y: 200,  // Start player higher
    width: 30,
    height: 30,
    normalHeight: 30,  // Store normal height for reference
    squashAmount: 0,   // Track squash animation
    squashSpeed: 0.3,  // Speed of squash recovery
    maxSquash: 10,     // Maximum squash amount
    velocityY: 0,
    velocityX: 0,
    speed: 5,
    boostedSpeed: 12,  // Increased from 8 to 12 for more dramatic effect
    airControl: 0.8,   // Air control factor (0-1)
    airFriction: 0.92, // Air friction to allow stopping
    jumpForce: -5,
    superJumpForce: -19,  // Add this new property for higher jumps
    isJumping: false,
    lastDirection: 0,
    canJump: true,
    onSuperJumpPlatform: false,  // Add this to track if on special platform
    onSpeedPlatform: false,  // New property to track speed boost
    jumpMomentum: 0,  // New property to track horizontal jump momentum
    highestY: 200,  // Track highest point reached
    hasMoved: false,  // Track if player has moved
    doubleJumps: 0,  // Track number of double jumps available
    canDoubleJump: false,  // Track if can currently double jump
    jumpKeyReleased: true,  // Track if jump key has been released since last jump
    isCurrentJumpSuper: false,  // Track if current jump is a super jump
    hooks: 0,  // Track number of hooks available
    isHooked: false,
    hookX: 0,
    hookY: 0,
    ropeLength: 0,
    ropeAngle: 0,
    ropeSwingSpeed: 0,
    ropeSegments: [],  // Store rope segments for visualization
    activeRopes: [],    // Store all active ropes
    counterOpacity: 0  // Track opacity for counters fade-in
};

let platforms = [
    { x: window.innerWidth/2 - 160, y: 300, width: 100, height: 100, color: '#79312D', timer: null, countdown: 3 },
    { x: window.innerWidth/2 - 50, y: 300, width: 100, height: 100, color: '#273D3E', hookGiven: false },
    { x: window.innerWidth/2 + 60, y: 300, width: 100, height: 100, color: '#21282B' }
];

// Physics constants
const gravity = 0.5;
const friction = 0.8;

// Input handling
const keys = {};
document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);

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
    // Generate a new row of platforms when player gets close to highest
    const playerHeight = isMultiplayer ? Math.min(player.y, otherPlayer ? otherPlayer.y : player.y) : player.y;
    if (playerHeight < highestPlatform - 300) {
        const numPlatforms = Math.floor(Math.random() * 2) + 2; // 2-3 platforms per row
        const newPlatforms = [];
        const minGapBetweenPlatforms = 20;

        // Function to check if a position is valid (not overlapping with existing platforms)
        function isValidPosition(x, existingPlatforms) {
            for (const platform of existingPlatforms) {
                if (Math.abs(x - platform.x) < 100 + minGapBetweenPlatforms) {
                    return false;
                }
            }
            return true;
        }

        // First, add the super-jump platform
        let x;
        do {
            x = Math.random() * (canvas.width - 100);
        } while (!isValidPosition(x, newPlatforms));

        const superJumpPlatform = {
            x: x,
            y: highestPlatform - platformGap,
            width: 100,
            height: 100,
            color: '#21282B'
        };
        newPlatforms.push(superJumpPlatform);
        
        // Then add the remaining regular platforms
        for (let i = 1; i < numPlatforms; i++) {
            let attempts = 0;
            let validPositionFound = false;
            
            while (!validPositionFound && attempts < 10) {
                x = Math.random() * (canvas.width - 100);
                if (isValidPosition(x, newPlatforms)) {
                    const platform = {
                        x: x,
                        y: highestPlatform - platformGap,
                        width: 100,
                        height: 100,
                        color: platformColors[Math.floor(Math.random() * 2)],
                        timer: null,
                        countdown: 3,
                        hookGiven: false  // Add hookGiven property for blue-gray platforms
                    };
                    newPlatforms.push(platform);
                    validPositionFound = true;
                }
                attempts++;
            }
        }

        // Add all valid new platforms to the game
        platforms.push(...newPlatforms);
        
        highestPlatform -= platformGap;

        // Remove platforms that are too far below
        const lowestPlayerY = isMultiplayer ? 
            Math.max(player.y, otherPlayer ? otherPlayer.y : player.y) : 
            player.y;
        platforms = platforms.filter(platform => 
            platform.y < lowestPlayerY + canvas.height * 2
        );

        // If we're not the host, request platform sync
        if (isMultiplayer && !isHost) {
            ws.send(JSON.stringify({
                type: 'requestNewPlatforms',
                highestPlatform: highestPlatform
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
    
    // Reset current run tracking
    currentRunPositions = [];

    // Update high score before reset if needed
    const currentScore = Math.max(0, Math.floor((200 - player.highestY) / 10));
    if (currentScore > highScore) {
        highScore = currentScore;
        localStorage.setItem('jumpGameHighScore', highScore.toString());
    }

    // Reset player position and physics
    player.x = window.innerWidth/2 - 15;
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
    player.hasMoved = false;  // Reset movement tracker
    player.doubleJumps = 0;
    player.canDoubleJump = false;
    player.jumpKeyReleased = true;
    player.isCurrentJumpSuper = false;
    player.squashAmount = 0;
    player.height = player.normalHeight;
    player.hooks = 0;
    player.isHooked = false;
    player.hookX = 0;
    player.hookY = 0;
    player.ropeLength = 0;
    player.ropeAngle = 0;
    player.ropeSwingSpeed = 0;
    player.ropeSegments = [];
    player.activeRopes = [];
    player.counterOpacity = 0;  // Reset counter opacity

    // Reset camera
    camera.y = camera.verticalOffset;

    // Reset platforms with exactly 10px gaps from center
    platforms = [
        { x: window.innerWidth/2 - 160, y: 300, width: 100, height: 100, color: '#79312D', timer: null, countdown: 3 },
        { x: window.innerWidth/2 - 50, y: 300, width: 100, height: 100, color: '#273D3E', hookGiven: false },
        { x: window.innerWidth/2 + 60, y: 300, width: 100, height: 100, color: '#21282B' }
    ];

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

// Add after particle system
class RopeSegment {
    constructor(x, y, isAnchored = false) {
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isAnchored = isAnchored;
    }
}

class PhysicsRope {
    constructor(segments) {
        this.segments = segments.map((seg, index) => 
            new RopeSegment(seg.x, seg.y, index === segments.length - 1)  // Anchor the last point
        );
        this.segmentLength = 10;  // Distance constraint between segments
        this.iterations = 3;      // Physics iteration for stability
    }

    update() {
        const gravity = 0.2;
        const friction = 0.99;

        // Apply physics to each segment
        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];
            if (!segment.isAnchored) {
                const vx = (segment.x - segment.prevX) * friction;
                const vy = (segment.y - segment.prevY) * friction;
                
                segment.prevX = segment.x;
                segment.prevY = segment.y;
                
                segment.x += vx;
                segment.y += vy;
                segment.y += gravity;
            }
        }

        // Apply distance constraint multiple times for stability
        for (let j = 0; j < this.iterations; j++) {
            for (let i = 0; i < this.segments.length - 1; i++) {
                const segmentA = this.segments[i];
                const segmentB = this.segments[i + 1];
                
                const dx = segmentB.x - segmentA.x;
                const dy = segmentB.y - segmentA.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const difference = this.segmentLength - distance;
                const percent = difference / distance / 2;
                const offsetX = dx * percent;
                const offsetY = dy * percent;

                if (!segmentA.isAnchored) {
                    segmentA.x -= offsetX;
                    segmentA.y -= offsetY;
                }
                if (!segmentB.isAnchored) {
                    segmentB.x += offsetX;
                    segmentB.y += offsetY;
                }
            }
        }
    }
}

// Modify the mousedown event handler where we add the rope to activeRopes
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top - camera.y;  // Adjust for camera

    if (player.isHooked) {
        // Release hook and preserve momentum
        const angle = Math.atan2(
            (player.y + player.height/2) - player.hookY,
            (player.x + player.width/2) - player.hookX
        );
        const tangentX = -Math.sin(angle);
        const tangentY = Math.cos(angle);
        const releaseSpeed = Math.sqrt(player.velocityX * player.velocityX + player.velocityY * player.velocityY);
        player.velocityX = tangentX * releaseSpeed * 1.5;
        player.velocityY = tangentY * releaseSpeed * 1.5;
        
        // Add current rope to active ropes as a physics rope
        if (player.ropeSegments.length > 0) {
            player.activeRopes.push(new PhysicsRope(player.ropeSegments));
        }
        
        player.isHooked = false;
        player.ropeSegments = [];
    } else if (player.hooks > 0) {
        // Check if click is on any platform
        let clickedPlatform = null;
        for (const platform of platforms) {
            if (clickX >= platform.x && 
                clickX <= platform.x + platform.width &&
                clickY >= platform.y && 
                clickY <= platform.y + platform.height) {
                clickedPlatform = platform;
                break;
            }
        }

        if (clickedPlatform) {
            // Use exact click position instead of platform center
            const hookX = clickX;
            const hookY = clickY;
            
            // Calculate rope properties
            player.hookX = hookX;
            player.hookY = hookY;
            player.isHooked = true;
            player.hooks--;

            // Calculate initial rope length and segments
            const dx = hookX - (player.x + player.width/2);
            const dy = hookY - (player.y + player.height/2);
            player.ropeLength = Math.sqrt(dx * dx + dy * dy);
            player.ropeAngle = Math.atan2(dy, dx);
            player.ropeSwingSpeed = 0;
            
            // Create rope segments for visualization
            const numSegments = 10;
            player.ropeSegments = [];
            for (let i = 0; i <= numSegments; i++) {
                player.ropeSegments.push({
                    x: player.x + player.width/2 + (dx * i/numSegments),
                    y: player.y + player.height/2 + (dy * i/numSegments)
                });
            }
        }
    }
});

// Remove the right-click handler since we're using left-click for release
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();  // Still prevent context menu
});

// Add after particle system and before rope classes
class Bird {
    constructor() {
        this.direction = Math.random() < 0.5 ? -1 : 1;
        this.x = this.direction === 1 ? -20 : canvas.width + 20;
        const spawnHeightRange = 400;
        this.y = player.y - spawnHeightRange/2 + Math.random() * spawnHeightRange;
        this.speed = 2 + Math.random() * 2;
        this.wingOffset = 0;
        this.wingSpeed = 0.1;
        this.wingDirection = 1;
        this.size = 6;
        this.pushForce = 8;
        this.bodyX = 0;
        this.bounceForce = -8;
        this.isBehindTitle = Math.random() < 0.4;  // 40% chance to be behind title
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

    update() {
        this.x += this.speed * this.direction;
        this.bodyX = this.x + (this.direction === 1 ? this.size * 0.8 : -this.size * 2.8);
        
        this.wingOffset += this.wingSpeed * this.wingDirection;
        if (this.wingOffset > 0.5 || this.wingOffset < -0.5) {
            this.wingDirection *= -1;
        }

        const collision = this.checkPlayerCollision();
        if (collision) {
            // Push player in the same direction as the bird
            if (collision === 'top') {
                player.velocityY = this.bounceForce;
                player.velocityX = this.direction * Math.max(Math.abs(this.speed * 2), 4);  // Same direction as bird
                player.isJumping = true;  // Set player to jumping state to prevent ground friction
                player.canJump = false;
                player.canDoubleJump = true;
            } else {
                player.velocityX = this.direction * Math.max(Math.abs(this.pushForce * 2), 6);  // Same direction as bird
                player.velocityY = this.bounceForce * 0.7;
                player.isJumping = true;  // Set player to jumping state to prevent ground friction
            }
            return false;  // Remove bird after collision
        }

        return this.x > -50 && 
               this.x < canvas.width + 50 && 
               Math.abs((this.y + camera.y) - (player.y + camera.y)) < canvas.height;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = '#F8DC6B';  // New golden color for birds
        
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
        
        // Draw wings with reduced animation range and better connection
        ctx.fillRect(
            this.bodyX + this.size * 0.25,
            this.y - this.size * 0.5 + this.wingOffset * this.size,  // Reduced vertical offset
            this.size * 1.5,
            this.size
        );
        
        ctx.restore();
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
                // Reset player position for second player
                if (!isHost) {
                    player.x = window.innerWidth/2 + 45;  // Spawn slightly to the right
                    player.y = 200;
                } else {
                    // Close the modal if we're the host and second player joined
                    modal.style.display = 'none';
                }
                console.log(isHost ? 'Game created' : 'Joined game');
            }
            break;
        case 'readyState':
            bothPlayersReady = data.bothPlayersReady;
            console.log('Ready state updated:', bothPlayersReady);  // Debug log
            break;
        case 'platformUpdate':
            if (!isHost) {  // Only non-host updates their platforms
                platforms = data.platforms;
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
                    velocityY: data.velocityY
                };
            } else {
                otherPlayer.x = data.x;
                otherPlayer.y = data.y;
                otherPlayer.velocityX = data.velocityX;
                otherPlayer.velocityY = data.velocityY;
            }
            break;
        case 'playerDisconnect':
            isMultiplayer = false;
            otherPlayer = null;
            bothPlayersReady = false;
            hasMovedInMultiplayer = false;
            alert('Other player disconnected');
            break;
        case 'requestNewPlatforms':
            if (isHost) {
                // Generate platforms at the requested height
                const newHeight = data.highestPlatform;
                if (newHeight < highestPlatform) {
                    highestPlatform = newHeight;
                    generateNewPlatforms();
                    // Send the updated platforms to all players
                    ws.send(JSON.stringify({
                        type: 'platformUpdate',
                        platforms: platforms
                    }));
                }
            }
            break;
        case 'ropeUpdate':
            if (otherPlayer) {
                otherPlayer.isHooked = data.isHooked;
                otherPlayer.hookX = data.hookX;
                otherPlayer.hookY = data.hookY;
                otherPlayer.ropeSegments = data.ropeSegments;
            }
            break;
    }
}

function sendPlayerUpdate() {
    if (ws && ws.readyState === WebSocket.OPEN && isMultiplayer) {
        // Send player position and velocity
        ws.send(JSON.stringify({
            type: 'playerUpdate',
            x: player.x,
            y: player.y,
            velocityX: player.velocityX,
            velocityY: player.velocityY,
            hasMovedBefore: hasMovedInMultiplayer
        }));

        // Always send rope state
        ws.send(JSON.stringify({
            type: 'ropeUpdate',
            isHooked: player.isHooked,
            hookX: player.hookX,
            hookY: player.hookY,
            ropeSegments: player.ropeSegments
        }));
        
        // Host sends platform updates
        if (isHost) {
            ws.send(JSON.stringify({
                type: 'platformUpdate',
                platforms: platforms
            }));
        }

        // Mark as moved if any movement key is pressed
        if (!hasMovedInMultiplayer && (keys['ArrowLeft'] || keys['ArrowRight'] || keys['ArrowUp'])) {
            hasMovedInMultiplayer = true;
            // Send an immediate update to server about movement state
            ws.send(JSON.stringify({
                type: 'playerUpdate',
                x: player.x,
                y: player.y,
                velocityX: player.velocityX,
                velocityY: player.velocityY,
                hasMovedBefore: true
            }));
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

    // Draw birds that should appear behind the title
    if (!player.hasMoved) {
        ctx.save();
        ctx.translate(0, camera.y);  // Apply camera transform for birds
        for (let i = birds.length - 1; i >= 0; i--) {
            const bird = birds[i];
            if (bird.isBehindTitle) {
                bird.draw(ctx);
            }
        }
        ctx.restore();
    }
    
    // Draw high score at start, fade out when game starts
    ctx.save();
    ctx.fillStyle = '#D1D1D1';  // Changed from #FFFFFF
    ctx.font = 'bold 32px Humane';
    ctx.letterSpacing = '2px';
    ctx.textAlign = 'center';
    
    // Draw title before game starts
    if (!player.hasMoved) {
        ctx.fillStyle = '#D1D1D1';
        ctx.font = '900 164px Humane';
        ctx.letterSpacing = '0px';
        const titleY = canvas.height * 0.2;  // Position at 20% of canvas height
        ctx.fillText('FOR LACK OF A BETTER NAME', canvas.width/2, titleY);
        ctx.fillStyle = '#D1D1D1';
        ctx.letterSpacing = '2px';
    }

    // Draw birds that should appear in front of the title
    if (!player.hasMoved) {
        ctx.save();
        ctx.translate(0, camera.y);  // Apply camera transform for birds
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
        ctx.translate(0, camera.y);  // Apply camera transform for birds
        for (let i = birds.length - 1; i >= 0; i--) {
            birds[i].draw(ctx);
        }
        ctx.restore();
    }

    // Draw score (height climbed)
    const heightClimbed = Math.max(0, Math.floor((200 - player.highestY) / 10));
    
    // Draw score with fade-in effect
    if (player.counterOpacity > 0) {
        ctx.globalAlpha = player.counterOpacity;
        ctx.fillText(`SCORE: ${heightClimbed}`, canvas.width/2, 30);
    }
    
    // Draw high score only after game starts
    if (player.hasMoved) {
        ctx.globalAlpha = player.counterOpacity;  // Fade in with other counters
        ctx.fillText(`HIGH SCORE: ${highScore}`, canvas.width/2, 60);
    }
    ctx.restore();

    // Draw double jumps and hooks counters at bottom middle
    if (player.hasMoved) {
        // Fade in the counters
        player.counterOpacity = Math.min(1, player.counterOpacity + 0.05);
    }
    
    if (player.counterOpacity > 0) {
        ctx.save();
        ctx.fillStyle = '#D1D1D1';  // Changed from #FFFFFF
        ctx.globalAlpha = player.counterOpacity;
        ctx.font = 'bold 32px Humane';
        ctx.letterSpacing = '2px';
        ctx.textAlign = 'center';
        ctx.fillText(`DOUBLE-JUMPS: ${player.doubleJumps}`, canvas.width/2 - 100, canvas.height - 30);
        ctx.fillText(`HOOKS: ${player.hooks}`, canvas.width/2 + 100, canvas.height - 30);
        ctx.restore();
    }

    // Save the current canvas state
    ctx.save();
    
    // Apply camera transform
    ctx.translate(0, camera.y);

    // Draw platforms with camera offset
    platforms.forEach(platform => {
        // Only draw if platform hasn't disappeared
        if (platform.countdown > 0 || platform.color !== '#79312D') {
            ctx.fillStyle = platform.color;
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            
            // Draw countdown for red platforms that are active
            if (platform.color === '#79312D' && platform.timer !== null) {
                ctx.save();
                ctx.fillStyle = '#D1D1D1';  // Changed from white
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
    });

    // Draw particles
    particles.forEach((particle, index) => {
        if (!particle.update()) {
            particles.splice(index, 1);  // Remove dead particles
        } else {
            particle.draw(ctx);
        }
    });

    // Update birds
    // Spawn new birds
    if (birds.length < maxBirds && Math.random() < birdSpawnChance) {
        birds.push(new Bird());
    }
    
    // Update existing birds
    for (let i = birds.length - 1; i >= 0; i--) {
        const bird = birds[i];
        if (!bird.update()) {
            // Remove birds that have gone offscreen
            birds.splice(i, 1);
        }
    }

    // Draw all active ropes
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    
    // Update and draw previous ropes
    player.activeRopes.forEach(rope => {
        rope.update();  // Update physics
        
        ctx.beginPath();
        if (rope.segments.length > 0) {
            ctx.moveTo(rope.segments[0].x, rope.segments[0].y);
            for (let i = 1; i < rope.segments.length; i++) {
                ctx.lineTo(rope.segments[i].x, rope.segments[i].y);
            }
        }
        ctx.stroke();
    });
    
    // Draw current rope if hooked
    if (player.isHooked) {
        ctx.beginPath();
        
        // Draw rope segments with slight curve
        if (player.ropeSegments.length > 0) {
            ctx.moveTo(player.x + player.width/2, player.y + player.height/2);
            
            // Update rope segments
            const dx = player.hookX - (player.x + player.width/2);
            const dy = player.hookY - (player.y + player.height/2);
            const slack = 0.1;  // Amount of rope sag
            
            for (let i = 0; i < player.ropeSegments.length; i++) {
                const t = i / (player.ropeSegments.length - 1);
                const sag = Math.sin(t * Math.PI) * slack * player.ropeLength;
                
                player.ropeSegments[i] = {
                    x: player.x + player.width/2 + dx * t,
                    y: player.y + player.height/2 + dy * t + sag
                };
                
                if (i === 0) {
                    ctx.moveTo(player.ropeSegments[i].x, player.ropeSegments[i].y);
                } else {
                    ctx.lineTo(player.ropeSegments[i].x, player.ropeSegments[i].y);
                }
            }
        }
        ctx.stroke();
    }

    // Draw player with camera offset
    ctx.fillStyle = '#D1D1D1';  // New color for player
    // Update squash animation
    if (player.squashAmount > 0) {
        player.squashAmount = Math.max(0, player.squashAmount - player.squashSpeed);
        player.height = player.normalHeight - player.squashAmount;
    }
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Restore canvas state
    ctx.restore();

    // Generate new platforms
    generateNewPlatforms();

    // Update hasMoved flag in input handling
    if (keys['ArrowLeft'] || keys['ArrowRight'] || keys['ArrowUp']) {
        player.hasMoved = true;
    }

    // Rest of game logic (movement, collision, etc)
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
            // Use the same jump force as the first jump
            player.velocityY = player.isCurrentJumpSuper ? player.superJumpForce : (player.jumpForce * 1.2);
            player.doubleJumps--;  // Decrease available double jumps
            player.jumpKeyReleased = false;  // Track that jump key is being held
        }
    } else {
        player.canJump = true;
        player.jumpKeyReleased = true;  // Track that jump key has been released
    }

    // Apply physics with momentum
    player.velocityY += gravity;
    
    // Apply rope physics if hooked
    if (player.isHooked) {
        // Calculate distance to hook point
        const dx = (player.x + player.width/2) - player.hookX;
        const dy = (player.y + player.height/2) - player.hookY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > player.ropeLength) {
            // Constrain to rope length
            const angle = Math.atan2(dy, dx);
            const constrainedX = player.hookX + Math.cos(angle) * player.ropeLength;
            const constrainedY = player.hookY + Math.sin(angle) * player.ropeLength;
            
            // Update position and add some swing
            player.x = constrainedX - player.width/2;
            player.y = constrainedY - player.height/2;
            
            // Add swinging physics with better momentum
            const tangentX = -Math.sin(angle);
            const tangentY = Math.cos(angle);
            
            // Apply player input to swing with momentum preservation
            let swingForce = (player.velocityX * tangentX + player.velocityY * tangentY);
            
            // Track previous direction for momentum boost
            const previousDirection = Math.sign(swingForce);
            
            // Add force based on player input with momentum enhancement
            if (keys['ArrowLeft']) {
                // If changing direction from right to left, boost the force
                if (previousDirection > 0) {
                    swingForce = swingForce * 1.2 - 0.8;  // Boost momentum when changing direction
                } else {
                    swingForce -= 0.5;  // Normal force when continuing in same direction
                }
            }
            if (keys['ArrowRight']) {
                // If changing direction from left to right, boost the force
                if (previousDirection < 0) {
                    swingForce = swingForce * 1.2 + 0.8;  // Boost momentum when changing direction
                } else {
                    swingForce += 0.5;  // Normal force when continuing in same direction
                }
            }
            
            // Apply swing with very little dampening for better momentum build-up
            swingForce *= 0.998;  // Almost no dampening (was 0.995)
            
            // Cap maximum swing speed
            const maxSwingSpeed = 25;
            swingForce = Math.max(Math.min(swingForce, maxSwingSpeed), -maxSwingSpeed);
            
            // Apply the swing forces
            player.velocityX = tangentX * swingForce;
            player.velocityY = tangentY * swingForce + gravity * 0.2;  // Even less gravity while swinging
        }
    }
    
    player.x += player.velocityX;
    player.y += player.velocityY;

    // Screen wrapping for horizontal movement
    if (player.x + player.width < 0) {
        player.x = canvas.width;
    } else if (player.x > canvas.width) {
        player.x = -player.width;
    }

    // Reset momentum when landing
    if (!player.isJumping) {
        player.jumpMomentum = 0;
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
                createLandingParticles(player.x, player.y, player.width, impactForce);  // Add particles on impact
            }
            
            player.y = platform.y - player.height;
            player.velocityY = 0;
            player.isJumping = false;
            player.canDoubleJump = false;  // Reset double jump ability when landing
            player.onSuperJumpPlatform = (platform.color === '#21282B');
            player.onSpeedPlatform = (platform.color === '#273D3E');

            // Start timer for red platforms and add double jump
            if (platform.color === '#79312D' && platform.timer === null) {
                platform.timer = Date.now();
                player.doubleJumps++;  // Increment double jumps when touching red platform
            }
            // Add hook when touching blue-gray platform
            if (platform.color === '#273D3E' && !platform.hookGiven) {
                player.hooks++;  // Increment hooks when touching blue-gray platform
                platform.hookGiven = true;  // Mark that this platform has given its hook
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
            const elapsed = (Date.now() - platform.timer) / 1000; // Convert to seconds
            platform.countdown = Math.max(3 - elapsed, 0);
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

    // Draw all ghost players if we have previous runs and game has started
    if (allPreviousRuns.length > 0 && player.hasMoved) {
        ctx.save();
        ctx.translate(0, camera.y);
        
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

        ctx.restore();
    }

    // Handle multiplayer
    if (isMultiplayer) {
        sendPlayerUpdate();

        // Draw waiting message if not both players are ready
        if (!bothPlayersReady) {
            ctx.save();
            ctx.fillStyle = '#D1D1D1';
            ctx.font = 'bold 32px Humane';
            ctx.letterSpacing = '2px';
            ctx.textAlign = 'center';
            ctx.fillText('WAITING FOR OTHER PLAYER', canvas.width/2, canvas.height/2);
            ctx.restore();
        }

        // Always draw other player and their rope if they exist
        if (otherPlayer) {
            ctx.save();
            ctx.translate(0, camera.y);
            
            // Draw other player's rope if they're hooked
            if (otherPlayer.isHooked && otherPlayer.ropeSegments) {
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.8;
                ctx.beginPath();
                
                if (otherPlayer.ropeSegments.length > 0) {
                    ctx.moveTo(otherPlayer.x + otherPlayer.width/2, otherPlayer.y + otherPlayer.height/2);
                    otherPlayer.ropeSegments.forEach(segment => {
                        ctx.lineTo(segment.x, segment.y);
                    });
                }
                ctx.stroke();
            }

            // Draw other player
            ctx.fillStyle = '#D1D1D1';
            ctx.globalAlpha = 0.8;
            ctx.fillRect(otherPlayer.x, otherPlayer.y, otherPlayer.width, otherPlayer.height);
            ctx.restore();
        }

        // Handle player collision
        if (otherPlayer && bothPlayersReady) {
            if (checkPlayerCollision(player, otherPlayer)) {
                // Calculate collision response
                const dx = (player.x + player.width/2) - (otherPlayer.x + otherPlayer.width/2);
                const dy = (player.y + player.height/2) - (otherPlayer.y + otherPlayer.height/2);
                
                // Normalize the direction
                const length = Math.sqrt(dx * dx + dy * dy);
                const normalX = dx / length;
                const normalY = dy / length;
                
                // Apply bounce effect
                const bounceForce = 8;
                player.velocityX = normalX * bounceForce;
                player.velocityY = normalY * bounceForce;
                
                // Move players apart to prevent sticking
                const overlap = (player.width + otherPlayer.width)/2 - Math.abs(dx);
                if (overlap > 0) {
                    player.x += normalX * overlap/2;
                }
            }
        }
    }

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
