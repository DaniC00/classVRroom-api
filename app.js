const express = require('express')
const cors = require("cors");
const app = express()
const port = process.env.PORT || 5000

var mongo = require('mongodb').MongoClient;
var url = "mongodb+srv://mongoadmin:EAT7T6G8@clusterdanidb.ryioo.mongodb.net/test";
var mongoClient;

app.use(cors());

app.get('/', (req, res) => {
  res.send('Endpoint principal!')
})

app.get('/login', (req, res) => {
    
    const username = req.query.username;
    const password = req.query.password;

    var query = { "username" : username };

    var db = mongoClient.db("TestDB");
    db.collection('TestCollection').find(query).toArray(function( err, docs ) {
      if( err ) {
          mongoClient.close();
          res.json({correct: false , token: "error on validation"});
      }
      if(docs[0] != undefined) {
        console.log("testing in method", docs[0]);
        checkPassword(docs[0], password, res);
      } else {
        res.json({correct: false, token: "el usuario no esta."})
      }
    });

    // if(username == 'danicala' && password == 'pass123'){
    //   res.send({
    //     'status': 'OK',
    //     'token': 'token123',
    //     'details': 'Login completed succsesfully!'
    //   });
    // } else {
    //   res.send({
    //     'status': 'NOK',
    //     'token': '',
    //     'details': 'Incorrect user or password!'
    //   });
    // }

  })

  function checkPassword(data, pass, res){
    if(data.password == pass){
      res.json({
        correct: true,
        token: "sadj829n2198dy1892e1n2e9012",
      });
    } else {
      res.json({
        correct: false,
        token: "password incorrecta",
      });
    }    
}


mongo.connect(url, function( err, _client ) {
  if( err ) throw err;
  mongoClient = _client;
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});