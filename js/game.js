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
let obstacleSpeed = 400;
let spawnDelay = 1000;
let bossDirection = 1;
let bossSpeed = 100;
let bossType = "classic";
let sounds = {};
let music;
let lastShootTime = 0;
const shootCooldown = 200;
let gameOverMenu;
let musicOn = true;
let menuActive = false;

function preload() {
    this.load.audio('shoot', 'assets/shoot.wav');
    this.load.audio('bossShoot', 'assets/bossShoot.wav');
    this.load.audio('hit', 'assets/hit.wav');
    this.load.audio('gameOver', 'assets/gameOver.wav');
    this.load.audio('alarm', 'assets/alarm.wav');
    this.load.audio('bgMusic', 'assets/bgMusic.mp3');
}

function create() {
    sounds.shoot = this.sound.add('shoot');
    sounds.bossShoot = this.sound.add('bossShoot');
    sounds.hit = this.sound.add('hit');
    sounds.gameOver = this.sound.add('gameOver');
    sounds.alarm = this.sound.add('alarm');

    music = this.sound.add('bgMusic', { loop: true, volume: 0.5 });
    music.play();

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
    player.setDepth(5);

    resetDefenders(this);

    cursors = this.input.keyboard.createCursorKeys();
    keys = this.input.keyboard.addKeys({ left: 'Q', right: 'D' });

    this.input.keyboard.on('keydown-SPACE', () => shootBullet(this));
    this.input.on('pointerdown', pointer => { if (pointer.leftButtonDown()) shootBullet(this); });

    scoreText = this.add.text(10, 10, `Score: 0\nBest: ${bestScore}`, { fontSize: '20px', fill: '#fff' });
    scoreText.setDepth(10);

    this.time.addEvent({
        delay: spawnDelay,
        callback: () => { if (mode === 'normal') spawnObstacle(this); },
        loop: true
    });

    bossBar = this.add.graphics();
    bossBar.setDepth(9);
    bossTimer = this.time.now;
}

function update() {
    if (!menuActive) {
        let vx = 0;
        if (cursors.left.isDown || keys.left.isDown) vx = -300;
        else if (cursors.right.isDown || keys.right.isDown) vx = 300;
        player.body.setVelocityX(vx);

        score += 0.01;
        scoreText.setText(`Score: ${Math.floor(score)}\nBest: ${bestScore}`);

        if (!bossActive && mode === 'normal') {
            if ((bossTimer === 0 && this.time.now >= 10000) || (bossTimer > 0 && this.time.now - bossTimer >= 20000)) {
                startBossFight(this);
            }
        }

        handleObstacles(this);
        handleBullets(this);
        handleBossProjectiles(this);
        handleStars();

        if (mode === 'boss' && boss) {
            drawBossBar();

            if (bossType !== "sniper") {
                boss.x += bossDirection * bossSpeed * (this.game.loop.delta / 1000);
                if (boss.x < 50) bossDirection = 1;
                else if (boss.x > 350) bossDirection = -1;
            }

            let shootChance = 0;
            if (bossType === "classic") shootChance = 2;
            else if (bossType === "tank") shootChance = 1;
            else if (bossType === "fast") shootChance = 4;
            else if (bossType === "sniper") shootChance = 3;

            if (Phaser.Math.Between(0, 100) < shootChance) shootBossProjectile(this, bossType);
        }

        if (Math.floor(score) % 50 === 0) {
            obstacleSpeed = 400 + score / 5;
            spawnDelay = Math.max(300, 1000 - score / 2);
        }
    }
}

function resetDefenders(scene) {
    defenders.forEach(d => d.destroy());
    defenders = [];
    let defenderCount = Math.floor(400 / 25);
    for (let i = 0; i < defenderCount; i++) {
        let defender = scene.physics.add.sprite(12 + i * 25, 580, 'defenderTex');
        defender.setDepth(4);
        defenders.push(defender);
    }
}

function spawnObstacle(scene) {
    let x = Phaser.Math.Between(20, 380);
    let obstacle = scene.physics.add.sprite(x, -50, 'obstacleTex');
    obstacle.setDepth(1);
    obstacle.body.setAllowGravity(false);
    obstacle.body.setVelocityY(obstacleSpeed);
    obstacles.push(obstacle);
}

function handleObstacles(scene) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let o = obstacles[i];

        for (let j = defenders.length - 1; j >= 0; j--) {
            let d = defenders[j];
            if (scene.physics.overlap(o, d)) {
                d.destroy();
                defenders.splice(j, 1);
                o.destroy();
                obstacles.splice(i, 1);
                sounds.hit.play();
                scene.cameras.main.shake(200, 0.01);
                break;
            }
        }

        if (scene.physics.overlap(player, o)) {
            gameOver(scene);
            return;
        }

        if (o.y >= 580) {
            gameOver(scene);
            return;
        }

        if (o.y > 600) {
            o.destroy();
            obstacles.splice(i, 1);
        }
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
            sounds.hit.play();
            if (bossHealth <= 0) endBossFight(scene);
            continue;
        }

        for (let j = obstacles.length - 1; j >= 0; j--) {
            let o = obstacles[j];
            if (scene.physics.overlap(b, o)) {
                b.destroy(); bullets.splice(i, 1);
                o.destroy(); obstacles.splice(j, 1);
                sounds.hit.play();
                score += 1;
                break;
            }
        }
    }
}

function handleBossProjectiles(scene) {
    for (let i = bossProjectiles.length - 1; i >= 0; i--) {
        let p = bossProjectiles[i];
        p.x += p.vx * (scene.game.loop.delta / 1000);
        p.y += p.vy * (scene.game.loop.delta / 1000);
        if (p.y > 600 || p.y < 0 || p.x < 0 || p.x > 400) {
            p.destroy(); bossProjectiles.splice(i, 1);
            continue;
        }
        if (scene.physics.overlap(player, p)) gameOver(scene);
    }
}

