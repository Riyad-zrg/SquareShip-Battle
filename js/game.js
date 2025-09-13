const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 600,
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

let player, obstacles, cursors;
let score = 0, bestScore = 0, scoreText;
let obstacleSpeed = 200;
let stars = [];

function preload() {}
function create() {}
function update() {}
