/*
* The main javascript for JSDiver
* jsiver.js
* Luke Jones
*/


// Utility functions for general use
// Clamp
function clamp(v, mn, mx) {
    return Math.max(mn, Math.min(v, mx));
}

// Check if value is in range
function rangeCheck(v, mn, mx) {
    return (v <= mx && v >= mn);
}

// Linear Interpolation
function lerp(va, vb, ratio) {
    return va + ratio * (vb - va);
}

// World Values
const WORLD_LEFT_LIMIT = 50;
const WORLD_RIGHT_LIMIT = 650;
const WORLD_TOP_LIMIT = 50;
const WORLD_BOTTOM_LIMIT = 750;

// Performance Value
let frameInterval, frameNow, frameThen, elapsed;

// Game Values
let debug = false; // Prints debug to console, draws extra debugging information to canvas. User can press "U" to enable debugging.

const GameState = {
    MENU: 'MENU',
    OPENING_ANIM: 'OPENING_ANIM',
    PLAYING: 'PLAYING',
    CLOSING_ANIM: 'CLOSING_ANIM'
};
let currentState = GameState.MENU;

let mainRunning = false;
let gameInitialised = false;
let score = 0; // Increased by 1 with each frame of game activity. Used for calculations. Final and Displayed score is 10x Smaller.
let lastScore = 0; // Score saved from previous round. Reset when the player restarts.
let lastScoreDifficulty = 0; // The difficulty the user was just playing at when they scored.
let obstacles = []; // Stores 2D arrays containing 7 values, obstacle type, obstacle X, obstacle Y, obstacle "size" (radius), and the side of the canvas on which the object spawned, whether the obstacle has been hit already, the "angle of travel" (a value between 0 and 4 deciding how far they travel left/right)
let bigObstacles = []; // Stores 2D arrays containing 4 values, type (0 for plane, 1 for helicopter), side (0 for top/left, 1 for bottom/right), spawned (whether obstacle is in countdown or spawned), counter (how far along across the screen the obstacle is), hit - whether the obstacle has been hit already
let difficulty = 0; // 0 is easy, 1 is medium, 2 is hard. This is selected at the start but defaults to 0.
let startSpeed;
let graphics = document.getElementById("graphicSheet");

// Obstacle Spawning Frequencies
const smallFrequency = [100, 50, 25];
const bigFrequency = [2000, 1000, 500];
let bigObstacleActive = false; // If true, the game won't spawn small obstacles while the big one is active.

// Controls
// Storing whether keys are held down
let left_down = false, right_down = false, down_down = false, up_down = false, click_down = false;
// Stores whether the keys are held down for 1 frame.
let left_tapped = false, right_tapped = false, space_tapped = false;

// Player Graphic Coordinates for each direction of travel
const directionalPlayerGraphics = {
    'N': { x: 64, y: 32 },
    'NE': { x: 128, y: 32 },
    'E': { x: 32, y: 32 },
    'SE': { x: 128, y: 0 },
    'S': { x: 64, y: 0 },
    'SW': { x: 96, y: 0 },
    'W': { x: 0, y: 32 },
    'NW': { x: 96, y: 32 }
};

// Player Values
let playerposx = 350;
let playerposy = 32;
let playeraccx = 0;
let playeraccy = 0;
let playervelx = 0;
let playervely = 0;
let playersize = 96;
let playerHealth = 5;
let maxPlayerHealth = 5;
let collision_cooldown = false;

// Main Menu Values

let menuInitialised = false;
let openingAnimTimer = 0;
let closingAnimTimer = 0;
let selectedDifficulty = 0;
// List of UI elements from graphics sprite sheet. 0 = , 1 = , 2 = , 3 = , 4 =
// [x position on sheet, y position on sheet, width on sheet, height on sheet]
let ui_graphics = [
    [160, 64, 32, 16], // Jump Button
    [160, 96, 32, 16], // Hovered Jump Button
    [160, 80, 32, 16], // Pressed Jump Button
    [192, 144, 32, 32], // Key Image
    [224, 144, 32, 32], // Pressed Key Image
    [0, 128, 48, 16], // Difficulty Easy
    [48, 128, 48, 16], // Difficulty Easy Hover
    [0, 144, 48, 16], // Difficulty Medium
    [48, 144, 48, 16], // Difficulty Medium Hover
    [0, 160, 48, 16], // Difficulty Hard
    [48, 160, 48, 16], // Difficulty Hard Hover
    [192, 128, 48, 16], // Score Counter
]
let mousepos = [0, 0];
// Current UI elements on the screen.
// [x pos, y pos, x size, y size, 'NAME', graphic from spritesheet, alternative graphic from spritesheet]
let ui_elements = [];

function createUIElement(px, py, sx, sy, name, gindex, altgindex) {
    ui_elements.push([px, py, sx, sy, name, gindex, altgindex]);
}

