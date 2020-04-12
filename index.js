var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var multer = require("multer");
//var upload = multer();
var session = require("express-session");
var ejs = require("ejs");
var path = require("path");
const cookieParser = require("cookie-parser");
var bcrypt = require("bcrypt");
const saltRounds = 10;
const { Pool } = require("pg");
var _ = require("lodash");

//Store cookies containing session id on client's browser
app.use(cookieParser());
//Session
app.use(
  session({
    secret: "oneplus 6",
    saveUninitialized: true,
    resave: true,
  })
);

//Set storage engine image uploads
const storage = multer.diskStorage({
  destination: "./public/images",
  filename: function (req, file, cb) {
    cb(null, file.fieldname + Date.now() + path.extname(file.originalname));
  },
});

//Init image upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
}).single("upImg");

//Check File type
function checkFileType(file, cb) {
  // allowed ext
  const fileTypes = /jpeg|jpg|png|gif/;
  //Check ext
  const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimeType = fileTypes.test(file.mimetype);

  if (mimeType && extName) {
    return cb(null, true);
  } else {
    cb("Error : Images only!!!!!!");
  }
}

app.set("view engine", "ejs");
app.set("views", "./public/views");

//for parsing application json
app.use(bodyParser.json());

//for parsing application/xwww-
app.use(bodyParser.urlencoded({ extended: false }));
//form-urlencoded

//for parsing multipart/form-data
//app.use(upload.array());
app.use(express.static("public"));

const db = new Pool({
  user: "postgres",
  host: "localhost",
  database: "thevstore",
  password: "password",
  port: 5432,
});

// function to check previous aborted session to continue
function sessionChecker(req, res, next) {
  var sess = req.session;
  if (sess.username) {
    res.redirect("/homepage");
  } else {
    next();
  }
}
//------------------------------------------------------------------------------------------------
// displaying the start page index.ejs
app.get("/", sessionChecker, function (req, res) {
  res.render("index");
});

//------------------------------------------------------------------------------------------------
// showing registration page
app.get("/signup", sessionChecker, function (req, res) {
  res.render("signup");
});

// handling submit on signup Page
app.post("/signup", function (req, res) {
  var user = req.body;
  bcrypt.hash(user.password, saltRounds, function (err, hash) {
    var pass = hash;
    const query = {
      text:
        'INSERT INTO "user"(username, Name, email_id, password, contact, location, branchYear) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      values: [
        user.username,
        user.name,
        user.email,
        pass,
        user.contact,
        user.location,
        user.branchYear,
      ],
    };

    db.query(query, function (err) {
      if (err) {
        console.log(err);
        res.render("signup", {
          msg: "Username not available. Try another username.",
        });
      } else {
        res.redirect("/login");
      }
    });
  });
});

//----------------------------------------------------------------------------------------------------
// displaying login page
app.get("/login", sessionChecker, function (req, res) {
  res.render("login");
});

app.get("/logout", function (req, res) {
  var sess = req.session;
  if (sess.username) {
    req.session.destroy();
  }
  res.redirect("/login");
});

// handling submit on login page
app.post("/login", function (req, res) {
  var sess = req.session;
  var user = req.body;

  // query definition
  const query = {
    text: 'SELECT password FROM "user" WHERE username = $1 ',
    values: [user.username],
    rowMode: "array",
  };

  // making the query
  db.query(query, function (err, resp) {
    if (err) {
      res.render("login", {
        msg: "Invalid username and password",
      });
    } else {
      try {
        bcrypt.compare(user.password, resp.rows[0].toString(), function (
          erro,
          result
        ) {
          if (result) {
            sess.username = user.username;
            res.redirect("/homepage");
          } else {
            res.render("login", {
              msg: "Wrong password",
            });
          }
        });
      } catch (e) {
        res.render("Login", {
          msg: "Invalid Username",
        });
      }
    }
  });
});

