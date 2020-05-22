var express = require("express");
require("dotenv").config();
var app = express();
var bodyParser = require("body-parser");
var multer = require("multer");
var session = require("express-session");
var ejs = require("ejs");
var path = require("path");
const cookieParser = require("cookie-parser");
var crypto = require("crypto");
var nodemailer = require("nodemailer");
var bcrypt = require("bcrypt");
const saltRounds = 10;
var fs = require("fs");
var pdf = require("html-pdf");
const { Pool } = require("pg");
var _ = require("lodash");
var db = require('./database');
var upload = require('./imgupload');

//Store cookies containing session id on client's browser
app.use(cookieParser());

//Session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: true,
    resave: true,
  })
);

app.set("view engine", "ejs");
app.set("views", "./public/views");

//for parsing application json
app.use(bodyParser.json());

//for parsing application/xwww-
app.use(bodyParser.urlencoded({ extended: false }));

//for parsing multipart/form-data
app.use(express.static("public"));

//-----------------------------------------------------------------------------------------------
//Setting up routes

const verifyRoutes = require('./routes/verify');
app.use('/verify', verifyRoutes)

const signupRoutes = require('./routes/signup');
app.use('/signup', signupRoutes)

const loginRoutes = require('./routes/login');
app.use('/login', loginRoutes)

const homeRoutes = require('./routes/homepage');
app.use('/homepage', homeRoutes)

const productRoutes = require('./routes/product');
app.use('/product', productRoutes)

const editprofileRoutes = require('./routes/editprofile');
app.use('/editprofile', editprofileRoutes)

const sellRoutes = require('./routes/sellproduct');
app.use('/sellproduct', sellRoutes)

const cartRoutes = require('./routes/cart');
app.use('/cart', cartRoutes)

const editproductRoutes = require('./routes/editproduct');
app.use('/editproduct', editproductRoutes)

const requestRoutes = require('./routes/request');
app.use('/request', requestRoutes)

const soldRoutes = require('./routes/sold');
app.use('/sold', soldRoutes)

//------------------------------------------------------------------------------------------------

// displaying the start page index.ejs
app.get("/", function (req, res) {
  var sess = req.session;
  if (sess.username) {
    res.redirect("/homepage");
  } else {
    res.render("index");
  }
});

//-------------------------------------------------------------------------------------------------

// Log out
app.get("/logout", function (req, res) {
  var sess = req.session;
  if (sess.username) {
    req.session.destroy();
  }
  res.redirect("/login");
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

//-----------------------------------------------------------------------------------------------------------------------

//delete a specific product user added to sale
app.get("/deleteproduct/:productID", function (req, res) {
  var sess = req.session;
  if (sess.username) {
    (async () => {
      const client = await db.connect();

      try {
        await client.query("BEGIN");
        const sellerQuery = {
          text: 'SELECT seller_id FROM "product" WHERE product_id = $1',
          values: [req.params.productID],
        };
        const seller = await client.query(sellerQuery);
        if (seller.rows[0].seller_id == sess.username) {
          // username is owner of the product can delete the product
          // first take the image of product.
          const imgQuery = {
            text: 'SELECT product_image FROM "product" WHERE product_id = $1',
            values: [req.params.productID],
          };
          const image = await client.query(imgQuery);
          const deleteQuery = {
            text: 'DELETE FROM "product" WHERE product_id = $1',
            values: [req.params.productID],
          };
          await client.query(deleteQuery);
          var filePath = "./public" + image.rows[0].product_image.slice(2);
          fs.unlink(filePath, function (err) {
            if (err) {
              console.log(err);
            } else {
              console.log("Deleted product along with image!");
            }
          });
          res.redirect("/request/0");
        } else {
          res.redirect("/homepage");
        }

        await client.query("COMMIT");
      } catch (err) {
        console.log(err);
        res.send("Go back and Try again.");
        await client.query("ROLLBACK");
      } finally {
        client.release();
      }
    })().catch((err) => console.log(err.stack));
  } else {
    res.redirect("/login");
  }
});

//---------------------------------------------------------------------------------------------------------

//For sending receipt to both buyer and seller through mail
app.get("/receipt/:email1/:email2", function (req, res) {
  var sess = req.session;
  if (sess.username) {
    // var decipherKey1 = crypto.createDecipheriv("aes128",process.env.CRYPTO_KEY,process.env.CRYPTO_IV);
    // var email1 = decipherKey1.update(req.params.email1,'hex','utf8');
    // email1 += decipherKey1.final("utf8");

    // var decipherKey2 = crypto.createDecipheriv(
    //   "aes128",
    //   process.env.CRYPTO_KEY,
    //   process.env.CRYPTO_IV
    // );
    // var email2 = decipherKey2.update(req.params.email2,'hex','utf8');
    // email2 += decipherKey2.final('utf8');
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.STORE_EMAIL,
        pass: process.env.STORE_PASS,
      },
    });
    var mailOptions = {
      from: process.env.STORE_EMAIL,
      to: [req.params.email1, req.params.email2],
      subject: "Receipt.",
      text: "Please find attachment for the receipt.",
      attachments: [
        {
          filename: "receipt.pdf",
          path: __dirname + "/receipt.pdf",
          contentType: "application/pdf",
        },
      ],
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        res.redirect("/history/0");
      }
    });
  } else {
    res.redirect("/login");
  }
});

//-----------------------------------------------------------------------------------------------------

app.get("/history/:action", function (req, res) {
  var sess = req.session;
  if (sess.username) {
    var query, action;
    if (req.params.action == 0) {
      // sold products by sess.username
      query = {
        text:
          'SELECT buyer_id,product_name,finalized_price,product_image FROM "transaction" WHERE seller_id = $1',
        values: [sess.username],
      };
      action = "sold";
    } else {
      query = {
        text:
          'SELECT seller_id,product_name,finalized_price,product_image FROM "transaction" WHERE buyer_id = $1',
        values: [sess.username],
      };
      action = "bought";
    }

    db.query(query, function (err, resp) {
      if (err) {
        console.log(err);
        res.send("Error! Try Again.");
      } else {
        res.render("history", {
          username: sess.username,
          transaction: resp.rows,
          action: action,
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.use(function (req, res) {
  res.sendStatus(404);
});

app.listen(3000, function () {
  console.log("Running on port 3000");
});