function mouseOverElement(element) {
    return rangeCheck(mousepos[0], element[0], element[0] + element[2]) && rangeCheck(mousepos[1], element[1], element[1] + element[3]);
}

const g_box = document.getElementById("gamebox");
const g_context = g_box.getContext("2d");
g_context.imageSmoothingEnabled = false;
g_context.shadowColor = "rgba(0,0,0,0.25)";
g_context.shadowBlur = 20;

function hurtPlayer() {
    createParticle(0, playerposx+32, playerposy+32, 1, 1, 1, 1);
    createParticle(1, playerposx, playerposy, 0.8, 1, 1, 1);
    playerHealth = clamp(playerHealth-1,0,maxPlayerHealth);
    if (playerHealth <= 0) {
        currentState = GameState.CLOSING_ANIM;
        bigObstacles = [];
        lastScore = Math.trunc(score / 10);
        lastScoreDifficulty = difficulty;
    }
}

// Closing Animation Values
let closingAnimInitialised = false;
let playerStartPos = []; // The position where the players animation should start from
let playerCurrentAnimPos = []; // How far the player has fallen
const playerFinalAnimPos = [220,670]; // Where the player should land
let mountainHit = false; // Has the animation finished yet?

// Particle Image Parameters
let particleImages = [
    [0, 64, 32, 32, -16, -16, 64, 64], // Smack
    [32, 64, 32, 32, 16, 16, 64, 64], // Shock
    [96, 64, 64, 32, 32, 16, 128, 64], // Large Cloud
    [96, 96, 32, 32, 16, 16, 256, 256], // Small Cloud
];
// Particle Age Limit per type - basically how long to let them exist before culling them off
let particleAges = [
    6,
    20,
    1000,
    200,
]
// Existing Particle Objects
// Particles are stored as arrays and contain 7 parameters: type, x position, y position, scale, age, opacity, and whether it's a foreground (1) or background (0) particle.
// 0 = Smack, 1 = Shock, 2 = Large Cloud, 3 = Small Cloud
let particles = [];

function createParticle(type, startPosX, startPosY, startingOpacity, bgfg) {
    particles.push([type, startPosX, startPosY, 1, 0, startingOpacity, bgfg]);
}

// Creates obstacle. big dictates whether obstacle should be a standard
// small one or a big one which fills the entire display.
function create_obstacle(big) {
    if (big) {
        let type, side;
        if (Math.random() < 0.5) {
            type = 0; // It's a plane
        } else {
            type = 1; // It's a helicopter
        }
        if (Math.random() < 0.5) {
            side = 0;
        } else {
            side = 1;
        }
        bigObstacles.push([type, side, false, 0, false]);
        bigObstacles.sort();
    } else {
        let obstacleX = clamp(Math.random() * g_box.width, WORLD_LEFT_LIMIT, WORLD_RIGHT_LIMIT);
        let obstacleY = g_box.height;
        let obstacleSize = 96;
        let obstacleDirection; // Dictated by the side of the screen it spawns on. E.g., if it's on the right side, then obstacleDirection = -1 (it travels left)

        // Type selector. Dictates the probability of a certain obstacle type.
        // 90% chance of Bird [0]
        // 10% chance of Kite [1]
        let obstacleType;
        let obstacleTypeSelector = Math.random() * 100;
        if (rangeCheck(obstacleTypeSelector, 0, 90)) {
            obstacleType = 0;
        } else {
            obstacleType = 1;
        }
        if (obstacleX > g_box.width / 2) {
            obstacleDirection = -1;
        } else {
            obstacleDirection = 1;
        }
        obstacles.push([obstacleType, obstacleX, obstacleY, obstacleSize, obstacleDirection, false, Math.random()*3]);
        obstacles.sort();
    }

}

function trigger_collision_cooldown() {
    collision_cooldown = true;
    setTimeout(function () {
        collision_cooldown = false;
    }, 250);
}

// Process obstacle positions. If anim is true, they will move much faster to
// ensure they are cleared from the screen during the closing animation
function obstaclePositionTick(anim) {
    let animSpeed = anim ? 2 : 1; // If anim enabled, move objects 2 times faster
    // Obstacle Movement Updates
    obstacles.forEach(function (obstacle) {
        obstacle[2] -= (animSpeed * 5 * (1 + (score / 1000))); // Increases obstacle position, with the change in distance slightly larger with each score point.

        obstacle[1] += obstacle[4] * obstacle[6] * (1 + (score / 1000)); // Move obstacle left/right slightly with same idea as vertical movement.
    });

    // Removes obstacles no longer on screen
    obstacles = obstacles.filter(function (obstacle) {
        return obstacle[2] >= -128;
    });

    // Big Obstacle Movement Updates
    bigObstacles.forEach(function (bigObstacle) {
        if (bigObstacle[2]) {
            // Move obstacle along
            if(bigObstacle[4]){
                bigObstacle[3] += 20;
            } else {
                bigObstacle[3] += 10;
            }
            if (bigObstacle[3] >= 1850) {
                bigObstacles = []; // Empty array, object is gone
                bigObstacleActive = false;
            }
        } else {
            bigObstacle[3]++;
            bigObstacle[3]*=animSpeed;
            // If obstacle has counted down enough
            if (bigObstacle[3] > 150) {
                // Set spawn flag to true
                bigObstacle[2] = true;
                bigObstacle[3] = 0;
            }
        }
    });
}

