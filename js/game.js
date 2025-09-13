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
    // Load best score from localStorage
    bestScore = localStorage.getItem('bestScore') || 0;

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

    // Add obstacles group
    obstacles = this.physics.add.group();

    // Setup cursor keys
    cursors = this.input.keyboard.createCursorKeys();

    // Add score display
    scoreText = this.add.text(10, 10, `Score: 0\nBest: ${bestScore}`, {
        fontSize: '20px',
        fill: '#fff'
    });

    // Spawn obstacles every second
    this.time.addEvent({
        delay: 1000,
        callback: () => {
            let x = Phaser.Math.Between(20, 380);
            let obstacle = this.add.rectangle(x, 0, 40, 40, 0xff0000);
            this.physics.add.existing(obstacle);
            obstacle.body.setVelocityY(obstacleSpeed);
            obstacles.add(obstacle);
        },
        loop: true
    });
}

function update() {}
