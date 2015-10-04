# goa-space-survival
A simple game built to learn how to integrate Phaser into Meteor-projects.

# >>> [Play here!](http://gspace.meteor.com) <<<

![Gameplay](http://i.imgur.com/iEE9toO.png)

## A simple way to use Phaser with Meteor:
*(Meteor version 1.2 and newer)*

1. Insert `script`-tag in `game.html`

  ```html
  <head>
    <script src="LINK_TO_LATEST_VERSION_OF_PHASER.min.js"></script>
  </head>
  ```

2. In main `client.js`-file, add a template helper

  ```javascript
  Template.body.helpers({
    'initGame': function() {
      // helper that initiates Phaser
      game = new Phaser.Game(
        800, 600, Phaser.AUTO, '',
        { preload: preload, create: create, update: update, render: render }
      );
    }
  });
  ```

3. In `game.html`, add a call to the template helper `initGame`, that will initiate Phaser.

  ```html
  <body>
    {{initGame}}
  </body>
  ```

4. Use Phaser like you normally would!

---

### DISCLAIMER

I do not own any of the game assets and will only use them

1. in non-commercial software
2. for my own learning.