function phys_update() {

    // Function to check if a given object is "colliding" with the player
    // Essentially just compares the distance between the two and returns true if it's less than r.
    // x is the X position of the object
    // y is the Y position of the object
    // r is the radius around the object in which presence is considered collision
    function checkPlayerRadialCollision(x, y, r) {
        return (Math.sqrt(Math.pow((x - playerposx), 2) + Math.pow(y - playerposy, 2)) <= r);
    }

    // Function to check if the player's bounding box lies within a certain given zone.
    // x is the left of the box
    // y is the top of the box
    // w is the width of the box
    // h is the height of the box
    function checkPlayerZoneCollision(x,y,w,h){
        if((playerposy - (playersize / 2))>(y+h)){return false;}
        if((playerposx - (playersize / 2))>(x+w)){return false;}
        if((playerposy + (playersize / 2))<y){return false;}
        return (playerposx + (playersize / 2)) >= x;

    }

    // Physics controller
    if (currentState === GameState.PLAYING) {
        // Player Movement Update
        if (right_down && !left_down) {
            playeraccx = 1;
        } else if (left_down && !right_down) {
            playeraccx = -1;
        } else {
            playeraccx = 0;
        }
        if (up_down && !down_down) {
            playeraccy = -1;
        } else if (down_down && !up_down) {
            playeraccy = 1;
        } else {
            playeraccy = 0;
        }
        playervelx = (playervelx + playeraccx) * 0.95;
        playervely = (playervely + playeraccy) * 0.95;
        playerposx += playervelx;
        playerposy += playervely;

        // Clamp player position to world
        if (!rangeCheck(playerposx, WORLD_LEFT_LIMIT, WORLD_RIGHT_LIMIT)) {
            playerposx = clamp(playerposx, WORLD_LEFT_LIMIT, WORLD_RIGHT_LIMIT);
            playeraccx = 0;
            playervelx = 0;
        }
        if (!rangeCheck(playerposy, WORLD_TOP_LIMIT, WORLD_BOTTOM_LIMIT)) {
            playerposy = clamp(playerposy, WORLD_TOP_LIMIT, WORLD_BOTTOM_LIMIT);
            playeraccy = 0;
            playervely = 0;
        }

        // Process Obstacle Motion
        obstaclePositionTick(false);

        // Collision Checks
        obstacles.forEach(function (obstacle) {
            if (!collision_cooldown) {
                let col = checkPlayerRadialCollision(obstacle[1], obstacle[2], obstacle[3]);
                if (col) {
                    if (!obstacle[5]) {
                        trigger_collision_cooldown();
                        hurtPlayer();
                        obstacle[5] = true;
                    }
                }
            }
        });
        bigObstacles.forEach(function (bigObstacle) {
            // Get obstacle positions
            let obsy;
            let obsx;
            if (bigObstacle[1] === 0) { // Is at top/left
                obsy = 0;
                obsx = 0;
            } else { // Is at bottom/right
                obsy = g_box.height/2;
                obsx = g_box.width/2;
            }
            let col;
            g_context.fillStyle = 'rgba(255,0,255,0.5)'
            if(bigObstacle[2]){ // If the obstacle is currently active.
                if (bigObstacle[0] === 0) { // Is plane
                    col = checkPlayerZoneCollision(bigObstacle[3]-1024, obsy+144, 1024, g_box.height*0.32)
                    if(debug){ // If debugging enabled, draw rect over bounding box
                        g_context.fillRect(bigObstacle[3]-1024, obsy+144, 1024, g_box.height*0.32);
                    }
                } else { // Is Helicopter
                    col = checkPlayerZoneCollision(obsx, g_box.height-bigObstacle[3], g_box.width/2, 404)
                    if(debug){ // If debugging enabled, draw rect over bounding box
                        g_context.fillRect(obsx, g_box.height-bigObstacle[3], g_box.width/2, 404);
                    }
                }
                if(col){
                    if(!bigObstacle[4]){
                        bigObstacle[4] = true;
                        hurtPlayer();
                    }
                }
            }
        });
    }
}

// Shared draw functions
let fade = true; // If true, game will fade out slightly each frame, and out if false.
let fadeValue = 1; // Fade level, representing fade screen alpha between 0 and 1.
// These start at true and 1 because the game starts faded out.

