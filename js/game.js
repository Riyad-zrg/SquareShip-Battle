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
let bullets = [];
let defenders = [];
let bossProjectiles = [];
let cursors;
let keys;
let score = 0;
let bestScore = 0;
let scoreText;
let stars = [];
let mode = 'normal';
let boss;
let bossHealth = 20;
let bossBar;
let bossActive = false;
let bossTimer = 0;

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

    graphics.fillStyle(0x0000ff, 1);
    graphics.fillRect(0, 0, 20, 20);
    graphics.generateTexture('defenderTex', 20, 20);
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

    player = this.physics.add.sprite(200, 520, 'playerTex');
    player.body.setCollideWorldBounds(true);

    let defenderCount = Math.floor(400 / 25);
    for (let i = 0; i < defenderCount; i++) {
        let defender = this.physics.add.sprite(12 + i * 25, 580, 'defenderTex');
        defenders.push(defender);
    }

    cursors = this.input.keyboard.createCursorKeys();
    keys = this.input.keyboard.addKeys({ left: 'Q', right: 'D' });

    this.input.keyboard.on('keydown-SPACE', () => shootBullet(this));
    this.input.on('pointerdown', pointer => { if (pointer.leftButtonDown()) shootBullet(this); });

    scoreText = this.add.text(10, 10, `Score: 0\nBest: ${bestScore}`, { fontSize: '20px', fill: '#fff' });

    this.time.addEvent({
        delay: 1000,
        callback: () => { if (mode === 'normal') spawnObstacle(this); },
        loop: true
    });

    bossBar = this.add.graphics();
    bossTimer = this.time.now;
}

function update() {
    let vx = 0;
    if (cursors.left.isDown || keys.left.isDown) vx = -300;
    else if (cursors.right.isDown || keys.right.isDown) vx = 300;
    player.body.setVelocityX(vx);

    score += 0.01;
    scoreText.setText(`Score: ${Math.floor(score)}\nBest: ${bestScore}`);

    if (!bossActive && mode === 'normal' && this.time.now - bossTimer >= 10000) {
        startBossFight(this);
    }

    handleObstacles(this);
    handleBullets(this);
    handleStars();
    handleBossProjectiles(this);

    if (mode === 'boss') {
        drawBossBar();
        if (this.time.now % 1000 < 20) shootBossProjectile(this);
    }
}

function spawnObstacle(scene) {
    let x = Phaser.Math.Between(20, 380);
    let obstacle = scene.physics.add.sprite(x, -50, 'obstacleTex');
    obstacle.body.setAllowGravity(false);
    obstacle.body.setVelocityY(400);
    obstacles.push(obstacle);
}

function handleObstacles(scene) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let o = obstacles[i];
        if (o.y > 600) { o.destroy(); obstacles.splice(i, 1); continue; }

        for (let j = defenders.length - 1; j >= 0; j--) {
            let d = defenders[j];
            if (scene.physics.overlap(o, d)) {
                d.destroy(); defenders.splice(j, 1);
                o.destroy(); obstacles.splice(i, 1);
                break;
            }
        }

        if (o.y > 580 && defenders.length === 0) gameOver(scene);
        if (scene.physics.overlap(player, o)) gameOver(scene);
    }
}

function handleBullets(scene) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.y -= 10;
        if (b.y < 0) { b.destroy(); bullets.splice(i, 1); continue; }

        if (mode === 'boss' && boss && scene.physics.overlap(b, boss)) {
            bossHealth--;
            b.destroy(); bullets.splice(i, 1);
            if (bossHealth <= 0) endBossFight(scene);
            continue;
        }

        for (let j = obstacles.length - 1; j >= 0; j--) {
            let o = obstacles[j];
            if (scene.physics.overlap(b, o)) {
                b.destroy(); bullets.splice(i, 1);
                o.destroy(); obstacles.splice(j, 1);
                score += 1;
                break;
            }
        }
    }
}

