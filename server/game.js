Meteor.publish('highscores', function() {
  return Highscores.find();
});