// Draws Fade Screen
function drawFade() {
    if (fade) {
        if (fadeValue < 1) {
            fadeValue = clamp(fadeValue + 0.025, 0, 1);
        }
    } else {
        if (fadeValue > 0) {
            fadeValue = clamp(fadeValue - 0.025, 0, 1);
        }
    }
    g_context.fillStyle = 'rgba(255, 255, 255,' + fadeValue + ')';
    g_context.fillRect(0, 0, g_box.width, g_box.height);
}

// Draws game sky
function drawBackground() {
    // Draw the sky gradient background
    const sky_gradient = g_context.createLinearGradient(0, 0, 0, g_box.height);
    sky_gradient.addColorStop(0, '#DEF9FF');
    sky_gradient.addColorStop(1, '#5EB6FF');
    g_context.fillStyle = sky_gradient;
    g_context.fillRect(0, 0, g_box.width, g_box.height);
    // Draw the mountain shape
    g_context.beginPath();
    g_context.moveTo(0, g_box.height+10);
    g_context.lineTo(-10, 710);
    g_context.lineTo(200, 630);
    g_context.lineTo(380, 690);
    g_context.lineTo(540, 720);
    g_context.lineTo(g_box.width+10, 730);
    g_context.lineTo(g_box.width+10, g_box.height+10);
    g_context.closePath();
    g_context.fillStyle = '#9ebd99';
    g_context.save();
    g_context.shadowColor = 'rgba(255,255,255,0.2)';
    g_context.shadowBlur = 20;
    g_context.fill();
    g_context.strokeStyle = '#567c4d';
    g_context.stroke();
    g_context.restore();
    // If the closing animation has been played, draw a plaster on the mountain.
    if(mountainHit){
        g_context.drawImage(graphics, 128, 96, 16, 16, playerFinalAnimPos[0], playerFinalAnimPos[1], 32, 32);
    }
    // Draw a new overlay to emulate a fog effect
    const atmospheric_gradient = g_context.createLinearGradient(0, 0, 0, g_box.height);
    atmospheric_gradient.addColorStop(0, 'rgba(255,255,255,0)');
    atmospheric_gradient.addColorStop(0.825, 'rgba(255,255,255,0)');
    atmospheric_gradient.addColorStop(1, 'rgba(221,247,255,0.8)');
    g_context.fillStyle = atmospheric_gradient;
    g_context.fillRect(0, 0, g_box.width, g_box.height);
}

// Draw Player
function drawPlayer(standingOnPlane, dx, dy, scale){
    let player_sprite_x = 32;
    let player_sprite_y = 0;
    let player_sprite_w = 32;
    let player_sprite_h = 32;
    let direction;
    if(standingOnPlane){ // If the menu is active
        g_context.drawImage(graphics, player_sprite_x, player_sprite_y, player_sprite_w, player_sprite_h, dx+42, dy, scale*playersize, scale*playersize);
    } else { // Otherwise, the player must be playing
        player_sprite_x = 0;
        player_sprite_y = 0;
        direction = '';
        if (up_down) {
            direction += 'N';
        } else if (down_down) {
            direction += 'S';
        }
        if (left_down) {
            direction += 'W';
        } else if (right_down) {
            direction += 'E';
        }
        if (direction in directionalPlayerGraphics) {
            player_sprite_x = directionalPlayerGraphics[direction].x;
            player_sprite_y = directionalPlayerGraphics[direction].y;
        }

        g_context.drawImage(graphics, player_sprite_x, player_sprite_y, player_sprite_w, player_sprite_h, dx - (scale*playersize / 2), dy - (scale*playersize / 2), scale*playersize, scale*playersize);

        if (debug) { // If debugging enabled, drawGame box around player
            g_context.fillStyle = "rgba(255,0,0,0.5)";
            g_context.fillRect(dx - (playersize / 2), dy - (playersize / 2), playersize, playersize);
        }
    }

}

// Draw plane across canvas at given y position
function drawPlane(y) {
    let planeWidth = 178;
    let yvib = Math.random() - 0.5
    y += yvib;
    for (let i = 0; i < (g_box.width / planeWidth) + 1; i++) {
        g_context.drawImage(graphics, 192, 0, 64, 64, (planeWidth * i) - (planeWidth / 2), y, planeWidth, planeWidth);
        if(i === Math.trunc(((g_box.width / planeWidth) + 1)/2)){
            g_context.drawImage(graphics, 192, 64, 64, 64, (planeWidth * i) - (planeWidth / 2), y, planeWidth, planeWidth);
            drawPlayer(true, (planeWidth * i) - (planeWidth / 2), 62+yvib, 1);
        }
    }
}

