var express = require('express')
var router = require('public/router.js');
var app = express();

app.use('/', router)

app.listen(8080, function() {
})