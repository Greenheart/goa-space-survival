
var fireRate = 300; // cooldown between gun firing
var nextFireTime = 0; // time left until next bullet can be fired
var alienRate = 3000; // cooldown for spawning aliens
var nextAlienTime = 0;  // time left until next alien can be spawned
var aliensKilled = 0;
var music;
var shootSFX;
var alienDeathSFX;
var playerExplosionSFX;
var nextTrack = 1;
var musicPlaylist = ['goamanIntro', 'tommyInGoa'];
var playerAmmo = 50;
var playerRotationFix = Math.PI / 2;  // hack that fixes the default rotation of player-sprite

Template.game.helpers({
  'game': function() {
    game = new Phaser.Game(
      750, 500, Phaser.CANVAS, 'gameContainer',
      { preload: preload, create: create, update: update, render: render }
    );
  }
});

function preload() {
  game.load.image('background', 'http://examples.phaser.io/assets/skies/deep-space.jpg');
  game.load.image('bulletSprite', 'http://examples.phaser.io/assets/sprites/purple_ball.png');
  game.load.spritesheet('ship', 'http://examples.phaser.io/assets/sprites/humstar.png', 32, 32, 6);
  game.load.spritesheet('enemy', 'http://examples.phaser.io/assets/games/invaders/invader32x32x4.png', 32, 32);
  game.load.spritesheet('explode', 'http://examples.phaser.io/assets/games/invaders/explode.png', 128, 128, 16);
  game.load.audio('shootSFX', 'http://examples.phaser.io/assets/audio/SoundEffects/shotgun.wav');
  game.load.audio('alienDeathSFX', 'http://examples.phaser.io/assets/audio/SoundEffects/alien_death1.wav');
  game.load.audio('goamanIntro', 'http://examples.phaser.io/assets/audio/goaman_intro.mp3');
  game.load.audio('playerExplosionSFX', 'http://examples.phaser.io/assets/audio/SoundEffects/explosion.mp3');
  game.load.audio('tommyInGoa', 'http://examples.phaser.io/assets/audio/tommy_in_goa.mp3');

// TODO: git commit -m "added ammo pickups that spawn randoml when an alien is killed"

// -------------------- FUTURE TODOS ---------------------
// * add collision detection for aliens , they should not be able to spawn on top of each other.
// * aliens should not be spawning outside of map
// * aliens should get random velocities and angles to move around the game world and make gameplay harder
//    * if they hit game.world.bounds --> change direction to a new random one
// * maybe balance alien spawntime-decrease a bit so it doesn't get hard as fast as it currently does
// * maybe increase world size, add camera following the player
// * fix SFX-volumes

  //create a progress display text
  var loadingText = game.add.text(game.world.centerX, game.world.centerY, 'loading... 0%', { fill: '#ffffff' });
  loadingText.anchor.set(0.5);
  var progressDisplay = 0;

  var timerEvt = game.time.events.loop(100, function (){
      if(progressDisplay < 100){
          if(progressDisplay < game.load.progress){
              loadingText.text = 'loading... '+(++progressDisplay)+'%';
          }
      }else{
          loadingText.text = 'Ready, Go!';
          game.time.events.remove(timerEvt);
      }
  }, this);
}