function handleBossProjectiles(scene) {
    for (let i = bossProjectiles.length - 1; i >= 0; i--) {
        let p = bossProjectiles[i];
        if (p.y > 600 || p.y < 0 || p.x < 0 || p.x > 400) {
            p.destroy(); bossProjectiles.splice(i, 1);
            continue;
        }
        if (scene.physics.overlap(player, p)) gameOver(scene);
    }
}

function shootBullet(scene) {
    let bullet = scene.add.rectangle(player.x, player.y - 25, 5, 15, 0xffff00);
    scene.physics.add.existing(bullet);
    bullets.push(bullet);
}

function shootBossProjectile(scene) {
    if (!boss) return;

    let proj = scene.add.rectangle(boss.x, boss.y + 50, 10, 10, 0xffff00);
    scene.physics.add.existing(proj);
    proj.body.setAllowGravity(false);

    let targetX = player.x;
    let targetY = player.y;

    let dx = targetX - boss.x;
    let dy = targetY - (boss.y + 50);
    let magnitude = Math.sqrt(dx*dx + dy*dy);
    let speed = 200;

    proj.body.setVelocity((dx/magnitude)*speed, (dy/magnitude)*speed);
    bossProjectiles.push(proj);
}

function startBossFight(scene) {
    if (mode !== 'normal') return;
    mode = 'waiting';
    bossActive = true;

    let waitForBullets = scene.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
            if (bullets.length === 0 && bossProjectiles.length === 0) {
                waitForBullets.remove();
                scene.time.delayedCall(500, () => {
                    mode = 'alert';
                    let alertRect = scene.add.rectangle(200, 300, 400, 600, 0xff0000, 0.15);
                    let alertText = scene.add.text(200, 300, 'BOSS INCOMING', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
                    scene.tweens.add({
                        targets: alertRect,
                        alpha: 0.25,
                        yoyo: true,
                        repeat: 1,
                        duration: 800,
                    });
                    scene.time.delayedCall(800, () => {
                        alertRect.destroy();
                        alertText.destroy();
                        mode = 'boss';
                        bossHealth = 20;
                        boss = scene.physics.add.sprite(200, 100, 'obstacleTex').setScale(3, 3);
                    });
                });
            }
        }
    });
}

function endBossFight(scene) {
    mode = 'normal';
    bossActive = false;
    bossTimer = scene.time.now;
    if (boss) { boss.destroy(); boss = null; }
    bossBar.clear();
    bossProjectiles.forEach(p => p.destroy());
    bossProjectiles = [];
    obstacles.forEach(o => o.body.setVelocityY(400));
}

function handleStars() {
    stars.forEach(s => {
        s.y += 2;
        if (s.y > 600) s.y = 0;
    });
}

function drawBossBar() {
    bossBar.clear();
    bossBar.fillStyle(0xff0000, 1);
    let width = 200 * (bossHealth / 20);
    bossBar.fillRect(100, 20, width, 20);
}

function gameOver(scene) {
    if (bossActive) endBossFight(scene);
    scene.physics.pause();
    player.setTint(0xff0000);
    if (score > bestScore) { bestScore = Math.floor(score); localStorage.setItem('bestScore', bestScore); }
    setTimeout(() => {
        score = 0;
        obstacles.forEach(o => o.destroy()); obstacles = [];
        bullets.forEach(b => b.destroy()); bullets = [];
        bossProjectiles.forEach(p => p.destroy()); bossProjectiles = [];
        defenders.forEach(d => d.destroy()); defenders = [];
        let defenderCount = Math.floor(400 / 25);
        for (let i = 0; i < defenderCount; i++) {
            let defender = scene.physics.add.sprite(12 + i * 25, 580, 'defenderTex');
            defenders.push(defender);
        }
        player.clearTint();
        scene.physics.resume();
        mode = 'normal';
        bossBar.clear();
        bossActive = false;
        bossTimer = scene.time.now;
    }, 2000);
}