function shootBossProjectile(scene, type) {
    if (!boss) return;
    let bx = boss.x, by = boss.y;
    let px = player.x, py = player.y;
    let dx = px - bx, dy = py - by;
    let dist = Math.sqrt(dx*dx + dy*dy);
    let speed = (type === "sniper") ? 400 : 200;
    let proj = scene.add.rectangle(bx, by, 8, 8, 0xffff00);
    scene.physics.add.existing(proj);
    proj.setDepth(3);
    proj.vx = dx / dist * speed;
    proj.vy = dy / dist * speed;
    bossProjectiles.push(proj);
    sounds.bossShoot.play();
}

function shootBullet(scene) {
    if (menuActive) return;
    if (scene.time.now - lastShootTime < shootCooldown) return;
    lastShootTime = scene.time.now;

    let bullet = scene.add.rectangle(player.x, player.y - 25, 5, 15, 0xffff00);
    scene.physics.add.existing(bullet);
    bullet.setDepth(6);
    bullets.push(bullet);
    sounds.shoot.play();
}

function drawBossBar() {
    bossBar.clear();
    const maxBarWidth = 200;
    const barHeight = 15;
    const x = (config.width - maxBarWidth) / 2;
    const y = 20;
    let maxHealth = 20;
    if (bossType === "tank") maxHealth = 40;
    else if (bossType === "fast") maxHealth = 15;
    else if (bossType === "sniper") maxHealth = 10;
    let width = maxBarWidth * Math.max(0, bossHealth) / maxHealth;
    bossBar.fillStyle(0x555555, 1);
    bossBar.fillRect(x, y, maxBarWidth, barHeight);
    bossBar.fillStyle(0xff0000, 1);
    bossBar.fillRect(x, y, width, barHeight);
}

function startBossFight(scene) {
    if (mode !== 'normal') return;
    mode = 'waiting';
    bossActive = true;

    bossType = Phaser.Math.RND.pick(["classic", "tank", "fast", "sniper"]);

    let waitForBullets = scene.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
            if (bullets.length === 0 && bossProjectiles.length === 0) {
                waitForBullets.remove();
                scene.time.delayedCall(500, () => {
                    mode = 'alert';
                    sounds.alarm.play();
                    let alertRect = scene.add.rectangle(200, 300, 400, 600, 0xff0000, 0.15);
                    let alertText = scene.add.text(200, 300, 'BOSS INCOMING', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
                    alertText.setDepth(11);
                    scene.time.delayedCall(1000, () => {
                        alertRect.destroy();
                        alertText.destroy();
                        mode = 'boss';
                        if (bossType === "classic") { bossHealth = 20; bossSpeed = 100; }
                        else if (bossType === "tank") { bossHealth = 40; bossSpeed = 50; }
                        else if (bossType === "fast") { bossHealth = 15; bossSpeed = 200; }
                        else if (bossType === "sniper") { bossHealth = 10; bossSpeed = 0; }

                        boss = scene.physics.add.sprite(200, 100, 'obstacleTex').setScale(3, 3);
                        boss.setDepth(2);
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
}

function handleStars() {
    stars.forEach(s => {
        s.y += 2;
        if (s.y > 600) s.y = 0;
    });
}

function gameOver(scene) {
    mode = 'paused';
    menuActive = true;
    scene.physics.pause();
    player.setTint(0xff0000);
    sounds.gameOver.play();
    if (score > bestScore) {
        bestScore = Math.floor(score);
        localStorage.setItem('bestScore', bestScore);
    }

    endBossFight(scene);

    gameOverMenu = scene.add.container(config.width / 2, config.height / 2);

    let bg = scene.add.rectangle(0, 0, 300, 200, 0x000000, 0.8).setStrokeStyle(2, 0xffffff);
    let retryText = scene.add.text(0, -40, 'RETRY', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive();
    let musicText = scene.add.text(0, 40, `MUSIC: ${musicOn ? 'ON' : 'OFF'}`, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5).setInteractive();

    retryText.on('pointerover', () => retryText.setStyle({ fill: '#ff0' }));
    retryText.on('pointerout', () => retryText.setStyle({ fill: '#fff' }));
    musicText.on('pointerover', () => musicText.setStyle({ fill: '#ff0' }));
    musicText.on('pointerout', () => musicText.setStyle({ fill: '#fff' }));

    retryText.on('pointerdown', () => {
        gameOverMenu.destroy();
        resetGame(scene);
    });

    musicText.on('pointerdown', () => {
        musicOn = !musicOn;
        music.setMute(!musicOn);
        musicText.setText(`MUSIC: ${musicOn ? 'ON' : 'OFF'}`);
    });

    gameOverMenu.add([bg, retryText, musicText]);
    scene.tweens.add({
        targets: gameOverMenu,
        scaleX: { from: 0, to: 1 },
        scaleY: { from: 0, to: 1 },
        ease: 'Back',
        duration: 500
    });
}

function resetGame(scene) {
    score = 0;
    obstacles.forEach(o => o.destroy()); obstacles = [];
    bullets.forEach(b => b.destroy()); bullets = [];
    bossProjectiles.forEach(p => p.destroy()); bossProjectiles = [];
    resetDefenders(scene);
    player.clearTint();
    scene.physics.resume();
    mode = 'normal';
    bossBar.clear();
    bossActive = false;
    bossTimer = scene.time.now;
    menuActive = false;
}