function create() {
  // start physics
  game.physics.startSystem(Phaser.Physics.ARCADE);

  // add background
  game.add.tileSprite(0, 0, game.width, game.height, 'background');

  // add music
  music = game.add.audio(musicPlaylist[0]);
  music.volume = 1;
  music.allowMultiple = false;
  music.play();

  // add sound effects
  shootSFX = game.add.audio('shootSFX');
  shootSFX.volume = 1;
  shootSFX.allowMultiple = true;

  alienDeathSFX = game.add.audio('alienDeathSFX');
  alienDeathSFX.volume = 0.4;
  alienDeathSFX.allowMultiple = true;

  // bullet objects
  bullets = game.add.group();
  bullets.enableBody = true;
  bullets.physicsBodyType = Phaser.Physics.ARCADE;
  bullets.createMultiple(30, 'bulletSprite');
  bullets.setAll('checkWorldBounds', true);
  bullets.setAll('outOfBoundsKill', true);

  // ammoClip objects
  ammoClips = game.add.group();
  ammoClips.enableBody = true;
  ammoClips.physicsBodyType = Phaser.Physics.ARCADE;
  ammoClips.createMultiple(40, 'bulletSprite');

  // adding the player object
  player = game.add.sprite(game.world.centerX, game.world.centerY, 'ship');
  player.anchor.set(0.5);
  player.scale.set(1.5,1.5);
  player.smoothed = true;
  player.animations.add('fly', [0,1,2,3,4,5], 10, true);
  player.play('fly');

  // enable physics for ship
  game.physics.arcade.enable(player);
  player.body.drag.set(80);
  player.body.width *= 3/4;
  player.body.height *= 3/4;
  player.body.maxVelocity.set(180);
  player.body.collideWorldBounds = true;

  // add the enemies-group
  aliens = game.add.group();
  aliens.enableBody = true;
  aliens.physicsBodyType = Phaser.Physics.ARCADE;
  aliens.createMultiple(20, 'enemy');
  aliens.setAll('checkWorldBounds', true);
  aliens.setAll('outOfBoundsKill', true);

  // add gameState-text
  stateText = game.add.text(game.world.centerX, game.world.centerY - 50,' ', { font: '84px Arial', fill: '#fff' });
  stateText.anchor.setTo(0.5, 0.5);
  stateText.visible = false;

  // text used to display how to start a new round
  startText = game.add.text(game.world.centerX, game.world.centerY + 50, ' ', { font: '40px Arial', fill: '#fff' });
  startText.anchor.set(0.5);
  startText.visible = false;

  // add eventlisteners to keys
  upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
  wKey = game.input.keyboard.addKey(Phaser.Keyboard.W);
  leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
  aKey = game.input.keyboard.addKey(Phaser.Keyboard.A);
  rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
  dKey = game.input.keyboard.addKey(Phaser.Keyboard.D);
  fireKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
}

function update() {

  if (player.visible) {
    // check collisions --> if aliens and player collides --> call die()
    game.physics.arcade.overlap(player, aliens, die);
    game.physics.arcade.overlap(player, ammoClips, refillAmmo);
  }

  // check collisions between aliens and bullets
  game.physics.arcade.overlap(bullets, aliens, bulletAlienCollision);

  // controls
  if (player.alive) {
    if (upKey.isDown || wKey.isDown) {
      // if player is moving forward accelerate velocity
      game.physics.arcade.accelerationFromRotation(player.rotation + playerRotationFix, 300, player.body.acceleration);
    } else {
      // deaccelerate
      player.body.acceleration.set(0);
    }

    if (leftKey.isDown || aKey.isDown) {
      // rotate left
      player.body.angularVelocity = -200;
    }
    else if (rightKey.isDown || dKey.isDown) {
      // rotate right
      player.body.angularVelocity = 200;
    }
    else {
      player.body.angularVelocity = 0;
    }

    // fire bullet with spacebar
    if (fireKey.isDown) {
      if (game.time.now > nextFireTime) {
        nextFireTime = game.time.now + fireRate;
        fire();
      }
    }
  }

  if (player.alive) {
    // spawn aliens every 3 seconds
    if (game.time.now > nextAlienTime) {
      // control cooldown between each alienspawn
      if (aliens.countLiving() < aliens.length) {
        // if the maximum number of aliens not yet reached
        nextAlienTime = game.time.now + alienRate;
        generateEnemy();
      }
    }
  }

  if (!music.isPlaying) {
    // if music not playing --> change track

    music = game.add.audio(musicPlaylist[nextTrack]);
    music.play();

    if (nextTrack === musicPlaylist.length - 1) {
      // if end of playlist reahced --> play next track
      nextTrack = 0;
    } else {
      nextTrack++;
    }
  }
}