//-------------------------------------------------------------------------------------------------
// display homepage
app.get("/homepage", function (req, res) {
  var sess = req.session;
  if (sess.username) {
    // someone is logged in and thus can access this page

    const query = {
      text: 'SELECT name,price,description,image,product_id FROM "product"',
      rowMode: "array",
    };

    db.query(query, function (err, resp) {
      var product = resp.rows;
      if (err) {
        res.send("Error");
      } else {
        res.render("homepage", {
          product: product,
          username: sess.username,
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

// to sort for a particular category of product
app.get("/homepage/:category", function (req, res) {
  var sess = req.session;
  var category = req.params.category;
  var query;
  if (sess.username) {
    if (category == "electronics") {
      query = {
        text:
          'SELECT name,price,description,image,product_id FROM "product" WHERE "product".product_id IN (SELECT product_id FROM "pc" UNION SELECT product_id FROM "calculator")',
        rowMode: "array",
      };
    } else {
      query = {
        text:
          'SELECT name,price,description,image,product_id FROM "product" WHERE "product".product_id IN (SELECT product_id FROM ' +
          category +
          ");",
        rowMode: "array",
      };
    }
    var searchmsg = "";
    switch(category){
      case "book":
        searchmsg = "Search Book by Name, Author, Subject...";
        break;
      case "notes":
        searchmsg = "Search Notes by Subject, Professor, year...";
        break;
      case "clothing":
        searchmsg = "Search by Name, Subject...";
        break;
      case "electronics":
        searchmsg = "Search by Name, Type, Brand...";
        break;
      case "other":
        searchmsg = "Search by Name";
        break;
    }
    db.query(query, function (err, resp) {
      var product = resp.rows;
      if (err) {
        res.send("Error");
      } else {
        res.render("search", {
          product: product,
          username: sess.username,
          category: category,
          heading: "Recommended products for you",
          searchmsg: searchmsg
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

//-------------------------------------------------------------------------------------------------------
//display product page
app.get("/product/:id", function (req, res) {
  var sess = req.session;
  if (sess.username) {
    var product_id = req.params.id;
    (async () => {
      const client = await db.connect();

      try {
        await client.query("BEGIN");
        const productUserQuery = {
          text:
            'SELECT * FROM "product" INNER JOIN "user" ON ("product".product_id, "user".username) IN ( SELECT product.product_id, seller_id FROM product WHERE product.product_id = $1)',
          values: [product_id],
          rowMode: "array",
        };
        const productResp = await client.query(productUserQuery);
        const details = productResp.rows;

        const commentQuery = {
          text:
            'SELECT username, content FROM "comments" WHERE "comments".product_id = $1',
          values: [product_id],
          rowMode: "array",
        };
        const commentResp = await client.query(commentQuery);
        const comments = commentResp.rows;
        res.render("product", {
          user: sess.username,
          details: details,
          comments: comments,
        });
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    })().catch((err) => console.log(err.stack));
  } else {
    res.redirect("/login");
  }
});

//comment post on product page
app.post("/product/:id", function (req, res) {
  var sess = req.session;
  var product_id = req.params.id;
  var comment = req.body.comment;

  if (sess.username) {
    const query = {
      text:
        'INSERT INTO "comments" (username, product_id, content) VALUES ($1,$2,$3)',
      values: [sess.username, product_id, comment],
    };

    db.query(query, function (err, resp) {
      if (err) {
        res.send("Error");
      } else {
        res.redirect("/product/" + product_id);
      }
    });
  } else {
    res.redirect("/login");
  }
});

//----------------------------------------------------------------------------------------------------
// add to cart clicked on homepage or product page
app.get("/cart/:id", function (req, res) {
  var sess = req.session;
  var product_id = req.params.id;
  if (sess.username) {
    // somone is logged in thus can access
    const query = {
      text: 'INSERT INTO "cart" VALUES ($1,$2) ',
      values: [sess.username, product_id],
    };

    db.query(query, function (err, resp) {
      res.redirect("/cart");
    });
  } else {
    res.redirect("/login");
  }
});

// get the cart page
app.get("/cart", function (req, res) {
  var sess = req.session;
  if (sess.username) {
    const query = {
      text:
        'SELECT * FROM "product" INNER JOIN "user" ON("product".product_id, "user".username) IN ( SELECT product_id, seller_id FROM "product" WHERE "product".product_id IN( SELECT "cart".product_id FROM "cart" WHERE username = $1 ))',
      values: [sess.username],
      rowMode: "array",
    };

    db.query(query, function (err, resp) {
      var details = resp.rows;
      if (err) {
        res.send("Error");
      } else {
        res.render("cart", { details: details, user: sess.username });
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/cart/:action/:product", function (req, res) {
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
        values: [sess.username, product_id],
      };

      db.query(query, function (err, resp) {
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

//----------------------------------------------------------------------------------------------------
//display profile of any user
app.get("/profile/:username", function (req, res) {
  var sess = req.session;
  var currentusername = req.params.username;
  if (sess.username) {
    // somone is logged in thus can access
    const query = {
      text: 'SELECT * FROM "user" WHERE username = $1',
      values: [currentusername],
      rowMode: "array",
    };
    db.query(query, function (err, resp) {
      var currentuser = resp.rows;
      if (err) {
        res.send("Error");
      } else {
        res.render("profile", {
          currentuser: currentuser,
          username: sess.username,
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

//Edit profile page of logged in user only
app.get("/editprofile", function(req, res){
  var sess = req.session;
  if (sess.username) {
    // somone is logged in thus can access
    const query = {
      text: 'SELECT * FROM "user" WHERE username = $1',
      values: [sess.username],
      rowMode: "array"
    };
    db.query(query, function(err, resp) {
      var currentuser = resp.rows;
      if (err) {
        res.send("Error");
      } else {
        res.render("editprofile", {
          currentuser: currentuser,
          username: sess.username
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

//Updating values in database
app.post("/editprofile", function(req, res){
  var sess = req.session;
  var details = req.body;
  if (sess.username) {
    // somone is logged in thus can access
    const query = {
      text: 'UPDATE "user" SET name = $1, email_id = $2, contact = $3, location = $4, year = $5 WHERE username = $6',
      values: [details.name, details.email, details.contact, details.location, details.year, sess.username]
    };
    db.query(query, function(err, resp) {
      if (err) {
        res.send("Error");
        console.log(err);
      } else {
        res.redirect("/profile/"+sess.username);
      }
    });
  } else {
    res.redirect("/login");
  }
});

//---------------------------------------------------------------------------------------------------------------
//search
/*
app.post("/homepage", function (req, res) {
  var sess = req.session;
  var lowerproductname = _.toLower([(string = req.body.productname)]);
  //console.log(lowerproductname);
  if (sess.username) {
    // somone is logged in thus can access
    const query = {
      text:
        'SELECT name,price,description,image,product_id FROM "product" WHERE LOWER(name) LIKE \'%' +
        lowerproductname + '%\'',
      //values: [lowerproductname],
      rowMode: "array",
    };

    db.query(query, function (err, resp) {
      if (err) {
        res.send("Error");
        console.log(err);
      } else {
        var product = resp.rows;
        res.render("homepage", {
          product: product,
          username: sess.username,
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});
*/
//---------------------------------------------------------------------------------------------
app.get("/sellproduct", function (req, res) {
  var sess = req.session;
  if (sess.username) {
    res.render("sellproduct", {
      user: sess.username,
    });
  } else {
    res.redirect("/login");
  }
});

app.post("/productUpload", function (req, res) {
  var sess = req.session;
  upload(req, res, function (err) {
    var product = req.body;
    if (err) {
      res.render("sellproduct", {
        msg: err,
        user: sess.username,
      });
    } else {
      if (req.file == undefined) {
        res.render("sellproduct", {
          msg: "No file selected",
          user: sess.username,
        });
      } else {
        const imgPath = `../images/${req.file.filename}`;
        (async () => {
          const client = await db.connect();

          try {
            await client.query("BEGIN");
            const productTableInsertQuery = {
              text:
                "INSERT INTO product (name,years_of_usage,price,image,description,seller_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING product_id",
              values: [
                product.name,
                product.years,
                product.price,
                imgPath,
                "Default description. Will be added later",
                sess.username,
              ]
            };
            const productResp = await client.query(productTableInsertQuery);
            var product_id = productResp.rows[0].product_id;
            console.log(product_id)
            var category = product.categoryOptions;
            var query;

            switch (category) {
              case "books":
                query = {
                  text: 'INSERT INTO "book" VALUES ($1,$2,$3,$4)',
                  values: [
                    product_id,
                    product.publication,
                    product.edition,
                    product.subject,
                  ],
                };
                break;
              case "clothing":
                query = {
                  text: 'INSERT INTO "clothing" VALUES ($1,$2,$3,$4,$5)',
                  values: [
                    product_id,
                    product.size,
                    product.type,
                    product.color,
                    "Great Condition",
                  ],
                };
                break;
              case "notes":
                query = {
                  text: 'INSERT INTO "notes" VALUES ($1,$2,$3,$4,$5)',
                  values: [
                    product_id,
                    product.n_subject,
                    product.topic,
                    product.professor,
                    product.year,
                  ],
                };
                break;
              case "other":
                query = {
                  text: 'INSERT INTO "other" VALUES ($1,$2,$3)',
                  values: [product_id, product.description, product.cate],
                };
                break;
              case "electronics":
                if (product.electronicsOptions == "calculators") {
                  query = {
                    text: 'INSERT INTO "calculator" VALUES ($1,$2,$3,$4)',
                    values: [
                      product_id,
                      product.calcibrand,
                      product.model,
                      product.features,
                    ],
                  };
                } else {
                  query = {
                    text: 'INSERT INTO "pc" VALUES ($1,$2,$3,$4,$5,$6)',
                    values: [
                      product_id,
                      product.os,
                      product.ram,
                      product.storage,
                      product.pcbrand,
                      product.processor,
                    ],
                  };
                }
                break;
            }

            await client.query(query);
            res.render("sellproduct", {
              msg: "Successfully added the product.",
              user: sess.username,
            });
            await client.query("COMMIT");
          } catch (err) {
            await client.query("ROLLBACK");
            //console.log(err);
            res.render("sellproduct", {
              msg: "Please fill out all fields!!",
              user: sess.username,
            });
          } finally {
            client.release();
          }
        })().catch((err) => console.log(err.stack));
      }
    }
  });
});

app.use(function(req,res){
  res.send(404);
})

app.listen(3000, function () {
  console.log("Running on port 3000");
});
