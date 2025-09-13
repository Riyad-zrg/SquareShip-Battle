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

function create() {
    // Generate stars
    for (let i = 0; i < 100; i++) {
        let star = this.add.rectangle(
            Phaser.Math.Between(0, 400),
            Phaser.Math.Between(0, 600),
            2, 2, 0xffffff
        );
        stars.push(star);
    }

    // Add player
    player = this.add.rectangle(200, 550, 40, 40, 0x00ff00);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);
}

function update() {}
