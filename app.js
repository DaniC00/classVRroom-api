const express = require('express')
const cors = require("cors");
const app = express()
const PORT = process.env.PORT || 5000

app.use(cors());

app.get('/', (req, res) => {
  res.send('Endpoint principal!')
})

app.get('/login', (req, res) => {
    
    const username = req.query.username;
    const password = req.query.password;

    if(username == 'danicala' && password == 'pass123'){
      res.send({
        'status': 'OK',
        'token': 'token123',
        'details': 'Login completed succsesfully!'
      });
    } else {
      res.send({
        'status': 'NOK',
        'token': '',
        'details': 'Incorrect user or password!'
      });
    }

  })

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})