Meteor.publish('highscores', function() {
  return Highscores.find();
});

Meteor.methods({
  addScore: function(username, score, key) {
    // adds a new entry in the highscores-collection

    //check if the user sent a valid request
    if (!Keys.findOne({key: key})) {
      console.log("Invalid accessKey given");
      return; //exit if someone is abusing the system
    }

    Highscores.insert({
      createdAt: new Date(),
      username: username,
      score: score
    });
  },
  addKey: function(key) {
    Keys.insert({ key: key });
  },
  removeKey: function(key) {
    Keys.remove({ key: key });
  }
});
