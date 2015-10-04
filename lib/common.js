Highscores = new Mongo.Collection("highscores");

Meteor.methods({
  addScore: function(username, score) {
    // adds a new entry in the highscores-collection
    Highscores.insert({
      createdAt: new Date(),
      username: username,
      score: score
    });
  }
});
