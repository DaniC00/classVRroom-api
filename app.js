
const express = require('express')
const cors = require("cors");
const app = express()
const port = process.env.PORT || 5000
const { MongoClient } = require("mongodb");

require('dotenv').config()

app.use(cors());

var mongo = require('mongodb').MongoClient;
var url = process.env.DATABASE_URL;

app.get('/', (req, res) => {
  res.send('Endpoint principal!')
})

app.get('/api/login', (req, res) => {
    
    const username = req.query.username;
    const password = req.query.password;

    var query = { "username" : username };

    //conexion con mongo y buscamos el usuario
    mongo.connect(url, function(err, mongoClient) {
      if (err) throw err;
      var db = mongoClient.db("TestDB");
      db.collection('TestCollection').find(query).toArray(function( err, docs ) {
        if( err ) {
          mongoClient.close();
          res.json({status: "NOK" , token: ""});
        }

        //si enecuentra algun usuario cerramos conexion y comprobamos la contraseña
        if(docs[0] != undefined) {
          console.log("testing in method", docs[0]);

          //si la password coincide generamos el token y devolvemos el OK y el token
          if(docs[0].password == password){

            //generar token basado en https://stackoverflow.com/questions/8532406/create-a-random-token-in-javascript-based-on-user-details
            var rand = function() {
              return Math.random().toString(36).substr(2);
            };
            
            var token = function() {
                return rand() + rand();
            };
          
            newToken = token()
            //la fecha de expiracion es la hora actual en unix + 30 minutos en milisegundos
            newExpirationTime = new Date().getTime() + (process.env.TOKEN_EXPIRATION_TIME * 30)

            //nuevos valores con $set para solo actualizar el token y el token-expiration
            var newvalues = { $set: {"token": newToken, "token-expiration": newExpirationTime} };

            //update de los valores
            db.collection("TestCollection").updateOne(query, newvalues, function(err, res) {
              if (err) throw err;
              console.log("1 document updated");
              mongoClient.close();
            });

            res.json({status: "OK", token: newToken});
          } else {
            res.json({status: "NOK",token: ""});
          }  
          
        } else {
          mongoClient.close();
          res.json({status: "NOK", token: ""})
        }

      });
    });
});

app.get('/api/logout', (req, res) => {

  const usertoken = req.query.token;
  var query = { "token" : usertoken };

  if(usertoken==null){
    res.json({status: "NOK", message: "u don't have a session."})
  }

  mongo.connect(url, function(err, mongoClient) {
    if (err) throw err;
    var db = mongoClient.db("TestDB");
    db.collection('TestCollection').find(query).toArray(function( err, docs ) {
      if( err ) {
        mongoClient.close();
        res.json({status: "NOK" ,  message: "something failed"});
      }

      if(docs[0] != undefined) {
        if (docs[0].token === usertoken){
          res.json({status: "OK", message: "session succesfully closed"})
        }
      } else {
        res.json({status: "NOK", message: "u don't have a session."})
      }

    });
  });
});


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});


/*
*
* FUNCIONES
*
*/