// Draw a red pulse on a portion of the screen. Side 0=Top/Bottom 1=Left/Right, Alt 0=Top/Left 1=Bottom/Right (Depends on Side), Count (used to calculate alpha)
function drawPulse(side, alt, count) {
    g_context.fillStyle = 'rgba(255, 0, 0,' + (0.4 * (Math.sin(count / 5))) + ')';
    if (side === 0) {
        if (alt === 0) {
            g_context.fillRect(0, 0, g_box.width, g_box.height / 2);
        } else {
            g_context.fillRect(0, g_box.height / 2, g_box.width, g_box.height / 2);
        }
    } else {
        if (alt === 0) {
            g_context.fillRect(0, 0, g_box.width / 2, g_box.height);
        } else {
            g_context.fillRect(g_box.width / 2, 0, g_box.width / 2, g_box.height);
        }
    }
}

// Draw big obstacle
function drawBigObstacle(side, alt, count) {
    let obsy;
    let obsx = g_box.width/2;
    if (alt === 0) {
        obsy = 0;
    } else {
        obsy = (g_box.height / 2);
    }
    if (side === 0) { // Is plane
        g_context.drawImage(graphics, 0, 176, 48, 32, count-1024, obsy, 288, 128); // Draw Plane Tail
        g_context.drawImage(graphics, 0, 208, 256, 48, count-1024, obsy+128, 1024, 256); // Draw Plane Body
    } else { // Is Helicopter
        g_context.save();
        if (alt === 0) {
            g_context.scale(-1, 1);
            obsx = -obsx;
        }
        g_context.drawImage(graphics, 176, 176, 80, 32, obsx, g_box.height - count, g_box.width / 2, 116); // Draw Propellers
        g_context.drawImage(graphics, 96, 128, 80, 80, obsx, g_box.height - count, g_box.width / 2, 404); // Draw Body
        g_context.restore();
    }
}

function drawMenu() {
    drawBackground();
    // Draw UI elements
    drawPlane(10);

    // Draw selection box over currently selected difficulty
    switch (selectedDifficulty){
        case 0:
            g_context.fillStyle = 'rgba(0,255,0,0.5)';
            break;
        case 1:
            g_context.fillStyle = 'rgba(255,153,0,0.5)';
            break;
        case 2:
            g_context.fillStyle = 'rgba(255,0,0,0.5)';
            break;
        default:
            g_context.fillStyle = 'rgba(255,255,255,0.5)';
            break;
    }
    g_context.fillRect(16 + (225 * selectedDifficulty), 380, 220, 100);
    // Draw Buttons
    ui_elements.forEach(function (item) {
        g_context.save();
        if(item[5]===0){
            if (selectedDifficulty === 0) {
                g_context.filter = 'hue-rotate(100deg)';
            } else if (selectedDifficulty === 1) {
                g_context.filter = 'hue-rotate(50deg)';
            }
        }
        if (mouseOverElement(item)) { // If the user is currently hovering over the item, draw alt graphic
            g_context.drawImage(graphics, ui_graphics[item[6]][0], ui_graphics[item[6]][1], ui_graphics[item[6]][2], ui_graphics[item[6]][3], item[0], item[1], item[2], item[3]);
        } else { // Otherwise, draw normal graphic
            g_context.drawImage(graphics, ui_graphics[item[5]][0], ui_graphics[item[5]][1], ui_graphics[item[5]][2], ui_graphics[item[5]][3], item[0], item[1], item[2], item[3]);
        }
        g_context.restore();
    });
    g_context.font = "bolder 40px Arial"
    g_context.fillStyle = '#fff';
    g_context.fillText("Select a Difficulty:", 190, 300);
    g_context.fillStyle = '#000';
    g_context.strokeText("Select a Difficulty:", 190, 300);

    if(lastScore!==0){
        g_context.font = "bolder 30px Arial"
        g_context.fillStyle = '#fff';
        g_context.fillText("Score: "+lastScore, 270, 70);
        g_context.fillText("Submit your score to the leaderboard!", 100, 120);
        g_context.fillStyle = '#000';
        g_context.strokeText("Score: "+lastScore, 270, 70);
        g_context.strokeText("Submit your score to the leaderboard!", 100, 120);
    }

}

