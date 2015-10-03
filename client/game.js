
var fireRate = 300; // cooldown between gun firing
var nextFireTime = 0; // time left until next bullet can be fired
var alienRate = 3000; // cooldown for spawning aliens
var nextAlienTime = 0;  // time left until next alien can be spawned
var aliensKilled = 0;
var music;
var shootSFX;
var alienDeathSFX;
var playerExplosionSFX;
var pickUpItemSFX;
var playerAmmo = 50;
var playerRotationFix = Math.PI / 2;  // hack that fixes the default rotation of player-sprite

Template.game.helpers({
  'game': function() {
    game = new Phaser.Game(
      800, 600, Phaser.CANVAS, '',
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
  game.load.audio('playerExplosionSFX', 'http://examples.phaser.io/assets/audio/SoundEffects/explosion.mp3');
  game.load.audio('pickUpItemSFX', 'http://examples.phaser.io/assets/audio/SoundEffects/key.wav');
  game.load.audio('tommyInGoa', 'http://examples.phaser.io/assets/audio/tommy_in_goa.mp3');

// TODO: git commit -m " "

/* -------------------- FUTURE TODOS ---------------------
    * Score bonus calculated by aliensKilled * (shotsHit / shotsFired)
    * add functionality to save highscores using meteor
      * username string entered from
      * only possible to submit highscores if user is logged in
      * add template that display highscores
      * Implement using meteor methods to make it more secure
    * More types of ship
      * smaller ship that always move towards the player
        * check tanks example game for how turrets of enemy tanks always face the player
    * maybe enemy ships sometimes drop bombs
*/

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
  // set game world bounds
  game.world.setBounds(0, 0, 1000, 1000);

  // start physics
  game.physics.startSystem(Phaser.Physics.ARCADE);

  // add background
  game.add.tileSprite(0, 0, 1000, 1000, 'background');

  // add music
  music = game.add.audio('tommyInGoa');
  music.volume = 1;
  music.onStop.add(function() {
    music.restart();
  });
  music.play();

  // add sound effects
  shootSFX = game.add.audio('shootSFX');
  shootSFX.volume = 0.1;

  alienDeathSFX = game.add.audio('alienDeathSFX');
  alienDeathSFX.volume = 0.4;

  pickUpItemSFX = game.add.audio('pickUpItemSFX');
  pickUpItemSFX.colume = 0.1;

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
  ammoClips.createMultiple(30, 'bulletSprite');

  // adding the player object
  player = game.add.sprite(game.world.centerX, game.world.centerY, 'ship');
  player.anchor.set(0.5);
  player.scale.set(1.5);
  player.smoothed = true;
  player.animations.add('fly', [0,1,2,3,4,5], 10, true);
  player.play('fly');

  // enable physics for ship
  game.physics.arcade.enable(player);
  player.body.drag.set(200);
  player.body.width *= 3/4;
  player.body.height *= 3/4;
  player.body.maxVelocity.set(180);
  player.body.collideWorldBounds = true;

  // add the enemies-group
  aliens = game.add.group();
  aliens.enableBody = true;
  aliens.physicsBodyType = Phaser.Physics.ARCADE;
  aliens.createMultiple(50, 'enemy');
  aliens.setAll('body.collideWorldBounds', true);
  aliens.setAll('checkWorldBounds', true);
  aliens.setAll('body.outOfBoundsKill', true);

  // add gameState-text
  stateText = game.add.text(game.camera.width / 2, (game.camera.height / 2) - 50,' ', {
    font: '84px Arial', fill: '#fff'
  });
  //stateText.cameraOffset.setTo(textCenterX, textCenterY - 50);
  stateText.anchor.set(0.5);
  stateText.fixedToCamera = true;
  stateText.visible = false;

  // text used to display how to start a new round
  startText = game.add.text(game.camera.width / 2, (game.camera.height / 2) + 50, ' ', {
    font: '40px Arial', fill: '#fff'
  });
  //startText.cameraOffset.setTo(textCenterX, textCenterY + 50);
  startText.anchor.set(0.5);
  startText.fixedToCamera = true;
  startText.visible = false;

  // add eventlisteners to keys
  upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
  wKey = game.input.keyboard.addKey(Phaser.Keyboard.W);
  leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
  aKey = game.input.keyboard.addKey(Phaser.Keyboard.A);
  rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
  dKey = game.input.keyboard.addKey(Phaser.Keyboard.D);
  fireKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

  // make camera follow player
  game.camera.follow(player);
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
}

function render() {
  // display score & ammo
  if (player.alive) {
    game.debug.text('Kills: '+aliensKilled, 10, 20);
    game.debug.text('Ammo: '+playerAmmo, 660, 20);
  }

  /* display hitboxes
     bullets.forEachAlive(renderGroup, this);
     aliens.forEachAlive(renderGroup, this);
     ammoClips.forEachAlive(renderGroup, this);
     game.debug.body(player);
  //*/
}

function die(player, alien) {
  // hide ship to allow the game to play death-animation before entering next game state
  player.visible = false;
  alien.visible = false;

  // play explosion sound
  game.sound.play('playerExplosionSFX');

  // create explosion animation on the player's last position
  var explosion = game.add.sprite(player.body.x, player.body.y, 'explode');
  explosion.anchor.setTo(0.5, 0.5);
  explosion.animations.add('explode');
  explosion.events.onAnimationComplete.add(function() {
    player.kill();
    alien.kill();
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
  var alienX = game.world.randomX;
  var alienY = game.world.randomY;

  // check that the alienX and alienY isnt too close to player
  while (game.math.difference(alienX, player.x) <= 80) {
    // if they are too close, remake them
    alienX = game.world.randomX;
  }

  while (game.math.difference(alienY, player.y) <= 80) {
    alienY = game.world.randomY;
  }

  var direction = game.rnd.integerInRange(0, 2 * Math.PI);
  var minSpeed = -125
  var maxSpeed = 125;
  var vx = game.rnd.integerInRange(minSpeed, maxSpeed);
  var vy = game.rnd.integerInRange(minSpeed, maxSpeed);
  var alien = aliens.getFirstDead();
  alien.reset(alienX, alienY);
  alien.body.setSize(25, 20);
  alien.body.bounce.setTo(1);
  alien.anchor.setTo(0.5, 0.8);
  alien.scale.setTo(2, 2);
  alien.animations.add('move', [0,1,2,3], 10, true);
  alien.animations.play('move');
  alien.body.velocity.set(vx, vy);
  game.physics.arcade.velocityFromRotation(direction, alien.body.velocity);
  aliens.add(alien);

  if (alienRate >= 800) {
    alienRate -= 100;
  }
}

function dropAmmo(x, y) {
  // generate an ammoClip-obj on a given position
  var ammoClip = ammoClips.getFirstDead();
  ammoClip.reset(x, y);
  ammoClip.anchor.set(0.5);
  ammoClips.add(ammoClip);
  timedLife(ammoClip, 10);
}

function timedLife(object, time) {
  game.time.events.add(Phaser.Timer.SECOND * time, function() {
    // timer that kills the object after a specified amount of seconds
    object.kill();
  }, this);
}

function renderGroup(member) {
  // render the body of a group-member
  game.debug.body(member);
}

function bulletAlienCollision(bullet, alien) {
  // handle collision beween aliens and bullets

  // 30% chance that the alien dropAmmo
  var outcome = Math.random();
  if (outcome >= 0.7) {
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
  pickUpItemSFX.play();
  playerAmmo += 10;
  ammoClip.kill();
}
