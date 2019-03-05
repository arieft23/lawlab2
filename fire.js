const firebase = require("firebase")

var config = {
    apiKey: "AIzaSyCbhp8lFCAj3C1dtVyDT8yiNnJSf8Y2emM",
    authDomain: "cobacobaarief.firebaseapp.com",
    databaseURL: "https://cobacobaarief.firebaseio.com",
    projectId: "cobacobaarief",
    storageBucket: "cobacobaarief.appspot.com",
    messagingSenderId: "76915622291"
  }

fire = firebase.initializeApp(config);

module.exports = fire