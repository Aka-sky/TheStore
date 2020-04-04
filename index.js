var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var multer = require("multer");
var upload = multer();
var session = require("express-session");
var ejs = require("ejs");
var path = require("path");
const {Pool,Client} = require("pg");
const cookieParser = require("cookie-parser");
var bcrypt = require('bcrypt');
const saltRounds = 10;

//Store cookies containing session id on client's browser
app.use(cookieParser());
//Session
app.use(
  session({
    secret: "oneplus 6",
    saveUninitialized: true,
    resave: true
  })
);

app.set("view engine", "ejs");
app.set("views", "./public/views");

//for parsing application json
app.use(bodyParser.json());

//for parsing application/xwww-
app.use(bodyParser.urlencoded({ extended: false }));
//form-urlencoded

//for parsing multipart/form-data
app.use(upload.array());
app.use(express.static("public"));

const db = new Pool ({
  user: "postgres",
  host: "localhost",
  database: "thevstore",
  password: "password",
  port: 5432
});

//function to check previous aborted session to continue
function sessionChecker(req,res,next){
  var sess = req.session;
  if (sess.username) {
    res.redirect("/homepage");
  } else {
    next();
  }
}
//------------------------------------------------------------------------------------------------
// displaying the start page index.ejs
app.get("/", sessionChecker, function(req, res) {
  res.render("index");
});

//------------------------------------------------------------------------------------------------
// showing registration page
app.get("/signup", sessionChecker, function(req, res) {
  res.render("signup");
});

// handling submit on signup Page
app.post("/signup", function(req, res) {
  var user = req.body;
  bcrypt.hash(user.password, saltRounds, function(err, hash) {
    var pass = hash;
    const query = {
      text: 'INSERT INTO "user"(username, Name, email_id, password, contact) VALUES ($1,$2,$3,$4,$5)',
      values: [user.username, user.name, user.email, pass, user.contact]
    };
  
    db.query(query, function(err) {
      if (err) {
        console.log(err);
        res.render("signup", {
          msg: "Username not available. Try another username."
        });
      } else {
        res.redirect("/login");
      }
      //pool.end();
    });
  });
});

//----------------------------------------------------------------------------------------------------
// displaying login page
app.get("/login",sessionChecker, function(req, res) {
  res.render("login");
});

app.get("/logout", function(req, res) {
  var sess = req.session;
  if (sess.username) {
    req.session.destroy();
  }
  res.redirect("/login");
});

// handling submit on login page
app.post("/login", function(req, res) {
  var sess = req.session;
  var user = req.body;

  // query definition
  const query = {
    text: 'SELECT password FROM "user" WHERE username = $1 ',
    values: [user.username],
    rowMode: "array"
  };

  // making the query
  db.query(query, function(err, resp) {
    if (err) {
      res.render("login", {
        msg: "Invalid username and password"
      });
    } 
    else {
      try{
        bcrypt.compare(user.password, resp.rows[0].toString(), function(erro, result) {
          if (result) {
            sess.username = user.username;
            res.redirect("/homepage");
          } 
          else {
            res.render("login", {
              msg: "Wrong password"
            });
          }
        });
      }
      catch(e){
        res.render("Login", {
          msg: "Invalid Username"
        });
      }
    }
    //pool.end();
  });
});

//-------------------------------------------------------------------------------------------------
// display homepage
app.get("/homepage", function(req, res) {
  var sess = req.session;
  if (sess.username) {
    // someone is logged in and thus can access this page

    const query = {
      text: 'SELECT name,price,description,image,product_id FROM "product"',
      rowMode: "array"
    };

    db.query(query, function(err, resp) {
      var product = resp.rows;
      if (err) {
        res.send("Error");
      } else {
        res.render("homepage", {
          product: product,
          username: sess.username
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

// to sort for a particular category of product
app.get("/homepage/:category", function(req, res) {
  var sess = req.session;
  var category = req.params.category;
  console.log(category);
  if (sess.username) {
    const query = {
      text:
        'SELECT name,price,description,image,product_id FROM "product" WHERE "product".product_id IN (SELECT product_id FROM ' +
        category +
        ");",
      rowMode: "array"
    };

    db.query(query, function(err, resp) {
      // console.log(resp);
      var product = resp.rows;
      if (err) {
        res.send("Error");
      } else {
        res.render("homepage", {
          product: product,
          username: sess.username
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/product/:id", function(req, res) {
  var sess = req.session;
  if (sess.username) {
    var product_id = req.params.id;
    const query = {
      text:
        'SELECT * FROM "product" INNER JOIN "user" ON ("product".product_id, "user".username) IN ( SELECT product.product_id, seller_id FROM product WHERE product.product_id = $1)',
      values: [product_id],
      rowMode: "array"
    };

    db.query(query, function(err, resp) {
      var details = resp.rows;
      if (err) {
        res.send("Error");
      } else {
        res.render("product", {
          details: details,
          user: sess.username
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

// add to cart clicked on homepage
app.get("/cart/:id", function(req, res) {
  var sess = req.session;
  var product_id = req.params.id;
  if (sess.username) {
    // somone is logged in thus can access

    const query = {
      text: 'INSERT INTO "cart" VALUES ($1,$2) ',
      values: [sess.username, product_id]
    };

    db.query(query, function(err, resp) {
        res.redirect("/cart");
    });
  } else {
    res.redirect("/login");
  }
});

// get the cart page
app.get("/cart", function(req, res) {
  var sess = req.session;
  if (sess.username) {
    const query = {
      text:
        'SELECT * FROM "product" INNER JOIN "user" ON("product".product_id, "user".username) IN ( SELECT product_id, seller_id FROM "product" WHERE "product".product_id IN( SELECT "cart".product_id FROM "cart" WHERE username = $1 ))',
      values: [sess.username],
      rowMode: "array"
    };

    db.query(query, function(err, resp) {
      var details = resp.rows;
      if (err) {
        res.send("Error");
      }
      else {
        res.render("cart", { details: details, user: sess.username });
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/cart/:action/:product", function(req, res) {
  var sess = req.session;
  var action = req.params.action;
  var product_id = req.params.product;
  if (sess.username) {
    // if action = 1 means buy from cart and 0 means remove from cart.

    if (action == 1) {
      // buy selected in cart on product_id
      // maybe send buy request to seller with buyer(i.e. user details) via email. And notify Buyer that request is sent.
      res.send("Request sent to seller!!");
    } else {
      // remove selected in cart on product_id
      const query = {
        text: 'DELETE FROM "cart" WHERE username = $1 AND product_id = $2',
        values: [sess.username, product_id]
      };

      db.query(query, function(err, resp) {
        if (err) {
          res.send("Error");
        } else {
          res.redirect("/cart");
        }
      });
    }
  } else {
    res.redirect("/login");
  }
});

app.listen(3000,function(){
  console.log("Running on port 3000");
});