// Draw Obstacles
function drawObstacles(){
    obstacles.forEach(function (obstacle) {
        if (obstacle[0] === 0) {
            let flap = 0;
            if ((score % 50) < 25) {
                flap += 32;
            }
            g_context.save();
            if (obstacle[4] === 1) { // Draw bird facing direction of travel
                g_context.scale(-1, 1);
                g_context.drawImage(graphics, flap, 96, 32, 32, -obstacle[1] - (obstacle[3] / 2), obstacle[2] - (obstacle[3] / 2), obstacle[3], obstacle[3]);
            } else {
                g_context.drawImage(graphics, flap, 96, 32, 32, obstacle[1] - (obstacle[3] / 2), obstacle[2] - (obstacle[3] / 2), obstacle[3], obstacle[3]);
            }
            g_context.restore();
        } else if (obstacle[0] === 1) {
            let kiteCorner = [obstacle[1] - 32,obstacle[2] - 48]
            g_context.drawImage(graphics, 64, 64, 32, 48, kiteCorner[0], kiteCorner[1], 64, 96);
            // Draw kite string
            g_context.save();
            for(let j=0;j<5;j++){
                g_context.globalAlpha = 1-(j/5);
                g_context.drawImage(graphics, 64, 112, 32, 16, kiteCorner[0]-(64*j)-64, kiteCorner[1]+(30*j)+96, 64, 32);
            }
            g_context.restore();
        } else {
            g_context.fillStyle = "#f00";
            g_context.fillRect(obstacle[1], obstacle[2], obstacle[3], obstacle[3]);
        }
        if (debug) { // If debugging enabled, drawGame box around obstacle.
            g_context.fillStyle = "rgba(187,0,255,0.5)";
            g_context.fillRect(obstacle[1] - (obstacle[3] / 2), obstacle[2] - (obstacle[3] / 2), obstacle[3], obstacle[3]);
        }
    });
}

// Draw and tick selected particles
function drawParticle(particle, mode) {
    if (particle[6] === mode) {
        g_context.save();
        g_context.globalAlpha = particle[5];
        g_context.drawImage(graphics, particleImages[particle[0]][0], particleImages[particle[0]][1], particleImages[particle[0]][2], particleImages[particle[0]][3], particle[1] + particleImages[particle[0]][4] - (particleImages[particle[0]][6] * particle[3]) / 2, particle[2] + particleImages[particle[0]][5] - (particleImages[particle[0]][7] * particle[3]) / 2, particleImages[particle[0]][6] * particle[3], particleImages[particle[0]][7] * particle[3]);
        particle[4]++;
        switch (particle[0]) {
            case 0:
                particle[5] *= 0.9;
                break;
            case 1:
                particle[3] *= 1.05;
                particle[5] *= 0.95;
                break;
            case 2:
                particle[2] -= 2;
                break;
            case 3:
                particle[2] -= 15;
                break;
            case 4:
                particle[1] -= playeraccx;
                particle[2] -= playeraccy;
                particle[3] *= 0.98;
                particle[5] *= 0.98;
                break;
            default:
                break;
        }
        g_context.restore();
    }
    // Remove particles past age limit
    particles = particles.filter(function (particle) {
        return particle[4] < particleAges[particle[0]];
    });
}

// Draw Closing Animation Frame
function drawClosingAnimation(){
    // Fill Background
    drawBackground();

    // Move Obstacles Off-Screen
    obstaclePositionTick(true);
    // Draw Obstacles Leaving
    drawObstacles();
    // Draw big obstacle leaving, if it exists.
    bigObstacles.forEach(function (bigObstacle){
        if(bigObstacle[2]){
            drawBigObstacle(bigObstacle[0], bigObstacle[1], bigObstacle[3]);
        } else {
            drawPulse(bigObstacle[0], bigObstacle[1], bigObstacle[3]);
        }
    });

    // Draw Player
    g_context.save();
    g_context.translate(playerCurrentAnimPos[0], playerCurrentAnimPos[1]);
    g_context.rotate(clamp(5-(closingAnimTimer/20),0,5) * Math.PI);
    if(closingAnimTimer < 100){ // If the animation is playing the part before he hits the mountain, draw the player
        drawPlayer(false, 0, 0, clamp(1-(closingAnimTimer/100),0,1));
    }
    g_context.restore();

    // Ensure to get particles off-screen smoothly
    particles.forEach(function(particle){
        drawParticle(particle, 1);
        drawParticle(particle, 0);
    });
}

