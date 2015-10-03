
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
  game.load.image('ship', 'http://examples.phaser.io/assets/games/asteroids/ship.png');
  game.load.image('bulletSprite', 'http://examples.phaser.io/assets/sprites/purple_ball.png');
  game.load.spritesheet('enemy', 'http://examples.phaser.io/assets/games/invaders/invader32x32x4.png', 32, 32);
  game.load.spritesheet('explode', 'http://examples.phaser.io/assets/games/invaders/explode.png', 128, 128, 16);
  game.load.audio('shootSFX', 'http://examples.phaser.io/assets/audio/SoundEffects/shotgun.wav');
  game.load.audio('alienDeathSFX', 'http://examples.phaser.io/assets/audio/SoundEffects/alien_death1.wav');
  game.load.audio('goamanIntro', 'http://examples.phaser.io/assets/audio/goaman_intro.mp3');
  game.load.audio('playerExplosionSFX', 'http://examples.phaser.io/assets/audio/SoundEffects/explosion.mp3');
  game.load.audio('tommyInGoa', 'http://examples.phaser.io/assets/audio/tommy_in_goa.mp3');

// TODO: git commit -m "added more music, removed some hardcoded values and added some new ones instead..."

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
  music.volume = 0.8;
  music.allowMultiple = false;
  music.play();

  // add sound effects
  shootSFX = game.add.audio('shootSFX');
  shootSFX.volume = 0.1;
  shootSFX.allowMultiple = true;

  alienDeathSFX = game.add.audio('alienDeathSFX');
  alienDeathSFX.volume = 0.4;
  alienDeathSFX.allowMultiple = true;

  // adding the player object
  player = game.add.sprite(game.world.centerX, game.world.centerY, 'ship');
  player.anchor.set(0.5);
  player.scale.set(1.5,1.5);
  //player.animations.add('explode', [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], 30, true);

  // enable physics for ship
  game.physics.arcade.enable(player);
  player.body.drag.set(100);
  player.body.maxVelocity.set(180);
  player.body.collideWorldBounds = true;

  // bullet objects
  bullets = game.add.group();
  bullets.enableBody = true;
  bullets.physicsBodyType = Phaser.Physics.ARCADE;
  bullets.createMultiple(30, 'bulletSprite');
  bullets.setAll('checkWorldBounds', true);
  bullets.setAll('outOfBoundsKill', true);

  // add the enemies-group
  aliens = game.add.group();
  aliens.enableBody = true;
  aliens.physicsBodyType = Phaser.Physics.ARCADE;
  aliens.createMultiple(20, 'enemy');
  aliens.setAll('checkWorldBounds', true);
  aliens.setAll('outOfBoundsKill', true);

  // add gameState-text
  stateText = game.add.text(game.world.centerX,game.world.centerY,' ', { font: '84px Arial', fill: '#fff' });
  stateText.anchor.setTo(0.5, 0.5);
  stateText.visible = false;

  // add eventlisteners to keys
  upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
  downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
  leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
  rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
  fireKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
}

function update() {

  if (player.visible) {
    // check collisions --> if aliens and player collides --> call die()
    game.physics.arcade.overlap(player, aliens, die);
  }

  // check collisions between aliens and bullets
  game.physics.arcade.overlap(bullets, aliens, bulletAlienCollision);

  // controls
  if (player.alive) {
    if (upKey.isDown) {
      // if player is moving forward accelerate velocity
      game.physics.arcade.accelerationFromRotation(player.rotation, 300, player.body.acceleration);
    } else {
      // deaccelerate
      player.body.acceleration.set(0);
    }

    if (leftKey.isDown) {
      // rotate left
      player.body.angularVelocity = -200;
    }
    else if (rightKey.isDown) {
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
  // display score
  if (player.alive) {
    game.debug.text('Kills: '+aliensKilled, 10, 20);
  }

  // call renderGroup on each of the alive members
  // aliens.forEachAlive(renderGroup, this);
}

function die() {
  player.visible = false;

  // play explosion sound
  game.sound.play('playerExplosionSFX');

  var explosion = game.add.sprite(player.body.x, player.body.y, 'explode');
  explosion.anchor.setTo(0.5, 0.5);
  explosion.animations.add('explode');
  // animate explosion --> last arg says killOnComplete: true --> kill player
  explosion.events.onAnimationComplete. add(function() {
    // when animation is done, kill player
    player.kill();
  });
  explosion.play('explode', 30, false, true);

  // display endgame text
  stateText.text="    Score: " + aliensKilled + " \n Click to restart";
  stateText.visible = true;
  game.input.onTap.addOnce(restart,this);
}

function fire() {
  var bullet = bullets.getFirstDead();
  bullet.reset(player.x-10, player.y-10);
  bullet.rotation = player.rotation;
  game.physics.arcade.velocityFromAngle(player.angle, 500, bullet.body.velocity);
  game.sound.play('shootSFX');
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

function renderGroup(member) {
    game.debug.body(member);
}

function bulletAlienCollision(a,b) {
  // handle collision beween aliens and bullets
  a.kill();
  b.kill();
  aliensKilled++;
  game.sound.play('alienDeathSFX');
}

function restart () {
    // restarts the game

    // kill all aliens
    aliens.forEachAlive(function (a) {
      a.kill();
    }, this);

    // revive the player
    player.reset(game.world.centerX, game.world.centerY);
    player.alive = true;

    // reset game-state and helper variables
    stateText.visible = false;
    aliensKilled = 0;
    alienRate = 3000;
}
