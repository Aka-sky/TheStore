var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var multer = require("multer");
var upload = multer();
var session = require("express-session");
var ejs = require("ejs");
var path = require("path");
const { Pool, Client } = require("pg");

//Session
app.use(
  session({
    secret: "bugatti chiron oneplus",
    saveUninitialized: true,
    resave: true
  })
);

app.set("view engine", "ejs");
app.set("views", "./public/views");

//for parsing application json
app.use(bodyParser.json());

//for parsing application/xwww-
app.use(bodyParser.urlencoded({ extended: true }));
//form-urlencoded

//for parsing multipart/form-data
app.use(upload.array());
app.use(express.static("public"));

// displaying the start page index.ejs
app.get("/", function(req, res) {
  var sess = req.session;
  if (sess.username) {
    res.redirect("/homepage");
  } else {
    res.render("index");
  }
});

// displaying login page
app.get("/login", function(req, res) {
  res.render("login");
});

// handling submit on login page
app.post("/login", function(req, res) {
  var sess = req.session;
  var user = req.body;

  // database details
  const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "user",
    password: "123456",
    port: 5432
  });

  // query definition
  const query = {
    text: 'SELECT password FROM "user" WHERE username = $1 ',
    values: [user.username],
    rowMode: "array"
  };

  // making the query
  pool.query(query, function(err, resp) {
    if (err) {
      res.render("login", {
        msg: "Invalid username and password"
      });
    } else {
      if (user.password == resp.rows[0]) {
        sess.username = user.username;
        res.redirect("/homepage");
      } else {
        res.render("login", {
          msg: "Invalid re-enter"
        });
      }
    }
    pool.end();
  });
});

// showing registration page
app.get("/signup", function(req, res) {
  res.render("signup");
});

// handling submit on signup Page
app.post("/signup", function(req, res) {
  var user = req.body;
  const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "user",
    password: "123456",
    port: 5432
  });

  const query = {
    text: 'INSERT INTO "user" VALUES ($1,$2,$3,$4,$5)',
    values: [user.username, user.name, user.email, user.password, user.contact]
  };

  pool.query(query, function(err) {
    if (err) {
      console.log(err);
      res.render("signup", {
        msg: "Username not available. Try another username."
      });
    } else {
      res.redirect("/login");
    }
    pool.end();
  });
});

// display homepage
app.get("/homepage", function(req, res) {
  var sess = req.session;
  if (sess.username) {
    // someone is logged in and thus can access this page
    const pool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "user",
      password: "123456",
      port: 5432
    });

    const query = {
      text: 'SELECT name,price,description,image,product_id FROM "product"',
      rowMode: "array"
    };

    pool.query(query, function(err, resp) {
      var product = resp.rows;
      if (err) {
        res.send("Error");
      } else {
        res.render("homepage", {
          product: product,
          username: sess.username
        });
      }

      pool.end();
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/product", function(req, res) {
  var sess = req.session;
  if (sess.username) {
    // try to get the id from url body and then get the product from database and display.
  } else {
    res.redirect("/login");
  }
});

app.listen(3000);