function render() {
  // display score & ammo
  if (player.alive) {
    game.debug.text('Kills: '+aliensKilled, 10, 20);
    game.debug.text('Ammo: '+playerAmmo, game.world.width - 95, 20);
  }

  /* display hitboxes
     bullets.forEachAlive(renderGroup, this);
     aliens.forEachAlive(renderGroup, this);
     ammoClips.forEachAlive(renderGroup, this);
     game.debug.body(player);
  //*/
}

function die() {
  // hide ship to allow the game to play death-animation before entering next game state
  player.visible = false;

  // play explosion sound
  game.sound.play('playerExplosionSFX');

  // create explosion animation on the player's last position
  var explosion = game.add.sprite(player.body.x, player.body.y, 'explode');
  explosion.anchor.setTo(0.5, 0.5);
  explosion.animations.add('explode');
  explosion.events.onAnimationComplete.add(function() {
    // when animation is done, kill player
    player.kill();

    // display endgame text
    stateText.text= "Score: " + aliensKilled;
    stateText.visible = true;
    startText.text = "Click to restart";
    startText.visible = true;

    game.input.onTap.addOnce(restart,this);
  });
  explosion.play('explode', 18, false, true);
}

function fire() {
  if (playerAmmo > 0) {
    var bullet = bullets.getFirstDead();
    bullet.reset(player.x, player.y);
    game.physics.arcade.velocityFromRotation(player.rotation + playerRotationFix, 500, bullet.body.velocity);
    game.sound.play('shootSFX');
    playerAmmo--;
  }
}

function generateEnemy() {
  // adding the enemy object

  // generate alien coordinates
  var alienX = game.rnd.integerInRange(0, game.world.width);
  var alienY = game.rnd.integerInRange(0, game.world.height);

  // check that the alienX and alienY isnt too close to player
  while (game.math.difference(alienX, player.x) <= 90) {
    // if they are too close, remake them
    alienX = game.rnd.integerInRange(0, game.world.width);
  }

  while (game.math.difference(alienY, player.y) <= 90) {
    alienY = game.rnd.integerInRange(0, game.world.height);
  }

  var alien = aliens.getFirstDead();
  alien.body.setSize(25, 20);
  alien.reset(alienX, alienY);
  alien.anchor.setTo(0.5, 0.8);
  alien.scale.setTo(2, 2);
  alien.animations.add('move', [0,1,2,3], 16, true);
  alien.animations.play('move');
  aliens.add(alien);

  if (alienRate >= 800) {
    alienRate -= 200;
  }
}

function dropAmmo(x, y) {
  // generate an ammoClip-obj on a given position
  var ammoClip = ammoClips.getFirstDead();
  ammoClip.reset(x, y);
  ammoClip.anchor.set(0.5);
  ammoClips.add(ammoClip);
}

function renderGroup(member) {
  // render the body of a group-member
  game.debug.body(member);
}

function bulletAlienCollision(bullet, alien) {
  // handle collision beween aliens and bullets

  // 40% chance that the alien dropAmmo
  var outcome = Math.random();
  if (outcome > 0.6) {
    // drop ammo on the alien's anchor position
    dropAmmo(alien.body.x + alien.body.width / 2, alien.body.y + alien.body.height / 2);
  }

  bullet.kill();
  alien.kill();
  aliensKilled++;
  game.sound.play('alienDeathSFX');
}

function restart () {
    // restarts the game

    // kill all aliens
    aliens.forEachAlive(function (a) {
      a.kill();
    }, this);

    ammoClips.forEachAlive(function(clip) {
      clip.kill();
    }, this);

    // revive the player
    player.reset(game.world.centerX, game.world.centerY);
    player.alive = true;

    // reset game-state and helper variables
    stateText.visible = false;
    startText.visible = false;
    aliensKilled = 0;
    alienRate = 3000;
    playerAmmo = 50;
}

function refillAmmo(player, ammoClip) {
  // handle collision between player and ammoClip
  playerAmmo += 10;
  ammoClip.kill();
}
