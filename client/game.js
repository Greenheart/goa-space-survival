
var fireRate = 300; // cooldown between gun firing
var nextFireTime = 0; // time left until next bullet can be fired
var alienRate = 3000; // cooldown for spawning aliens
var nextAlienTime = 0;  // time left until next alien can be spawned
var aliensKilled = 0;
var music;
var shootSFX;
var alienDeathSFX;
var playerRotationSpeed = 10;
var playerSpeed = 4;
//TODO: add acceleration / deacceleration to player-ship
// so the ship can't go to max velocity directly or stop directly

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
  game.load.audio('shootSFX', 'http://examples.phaser.io/assets/audio/SoundEffects/shotgun.wav');
  game.load.audio('alienDeathSFX', 'http://examples.phaser.io/assets/audio/SoundEffects/alien_death1.wav');
  game.load.audio('goamanIntro', 'http://examples.phaser.io/assets/audio/goaman_intro.mp3');


  //TODO: explosion sound effect on player death, maybe animation as well

  //create a progress display text
  var loadingText = game.add.text(300, game.world.height/2-20, 'loading... 0%', { fill: '#ffffff' });
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
  music = game.add.audio('goamanIntro');
  music.volume = 0.8;
  music.play();

  // add sound effects
  shootSFX = game.add.audio('shootSFX');
  shootSFX.volume = 0.1;
  shootSFX.allowMultiple = true;

  alienDeathSFX = game.add.audio('alienDeathSFX');
  alienDeathSFX.volume = 0.4;
  alienDeathSFX.allowMultiple = true;

  // adding the player object
  player = game.add.sprite(375, 250, 'ship');
  player.anchor.set(0.5);
  player.scale.set(1.5,1.5);

  // enable physics for ship
  game.physics.arcade.enable(player);
  player.body.drag.set(100);
  player.body.maxVelocity.set(200);
  player.body.collideWorldBounds = true;

  // bullet objects
  bullets = game.add.group();
  bullets.enableBody = true;
  bullets.physicsBodyType = Phaser.Physics.ARCADE;
  bullets.createMultiple(50, 'bulletSprite');
  bullets.setAll('checkWorldBounds', true);
  bullets.setAll('outOfBoundsKill', true);

  // add a enemy
  aliens = game.add.group();
  aliens.enableBody = true;
  aliens.physicsBodyType = Phaser.Physics.ARCADE;
  aliens.createMultiple(50, 'enemy');
  aliens.setAll('checkWorldBounds', true);
  aliens.setAll('outOfBoundsKill', true);

  // add eventlisteners to keys
  upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
  downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
  leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
  rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
  fireKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
}

function update() {

  // check collisions --> if aliens and player collides --> call die()
  game.physics.arcade.overlap(player, aliens, die);

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
      player.body.angularVelocity = -300;
    }
    else if (rightKey.isDown) {
      // rotate right
      player.body.angularVelocity = 300;
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

function render() {
  // display score
  game.debug.text('Kills: '+aliensKilled, 10, 20);
}

function die() {
  player.kill();
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
  alien.reset(alienX, alienY);
  alien.anchor.setTo(0.5, 0.5);
  alien.scale.setTo(2, 2);
  alien.animations.add('move', [0,1,2,3], 20, true);
  alien.animations.play('move');
  aliens.add(alien);

  if (alienRate >= 800) {
    alienRate -= 200;
  }
}

function bulletAlienCollision(a,b) {
  // handle collision beween aliens and bullets
  a.kill();
  b.kill();
  aliensKilled++;
  game.sound.play('alienDeathSFX');
}
