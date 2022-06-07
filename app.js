const express = require('express')
const cors = require("cors");
const app = express()
const port = process.env.PORT || 5000
const { MongoClient } = require("mongodb");

const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(express.json())

require('dotenv').config()

app.use(cors({
  origin: '*'
}));

var mongo = require('mongodb').MongoClient;
var url = process.env.DATABASE_URL;



app.get('/', (req, res) => {
  res.send('Endpoint principal!')
})

/*
*   LOG IN
*/

app.get('/api/login', (req, res) => {
    
    const username = req.query.username;
    const password = req.query.password;

    var query = { "username" : username };

    //conexion con mongo y buscamos el usuario
    mongo.connect(url, function(err, mongoClient) {
      if (err) throw err;
      var db = mongoClient.db("TestDB");
      db.collection('Users').find(query).toArray(function( err, docs ) {
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
            //la fecha de expiracion es la hora actual en unix + 60 minutos en milisegundos
            newExpirationTime = new Date().getTime() + (process.env.TOKEN_EXPIRATION_TIME * 60)

            //nuevos valores con $set para solo actualizar el token y el token-expiration
            var newvalues = { $set: {"token": newToken, "tokenExpiration": newExpirationTime} };

            //update de los valores
            db.collection("Users").updateOne(query, newvalues, function(err, res) {
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

/*
*   LOG OUT
*/

app.get('/api/logout', (req, res) => {

  //recibe el token del usuario
  const usertoken = req.query.token;
  var query = { "token" : usertoken };

  //si el token esta vacio devolvemos nok
  if(usertoken==null){
    res.json({status: "NOK", message: "u don't have a session."})
  }

  mongo.connect(url, function(err, mongoClient) {
    if (err) throw err;
    var db = mongoClient.db("TestDB");
    db.collection('Users').findOne(query, function( err, docs ) {
      if( err ) {
        mongoClient.close();
        res.json({status: "NOK" ,  message: "something failed"});
      }

      //comprobamos que el token en bbdd es el mismo que el que introduce el usuario
      if(docs != undefined) {
        if (docs.token === usertoken){
          res.json({status: "OK", message: "session succesfully closed"})
        }
      } else {
        res.json({status: "NOK", message: "u don't have a session."})
      }

    });
  });
});

/*
*   GET COURSES
*/

app.get('/api/get_courses', (req, res) => {

  //recoge el token que nos da el usuario
  let session_token = req.query.session_token;

  if(session_token == ""){
    return res.json({status: "NOK", message: "u dont have a session token!"})
  }

  var query = {'token': session_token}; 

  console.log(query)

  mongo.connect(url, function(err, mongoClient) {
    if (err) throw err;
    var db = mongoClient.db("TestDB");
    
    console.log("mongo connection")
    db.collection('Users').findOne(query, function(err, userDoc) {
      console.log("mongo findOne")
      if( err ) {
        mongoClient.close();
        res.json({status: "NOK" ,  message: "something failed"});
      }

      console.log(userDoc)

      if(userDoc!="") { 
        console.log("is userDocNull")
        //comprueba que la fecha de expiracion del token sea menor que la fecha actual
        if(userDoc.tokenExpiration < new Date().getTime()){
          mongoClient.close();
          res.json({status: "NOK_EXPIRED", message: "Token Expired!"})
        } else {
          //como no ha expirado busca los cursos a los que el estudiante esta suscrito
          let queryCourses = {'subscribers.students': userDoc.userId}

          //devolvemos solo los campos basicos, el titulo la descripcion y el id de curso
          db.collection('Courses').find(queryCourses).project({"title": 1, "description":1, "courseId": 1}).toArray(function(err, docs) {
            if( err ) {
              mongoClient.close();
              res.json({status: "NOK" ,  message: "something failed"});
            }
      
            //si docs no esta vacio devolvemos los cursos
            if(docs) {
              console.log(docs)
              mongoClient.close();
              res.json(docs)
            } else {
              mongoClient.close();
              res.json({status: "NOK", message: "There are no courses."})
            }
          });
        }
      } else {
        console.log("estas llegando aqui??")
        mongoClient.close();
        res.json({status: "NOK", message: "Can't find your user."})
      }
    });
  });
});

/*
*   GET COURSE DETAILS
*/

app.get('/api/get_course_details', (req, res) => {

  //recoge el token que nos da el usuario
  let session_token = req.query.session_token;
  //TODO MOVER EL PARSE INT A LUEGO POR SI ACASO NO ENVIA UN INT
  let courseId = parseInt(req.query.courseId);

  

  if(session_token == ""){
    return res.json({status: "NOK", message: "u dont have a session token!"})
  }

  var query = {'token': session_token}; 


  mongo.connect(url, function(err, mongoClient) {
    if (err) throw err;
    var db = mongoClient.db("TestDB");
    
    db.collection('Users').findOne(query, function(err, userDoc) {
      if( err ) {
        mongoClient.close();
        res.json({status: "NOK" ,  message: "something failed"});
      }

      if(userDoc!=null) { 
        //comprueba que la fecha de expiracion del token sea menor que la fecha actual
        if(userDoc.tokenExpiration < new Date().getTime()){
          mongoClient.close();
          res.json({status: "NOK_EXPIRED", message: "Token Expired!"})
        }

        //como no ha expirado busca los detalles del curso del que enviamos la id y si el usuario esta suscrito a ese curso
        let queryCourses = {'subscribers.students': userDoc.userId, 'courseId': courseId}

        //devolvemos todos los campos del curso
        db.collection('Courses').findOne(queryCourses, function(err, docs) {
          if( err ) {
            mongoClient.close();
            res.json({status: "NOK" ,  message: "something failed"});
          }
    
          //si docs no esta vacio devolvemos los cursos
          if(docs != "") {
            mongoClient.close();
            res.json(docs)
          } else {
            mongoClient.close();
            res.json({status: "NOK", message: "There are no courses."})
          }
        });
      } else {
        mongoClient.close();
        res.json({status: "NOK", message: "Can't find your user."})
      }
    });
  });
});

/*
*   EXPORT DATA BASE
*/

app.get('/api/export_data_base', (req, res) => {
    
  const username = req.query.username;
  const password = req.query.password;

  var query = { "username" : username };

  //conexion con mongo y buscamos el usuario
  mongo.connect(url, function(err, mongoClient) {
    if (err) throw err;
    var db = mongoClient.db("TestDB");
    db.collection('Users').findOne(query, function( err, docs ) {
      if( err ) {
        mongoClient.close();
        res.json({status: "NOK" , message: "something failed - error on connection"});
      }

      //si enecuentra algun usuario comprobamos la contraseña
      if(docs != undefined) {
        console.log("testing in method", docs[0]);

        //si la password coincide devolvemos toda la base de datos de cursos
        if(docs.password == password){
        
          db.collection('Courses').find().toArray(function(err, docs) {
            if( err ) {
              mongoClient.close();
              res.json({status: "NOK" ,  message: "something failed - error on conection 2"});
            }

            mongoClient.close();
            res.json(docs)
          });

        } else {
          res.json({status: "NOK", message: "ERROR - INCORRECT CREDENTIALS"});
        }  
        
      } else {
        mongoClient.close();
        res.json({status: "NOK", message: "ERROR - INCORRECT CREDENTIALS"})
      }

    });
  });
});

/*
*   PIN REQUEST
*/

app.get('/api/pin_request', (req, res) => {

  let session_token = req.query.session_token;
  //TODO MOVER EL PARSE INT A LUEGO POR SI ACASO
  let vrTaskId = parseInt(req.query.vrTaskId);

  if(session_token == ""){
    return res.json({status: "NOK", message: "u dont have a session token!"})
  }

  var query = {'token': session_token}; 

  console.log(query)
  mongo.connect(url, function(err, mongoClient) {
    if (err) throw err;
    var db = mongoClient.db("TestDB");
    
    db.collection('Users').findOne(query, function(err, userDoc) {
      if( err ) {
        mongoClient.close();
        res.json({status: "NOK" ,  message: "something failed -  error on conection"});
      }

      if(userDoc!=null) { 
        //comprueba que la fecha de expiracion del token sea menor que la fecha actual
        if(userDoc.tokenExpiration < new Date().getTime()){
          mongoClient.close();
          res.json({status: "NOK_EXPIRED", message: "Token Expired!"})
        } else {
          //comprueba si el usuario esta suscrito en la tarea con el id qe he recibe
          vrTaskIdQuery = {"subscribers.students" : userDoc.userId, "vr_tasks.ID" : vrTaskId}
          console.log(vrTaskIdQuery)

          db.collection('Courses').findOne(vrTaskIdQuery, async function(err, vrDocs) {
            if( err ) {
              mongoClient.close();
              res.json({status: "NOK" ,  message: "something failed - error on conection 2"});
            }

            var exerciseId = -1;

            if(vrDocs != null) {
              for (var i in vrDocs.vr_tasks){
                  //console.log(vrDocs.vr_tasks[i]);
                  if(vrDocs.vr_tasks[i].ID === vrTaskId){
                    exerciseId = vrDocs.vr_tasks[i].VRexID;
                  }
              }

              //mientras el pin exista en base de datos crearemos uno nuevo
              var pinNumber
              let pinExists = true;

              while(pinExists == true){
                //genera numero aleatorio de 4 digitos
                pinNumber = Math.floor(1000 + Math.random() * 9000);
                pinExists = await checkIfPinExists(db, pinNumber);
              }

              let insertPinQuery = {"pin": pinNumber, "username": userDoc.username, "pin_taskID": vrTaskId, "pin_VRexID": exerciseId, "userId" : userDoc.userId};
              db.collection('Pins').insertOne(insertPinQuery);

              res.json({"status" : "OK", "pin": pinNumber});

            } else {
              mongoClient.close();
              res.json({status: "NOK", message: "ERROR - NO TASK WITH THAT ID"})
            }
          });
        }
      } else {
        console.log("el usuario esta vacio")
        mongoClient.close();
        res.json({status: "NOK", message: "Can't find your user."})
      }
    });
  });
});

/*
*   START VR EXERCISE
*/

app.get('/api/start_vr_exercise', (req, res) => {

  let pin = parseInt(req.query.pin);

  mongo.connect(url, function(err, mongoClient) {
    if (err) throw err;
    var db = mongoClient.db("TestDB");
    
    //busca el pin en la collection de pines
    let findPinsQuery = {"pin" : pin};

    db.collection('Pins').findOne(findPinsQuery, function(err, pinsDoc) {
      if( err ) {
        mongoClient.close();
        res.json({status: "NOK" ,  message: "something failed - error on conection 1"});
      }

      mongoClient.close();
      //devuelve ok y los datos si los encuentra, si no NOK y pin not found
      if(pinsDoc != null){
        res.json({"status" : "OK", "message" : "returning data", "username" : pinsDoc.username, "VRexerciceID" : pinsDoc.pin_VRexID})
      } else {
        res.json({"status" : "NOK", "message" : "ERROR - PIN NOT FOUND"})
      }

    });
  });
});


/*
*   FINISH VR EXERCISE
*/

app.post('/api/finish_vr_exercise', (req, res) => {
  
  //pin, failed_items, passed_items, grade, feedback

  var finishExerciseData = req.body;
  
  //comprueba si recibe los campos para hacer el insert
  if(!finishExerciseData.pin || !finishExerciseData.failed_items || !finishExerciseData.passed_items || !finishExerciseData.grade || !finishExerciseData.feedback ){
    res.json({"status" : "NOK_MISSING_DATA" , "message" : "ERROR - MISSING REQUIRED DATA"});
  } else {
    mongo.connect(url, function(err, mongoClient) {
      if (err) throw err;
  
      var db = mongoClient.db("TestDB");
      let findPinsQuery = {"pin" : parseInt(finishExerciseData.pin)};
  
      //busca si el pin realmente existe
      db.collection('Pins').findOne(findPinsQuery, function(err, pinsDoc) {
        if( err ) {
          mongoClient.close();
          res.json({"status": "NOK" ,  "message": "something failed - error on conection 1"});
        }
  

        if(pinsDoc){
          console.log("pinsDoc Truers")

          //la query para encontrar donde insertar el completion
          let vrTasksCompletionQuery = {"vr_tasks.ID" : pinsDoc.pin_taskID, "vr_tasks.VRexID" : pinsDoc.pin_VRexID}
  
          //los datos del insert
          let vrCompletionsToPush =  { "studentID" : pinsDoc.userId, 
          "autograde" : {"passed_items": finishExerciseData.passed_items, "failed_items": finishExerciseData.failed_items}, 
          "grade": finishExerciseData.grade, "feedback" : finishExerciseData.feedback, "position_data" : {"data" : "...to be decided..."}};
          
          try{
            //inserta los datos
            db.collection('Courses').updateOne(vrTasksCompletionQuery, {$push : {"vr_tasks.$.completions" : vrCompletionsToPush }})
  
            //devuelve ok si todo va bien
            res.json({"status" : "OK", "message" : "SUCCESS - DATA CORRECTLY INSERTED"});

          } catch {
            res.json({"status" : "NOK", "message" : "something failed"})
          }
        } else {
          mongoClient.close();
          res.json({"status" : "NOK", "message" : "ERROR - PIN NOT FOUND"})
        }
      });
    });

  } 
});


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});


/*
*
* FUNCIONES
*
*/

//check if pin already exists: 

async function checkIfPinExists(db, pinNumber){
 
  let userpinQuery = {"pin" : pinNumber};
  var variabledeestado = false;

  await db.collection('Pins').findOne(userpinQuery, function(err, pinDocs) {
    if(pinDocs == null){
      variabledeestado = false;
    } else {
      variabledeestado = true;
    }
  });

  return variabledeestado;
};

