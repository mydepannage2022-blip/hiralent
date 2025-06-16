const express = require('express');
require('dotenv').config()
const app = express();





// routes 
app.get('/' , (req , res)=>{
  res.send("backend running succesfully")
})


module.exports = app;