// Draw Game Frame
function drawGame() {
    // Fill Background
    drawBackground();

    // Background Clouds (Particles)
    if ((Math.random() * 100) <= 1) { // 1% chance in each frame of cloud spawning
        createParticle(2, Math.random() * g_box.width, g_box.height + 64, 0.5, 0);
    }

    // Draw and Tick background Particles
    particles.forEach(function (particle) {
        if (particle[6] === 0) {
            drawParticle(particle, 0);
        }
    });

    // Draw Player (falling)
    drawPlayer(false, playerposx, playerposy, 1);

    // Draw Obstacles
    drawObstacles();

    // Draw big obstacle, if it exists.
    bigObstacles.forEach(function (bigObstacle){
        if(bigObstacle[2]){
            drawBigObstacle(bigObstacle[0], bigObstacle[1], bigObstacle[3]);
        } else {
            drawPulse(bigObstacle[0], bigObstacle[1], bigObstacle[3]);
        }
    });

    // Create Foreground Particles
    if ((Math.random() * 100) <= 1) { // 1% chance in each frame of foreground cloud spawning
        createParticle(3, Math.random() * g_box.width, g_box.height + 64, 0.5, 1);
    }

    // Draw and Tick foreground Particles
    particles.forEach(function (particle) {
        if (particle[6] === 1) {
            drawParticle(particle, 1);
        }
    });


    // Draw Interface
    g_context.fillStyle = "#ccf8aa";
    g_context.font = "bolder 30px Consolas";
    g_context.shadowColor = "rgba(0,0,0,1)";
    g_context.shadowBlur = 5;
    g_context.drawImage(graphics, ui_graphics[11][0], ui_graphics[11][1], ui_graphics[11][2], ui_graphics[11][3], 8, g_box.height - 64, 144, 48);
    g_context.fillText(String(Math.trunc(score / 10)), 20, g_box.height - 30);

    // Health Bar
    let health_bar_position = [170, 745, 4]; // Top Left Position and Heart Padding
    function drawHeart(index, state) {
        const xOffset = health_bar_position[0] + (index * (32 + health_bar_position[2]));
        const imageX = (state === 3) ? 128 : 144;
        g_context.drawImage(graphics, imageX, 112, 16, 16, xOffset, health_bar_position[1], 32, 32);
    }

    for (let i = 0; i < maxPlayerHealth; i++) {
        if (playerHealth > i) {
            drawHeart(i, 3);
        } else if (playerHealth === i) {
            drawHeart(i, 2);
        } else {
            drawHeart(i, 1)
        }
    }

    // Reset Shading
    g_context.shadowColor = "rgba(0,0,0,0.25)";
    g_context.shadowBlur = 20;
}

function requestStart() {
    if (!mainRunning) {
        frameInterval = 1000/60;
        frameThen = performance.now();
        frameNow = performance.now();
        elapsed = frameNow - frameThen;
        gameRuntimeHandler();
    }
    mainRunning = true;
}

function gameRuntimeHandler(){
    frameNow = performance.now();
    elapsed = frameNow - frameThen;
    if (elapsed >= frameInterval) {
        frameThen = frameNow - (elapsed % frameInterval);
        main();
    }
    requestAnimationFrame(gameRuntimeHandler);
}

// Function to draw debug menu overlay if debugging is enabled.
let debuggingItems;
let spacing = 12;
function drawDebugMenu() {
    debuggingItems = [
        ["FPS:.................: ", Math.trunc(1000/elapsed)],
        ["Debug:...............: ", debug],
        ["Score:...............: ", score],
        ["Difficulty:..........: ", difficulty],
        ["Health:..............: ", playerHealth],
        ["fade:................: ", fade],
        ["fadeValue:...........: ", fadeValue],
        ["bigObstacleActive....: ", bigObstacleActive],
        ["bigObstacles.........: ", bigObstacles],
        ["mousepos.............: ", mousepos],
        ["selectedDifficulty...: ", selectedDifficulty]
    ];
    g_context.save();
    g_context.shadowBlur = 0;
    g_context.fillStyle = 'rgba(0,0,0,0.5)';
    g_context.fillRect(0,0,300,spacing*(1+debuggingItems.length));
    g_context.fillStyle = '#fff';
    g_context.font = '12px Consolas';
    for(let i = 0;i<debuggingItems.length;i++){
        g_context.fillText(debuggingItems[i][0]+debuggingItems[i][1], 0, spacing*(i+1), 300);
    }
    g_context.restore();
}

// Start game function, called from Menu
function startGame(){
    currentState = GameState.OPENING_ANIM;
    fade = true;
    scoreSubmitted = false;
}

