const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 600,
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

let player;
let obstacles = [];
let cursors;
let score = 0;
let bestScore = 0;
let scoreText;
let stars = [];

function preload() {}

function create() {
    bestScore = localStorage.getItem('bestScore') || 0;

    let graphics = this.add.graphics();
    graphics.fillStyle(0x00ff00, 1);
    graphics.fillRect(0, 0, 40, 40);
    graphics.generateTexture('playerTex', 40, 40);
    graphics.clear();

    graphics.fillStyle(0xff0000, 1);
    graphics.fillRect(0, 0, 40, 40);
    graphics.generateTexture('obstacleTex', 40, 40);
    graphics.clear();

    for (let i = 0; i < 100; i++) {
        let star = this.add.rectangle(
            Phaser.Math.Between(0, 400),
            Phaser.Math.Between(0, 600),
            2, 2,
            0xffffff
        );
        stars.push(star);
    }

    player = this.physics.add.sprite(200, 550, 'playerTex');
    player.body.setCollideWorldBounds(true);

    cursors = this.input.keyboard.createCursorKeys();

    scoreText = this.add.text(10, 10, `Score: 0\nBest: ${bestScore}`, { fontSize: '20px', fill: '#fff' });

    this.time.addEvent({
        delay: 1000,
        callback: () => {
            let x = Phaser.Math.Between(20, 380);
            let obstacle = this.physics.add.sprite(x, 0, 'obstacleTex');
            obstacle.body.setAllowGravity(true);
            obstacle.body.setGravityY(300);
            obstacles.push(obstacle);
        },
        loop: true
    });
}

function update() {
    if (cursors.left.isDown) player.body.setVelocityX(-300);
    else if (cursors.right.isDown) player.body.setVelocityX(300);
    else player.body.setVelocityX(0);

    score += 0.01;
    scoreText.setText(`Score: ${Math.floor(score)}\nBest: ${bestScore}`);

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let o = obstacles[i];
        if (o.y > 600) {
            o.destroy();
            obstacles.splice(i, 1);
        } else if (this.physics.overlap(player, o)) {
            gameOver(this);
            break;
        }
    }

    stars.forEach(s => {
        s.y += 2;
        if (s.y > 600) s.y = 0;
    });
}

function gameOver(scene) {
    scene.physics.pause();
    player.setTint(0xff0000);
    if (score > bestScore) {
        bestScore = Math.floor(score);
        localStorage.setItem('bestScore', bestScore);
    }
    setTimeout(() => {
        score = 0;
        obstacles.forEach(o => o.destroy());
        obstacles = [];
        player.clearTint();
        scene.physics.resume();
    }, 2000);
}