// Main Gameloop Function. Called with every frame,
// ensuring logic is executed per game-flow, calling
// for physics tick and draw updates.
function main() {
    if (currentState === GameState.MENU) { // If the player is currently at the menu
        if (!menuInitialised) {
            createUIElement(285, 600, 128, 64, 'STARTBTN', 0, 1);
            createUIElement(285, 600, 128, 64, '', 0, 1);
            createUIElement(30, 400, 192, 64, 'SELECTEASY', 5, 6);
            createUIElement(255, 400, 192, 64, 'SELECTMEDIUM', 7, 8);
            createUIElement(480, 400, 192, 64, 'SELECTHARD', 9, 10);
            menuInitialised = true;
            fade = false;
        } else {
            drawMenu();
            if (click_down) {
                ui_elements.forEach(function (element) {
                    if (mouseOverElement(element)) {
                        switch (element[4]) {
                            case 'STARTBTN':
                                startGame();
                                break;
                            case 'SELECTEASY':
                                selectedDifficulty = 0;
                                break;
                            case 'SELECTMEDIUM':
                                selectedDifficulty = 1;
                                break;
                            case 'SELECTHARD':
                                selectedDifficulty = 2;
                                break;
                            default:
                                break;
                        }
                    }
                });
            }
            if (left_tapped) {
                selectedDifficulty = clamp(selectedDifficulty-1,0,2);
            } else if (right_tapped) {
                selectedDifficulty = clamp(selectedDifficulty+1,0,2);
            } else if (space_tapped) {
                startGame();
            }
        }
    } else if (currentState === GameState.OPENING_ANIM) { // If the player has just pressed start
        if (openingAnimTimer > 100) {
            currentState = GameState.PLAYING;
            openingAnimTimer = 0;
        } else {
            openingAnimTimer++;
        }
    } else if (currentState === GameState.PLAYING) { // If the game is active
        if (!gameInitialised) { // If first frame/game uninitialised
            gameInitialised = true
            score = 0;
            lastScore = 0;
            lastScoreDifficulty = difficulty;
            playerposx = 350;
            playerposy = 32;
            playervelx = 0;
            playervely = 0;
            playeraccx = 0;
            playeraccy = 0;
            obstacles = [];
            bigObstacles = [];
            bigObstacleActive = false;
            collision_cooldown = false;
            difficulty = selectedDifficulty;
            if (difficulty === 0) {
                maxPlayerHealth = 5;
                startSpeed = 5;
            } else if (difficulty === 1) {
                maxPlayerHealth = 5;
                startSpeed = 10;
            } else {
                maxPlayerHealth = 3;
                startSpeed = 15;
            }
            playerHealth = maxPlayerHealth;
            fade = false;
        } else { // If game underway
            drawGame();
            phys_update();
            score++;
            if(!bigObstacleActive){
                if (score % smallFrequency[difficulty] === 0) {
                    create_obstacle(false);
                }
                if (score % bigFrequency[difficulty] === 0) {
                    bigObstacleActive = true;
                    create_obstacle(true);
                }
            }
        }
    } else if (currentState === GameState.CLOSING_ANIM) { // If player has died and menu not yet reached
        // This code is for the closing animation which plays after the player's death.
        if(!closingAnimInitialised){ // If the animation hasn't started yet...
            closingAnimInitialised = true;
            gameInitialised = false;
            playerStartPos = [playerposx, playerposy];
            playerCurrentAnimPos = [playerposx, playerposy];
            closingAnimTimer = 0;
        }

        // Closing Anim Timer
        if (closingAnimTimer > 200){
            fade = true;
        }
        if (closingAnimTimer > 250) { // Play for roughly 5 seconds before reaching menu
            closingAnimTimer = 0;
            currentState = GameState.MENU;
            fade = false;
            closingAnimInitialised = false;
            mountainHit = false;
            playerStartPos = [];
            playerCurrentAnimPos = [];
        } else {
            // Process animation
            drawClosingAnimation();
            if(closingAnimTimer === 100){
                mountainHit = true;
                createParticle(0, playerFinalAnimPos[0]+32, playerFinalAnimPos[1]+32, 1, 1);
                createParticle(1, playerFinalAnimPos[0], playerFinalAnimPos[1], 0.4, 1);
            } else {
                playerCurrentAnimPos[0] = lerp(playerStartPos[0], playerFinalAnimPos[0], clamp(closingAnimTimer/100,0,1));
                playerCurrentAnimPos[1] = lerp(playerStartPos[1],playerFinalAnimPos[1], clamp(closingAnimTimer/100,0,1));
            }
            closingAnimTimer++;
        }
    }
    drawFade();
    left_tapped = false;
    right_tapped = false;
    space_tapped = false;
    if (debug) {
        drawDebugMenu();
    }
}

// Input Handler
function handleKeys(input_event, press) {
    let inp_key;
    if (input_event != null) {
        inp_key = input_event.key;
        // In the event that the user is currently focused on a text field, prioritise that over game control.
        if (document.activeElement.tagName.toLowerCase() === "input") {
            return;
        }
        input_event.preventDefault();
        switch (inp_key) {
            case "ArrowLeft":
            case "A":
            case "a":
                left_down = press;
                left_tapped = press;
                break;
            case "ArrowRight":
            case "D":
            case "d":
                right_down = press;
                right_tapped = press;
                break;
            case "ArrowUp":
            case "W":
            case "w":
                up_down = press;
                break;
            case "ArrowDown":
            case "S":
            case "s":
                down_down = press;
                break;
            case " ":
                space_tapped = press;
                break;
            case "U":
            case "u":
                if (press) {
                    debug = !debug;
                }
                break;
            default:
                break;
        }
    }
}

document.onkeydown = function (event) {
    handleKeys(event, true);
};
document.onkeyup = function (event) {
    handleKeys(event, false);
};
document.onmousemove = function (event) {
    let canvasBounds = g_box.getBoundingClientRect();
    mousepos = [Math.trunc(event.clientX - canvasBounds.left), Math.trunc(event.clientY - canvasBounds.top)];
};
document.onmousedown = function () {
    click_down = true;
};
document.onmouseup = function () {
    click_down = false;
};

// Draws the once-seen starter text.
g_context.fillStyle = '#000';
g_context.font = "bolder 30px Arial";
g_context.fillText("Click to Start...", 285, 400);