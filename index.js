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

//crypto key and iv
// const key = crypto.randomBytes(16);
// const iv = crypto.randomBytes(16);

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

//for parsing multipart/form-data
app.use(express.static("public"));

const db = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
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
//Page to check if mail id is already in use
app.get("/verify", sessionChecker, function (req, res) {
  res.render("verify", { msg: "" });
});
//On entering email
app.post("/verify", function (req, res) {
  const mail_id = req.body.email;
  (async () => {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      // first try to get the email address of user
      const queryEmail = {
        text: 'SELECT email_id FROM "user" WHERE email_id = $1',
        values: [mail_id],
      };
      const emailResp = await client.query(queryEmail);
      const email = emailResp.rows[0];
      if (email) {
        res.render("verify", {
          msg: "Email ID is already in use",
        });
      } else {
        const queryDelete = {
          text: 'DELETE FROM "tempmail" WHERE email = $1',
          values: [mail_id],
        };
        await client.query(queryDelete);
        function generateotp() {
          var digits = "0123456789";
          let OTP = "";
          for (let i = 0; i < 6; i++) {
            OTP += digits[Math.floor(Math.random() * 10)];
          }
          return OTP;
        }
        var otp = generateotp();
        var transporter = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: process.env.STORE_EMAIL,
            pass: process.env.STORE_PASS,
          },
        });
        var mailOptions = {
          from: process.env.STORE_EMAIL,
          to: mail_id,
          subject: "Verfication of email on VStore",
          html:
            "<h4>Hello!</h4><p>Just one step away from email verfication!<br>Copy this OTP: " +
            otp +
            "<br>& click verify</p>",
        };
        //  var sent = false;
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            // some error
            console.log(error);
            throw new Error("Email not sent");
          } else {
            console.log("Sent Mail!");
          }
        });
        const queryStorage = {
          text: 'INSERT INTO "tempmail" VALUES(' + "$1," + "$2" + ")",
          values: [mail_id, otp],
        };
        await client.query(queryStorage);
        await client.query("COMMIT", function (error, response) {
          if (error) {
            console.log(error);
            res.render("verify", {
              msg: "Something went wrong! Try again",
            });
          } else {
            res.redirect("verify/" + mail_id);
          }
        });
      }
    } catch (err) {
      console.log(err);
      res.render("verify", {
        msg: "Verification email not sent! Try again",
      });
    } finally {
      client.release();
    }
  })().catch((err) => console.log(err.stack));
});
//--------------------------------------------------------------------------------------------------------

//Page for Entering OTP
app.get("/verify/:mail_id", function (req, res) {
  var mail_id = req.params.mail_id;
  res.render("verifyotp", {
    text:
      "Welcome, " +
      mail_id +
      " check the mail we just sent to you & enter the OTP below",
    msg: "",
  });
});
//After entering OTP
app.post("/verify/:mail_id", function (req, res) {
  const mail_id = req.params.mail_id;
  const otpbyuser = req.body.OTP;
  (async () => {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      // first try to get the email address of user
      const queryOtp = {
        text: 'SELECT otp FROM "tempmail" WHERE email = $1',
        values: [mail_id],
      };
      const otpResp = await client.query(queryOtp);
      const OTP = otpResp.rows[0].otp;
      if (otpbyuser == OTP) {
        req.session.otpVerify = "yes";
        const queryStorage = {
          text: 'DELETE FROM "tempmail" where email = $1',
          values: [mail_id],
        };
        await client.query(queryStorage);
        res.redirect("/signup/" + mail_id);
      } else {
        res.render("verifyotp", {
          text:
            "Welcome, " +
            mail_id +
            " check the mail we just sent to you & enter the OTP below",
          msg: "Wrong OTP!",
        });
      }
      await client.query("COMMIT");
    } catch (err) {
      console.log(err);
      res.render("verify/" + mail_id, {
        msg: "Something went wrong! Try again",
      });
    } finally {
      client.release();
    }
  })().catch((err) => console.log(err.stack));
});
//----------------------------------------------------------------------------------------------------
// showing registration page
app.get("/signup/:mail_id", sessionChecker, function (req, res) {
  var sess = req.session;
  if (sess.otpVerify) {
    res.render("signup", {
      mail_id: req.params.mail_id,
      msg: "",
      username: "",
      name: "",
      pas: "",
      contact: "",
      location: "",
      year: "",
    });
  } else {
    res.redirect("/verify");
  }
});

// handling submit on signup Page
app.post("/signup/:mail_id", function (req, res) {
  var user = req.body;
  console.log(req.body);
  var sess = req.session;
  bcrypt.hash(user.password, saltRounds, function (err, hash) {
    var pass = hash;
    const query = {
      text:
        'INSERT INTO "user" (username, name, email_id, password, contact, location, year) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      values: [
        user.username,
        user.name,
        req.params.mail_id,
        pass,
        user.contact,
        user.location,
        user.branchYear,
      ],
    };

    db.query(query, function (error) {
      if (error) {
        res.render("signup", {
          mail_id: req.params.mail_id,
          msg: "Username not available",
          username: user.username,
          name: user.name,
          pas: user.password,
          contact: user.contact,
          location: user.location,
          year: user.branchYear,
        });
      } else {
        delete req.session.otpVerify;
        sess.username = user.username;
        if (sess.redirectURL) {
          console.log(sess.redirectURL);
          res.redirect(sess.redirectURL);
        } else {
          res.redirect("/homepage");
        }
        // res.redirect("/login");
      }
    });
  });
});
//-------------------------------------------------------------------------------------------------------------
// displaying login page
app.get("/login", sessionChecker, function (req, res) {
  res.render("login", {
    msg: "",
    id: "",
    pas: "",
  });
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
        id: user.username,
        pas: user.password,
      });
    } else {
      try {
        bcrypt.compare(user.password, resp.rows[0][0].toString(), function (
          erro,
          result
        ) {
          if (result) {
            sess.username = user.username;
            if (sess.redirectURL) {
              //console.log(sess.redirectURL);
              res.redirect(sess.redirectURL);
            } else {
              res.redirect("/homepage");
            }
          } else {
            res.render("login", {
              msg: "Wrong password",
              id: user.username,
              pas: user.password,
            });
          }
        });
      } catch (e) {
        res.render("Login", {
          msg: "Invalid Username",
          id: user.username,
          pas: user.password,
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
      text:
        'SELECT "product".product_name,"product".price,"product".years_of_usage,"product".product_image,"product".category,"product".product_id,"product".seller_id, priority from "product" INNER JOIN "recommender" ON "product".product_id = "recommender".product_id AND "recommender".username = $1 ORDER BY "priority" DESC;',
      values: [sess.username],
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
          searchmsg: "Recommended products for you",
          searchvalue: "",
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

//search among all products from homepage
app.post("/homepage", function (req, res) {
  var sess = req.session;
  var lowerproductname = _.lowerCase([(string = req.body.productname)]);
  //console.log(lowerproductname);
  if (sess.username) {
    // somone is logged in thus can access
    const query = {
      text:
        'SELECT product_name,price,years_of_usage,product_image,product_id,category,seller_id FROM "product" WHERE LOWER(product_name) LIKE \'%' +
        lowerproductname +
        "%'",
      //values: [lowerproductname],
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
          searchmsg: "Search Results",
          searchvalue: req.body.productname,
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

//---------------------------------------------------------------------------------------------
// to sort for a particular category of product
app.get("/homepage/:category", function (req, res) {
  var sess = req.session;
  var category = req.params.category;
  var query;
  if (sess.username) {
    query = {
      text:
        'SELECT "product".product_name,"product".price,"product".years_of_usage,"product".product_image,"product".product_id,"product".seller_id, priority from "product" INNER JOIN "recommender" ON "product".product_id = "recommender".product_id AND "recommender".username = $1 WHERE "product".product_id IN (SELECT product_id FROM ' +
        category +
        ') ORDER BY "priority" DESC',
      values: [sess.username],
      rowMode: "array",
    };
    var searchmsg = "";
    switch (category) {
      case "book":
        searchmsg = "Search by Name, Author, Subject...";
        break;
      case "notes":
        searchmsg = "Search by Subject, Professor, Topic...";
        break;
      case "clothing":
        searchmsg = "Search by Name, Subject...";
        break;
      case "calculator":
        searchmsg = "Search by Name, Brand...";
        break;
      case "pc":
        searchmsg = "Search by Name, Brand...";
        break;
      case "other":
        searchmsg = "Search by Name, Type, Description...";
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
          category: _.capitalize([(string = category)]),
          heading: "Recommended products for you",
          searchmsg: searchmsg,
          searchvalue: null,
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

//Searching by category
app.post("/homepage/:category", function (req, res) {
  var sess = req.session;
  var category = req.params.category;
  var input = _.lowerCase([(string = req.body.productinput)]);

  var newstring = "";
  for (var i = 0; i < input.length; i++) {
    if (input[i] == " ") {
      newstring += "|";
    } else {
      newstring += input[i];
    }
  }
  console.log(newstring);

  if (sess.username) {
    // somone is logged in thus can access
    var searchmsg = "";
    switch (category) {
      case "book":
        var searchquery = {
          text:
            'select "product".product_name,"product".price,"product".years_of_usage,"product".product_image,"product".product_id,"product".seller_id from "product","book" where ("product".product_id = "book".product_id) and (to_tsvector("product_name" || ' +
            "' '" +
            ' || "author" || ' +
            "' '" +
            ' || "subject") @@ to_tsquery(' +
            "$1" +
            "))",
          values: [newstring],
        };
        searchmsg = "Search Book by Name, Author, Subject...";
        break;
      case "notes":
        var searchquery = {
          text:
            'select "product".product_name,"product".price,"product".years_of_usage,"product".product_image,"product".product_id,"product".seller_id from "product","notes" where ("product".product_id = "notes".product_id) and (to_tsvector("product_name" || ' +
            "' '" +
            ' ||"topic" || ' +
            "' '" +
            ' || "professor" || ' +
            "' '" +
            ' || "subject") @@ to_tsquery(' +
            "$1" +
            "))",
          values: [newstring],
        };
        searchmsg = "Search Notes by Subject, Professor, Topic...";
        break;
      case "clothing":
        var searchquery = {
          text:
            'select "product".product_name,"product".price,"product".years_of_usage,"product".product_image,"product".product_id,"product".seller_id from "product","clothing" where ("product".product_id = "clothing".product_id) and (to_tsvector("product_name" || ' +
            "' '" +
            ' || "type") @@ to_tsquery(' +
            "$1" +
            "))",
          values: [newstring],
        };
        searchmsg = "Search by Name, Subject...";
        break;
      case "calculator":
        var searchquery = {
          text:
            'select "product".product_name,"product".price,"product".years_of_usage,"product".product_image,"product".product_id,"product".seller_id from "product","calculator" where ("product".product_id = "calculator".product_id) and (to_tsvector("product_name" || ' +
            "' '" +
            ' || "brand") @@ to_tsquery(' +
            "$1" +
            "))",
          values: [newstring],
        };
        searchmsg = "Search by Name, Brand...";
        break;
      case "pc":
        var searchquery = {
          text:
            'select "product".product_name,"product".price,"product".years_of_usage,"product".product_image,"product".product_id,"product".seller_id from "product","pc" where ("product".product_id = "pc".product_id) and (to_tsvector("product_name" || ' +
            "' '" +
            ' || "brand") @@ to_tsquery(' +
            "$1" +
            "))",
          values: [newstring],
        };
        searchmsg = "Search by Name, Brand...";
        break;
      case "other":
        var searchquery = {
          text:
            'select "product".product_name,"product".price,"product".years_of_usage,"product".product_image,"product".product_id,"product".seller_id from "product","other" where ("product".product_id = "other".product_id) and (to_tsvector("product_name" || ' +
            "' '" +
            ' || "type" || ' +
            "' '" +
            ' || "description") @@ to_tsquery(' +
            "$1" +
            "))",
          values: [newstring],
        };
        searchmsg = "Search by Name, Type, Description...";
        break;
    }
    db.query(searchquery, function (err, resp) {
      if (err) {
        res.send("Error");
        console.log(err);
      } else {
        var product = resp.rows;
        res.render("search", {
          product: product,
          category: _.capitalize([(string = category)]),
          username: sess.username,
          heading: "Search Results",
          searchmsg: searchmsg,
          searchvalue: input,
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

//-------------------------------------------------------------------------------------------------------
//display product details page
app.get("/product/:id", function (req, res) {
  var sess = req.session;
  if (sess.username) {
    var product_id = req.params.id;
    (async () => {
      const client = await db.connect();

      try {
        await client.query("BEGIN");
        const recommenderQuery = {
          text:
            'UPDATE "recommender" SET priority = priority + 1 WHERE username = $1 AND product_id = $2',
          values: [sess.username, product_id],
        };
        await client.query(recommenderQuery);
        const productCategoryQuery = {
          text: 'SELECT "category" FROM "product" WHERE product_id = $1',
          values: [product_id],
          rowMode: "array",
        };
        const CategoryResp = await client.query(productCategoryQuery);
        const category = CategoryResp.rows;

        switch (category[0][0]) {
          case "books":
            productUserQuery = {
              text: 'SELECT * FROM "bookview" WHERE product_id = $1',
              values: [product_id],
              rowMode: "array",
            };
            break;
          case "clothing":
            productUserQuery = {
              text: 'SELECT * FROM "clothview" WHERE product_id = $1',
              values: [product_id],
              rowMode: "array",
            };
            break;
          case "notes":
            productUserQuery = {
              text: 'SELECT * FROM "notesview" WHERE product_id = $1',
              values: [product_id],
              rowMode: "array",
            };
            break;
          case "other":
            productUserQuery = {
              text: 'SELECT * FROM "otherview" WHERE product_id = $1',
              values: [product_id],
              rowMode: "array",
            };
            break;
          case "calculators":
            productUserQuery = {
              text: 'SELECT * FROM "calcview" WHERE product_id = $1',
              values: [product_id],
              rowMode: "array",
            };
            break;
          case "pcs":
            productUserQuery = {
              text: 'SELECT * FROM "pcview" WHERE product_id = $1',
              values: [product_id],
              rowMode: "array",
            };
            break;
        }
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
          category: category,
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

//comment post on product details page
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
app.get("/editprofile", function (req, res) {
  var sess = req.session;
  if (sess.username) {
    // somone is logged in thus can access
    const query = {
      text: 'SELECT * FROM "user" WHERE username = $1',
      values: [sess.username],
      rowMode: "array",
    };
    db.query(query, function (err, resp) {
      var currentuser = resp.rows;
      if (err) {
        res.send("Error");
      } else {
        res.render("editprofile", {
          currentuser: currentuser,
          username: sess.username,
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

//Updating values in database
app.post("/editprofile", function (req, res) {
  var sess = req.session;
  if (sess.username) {
    // somone is logged in thus can access
    upload(req, res, function (err) {
      var details = req.body;
      if (err) {
        console.log("Error Try Again!");
        res.redirect("/editprofile");
      } else {
        var imgPath;
        var query;
        if (req.file == undefined) {
          query = {
            text:
              'UPDATE "user" SET name = $1, contact = $2, location = $3, year = $4 WHERE username = $5',
            values: [
              details.name,
              details.contact,
              details.location,
              details.year,
              sess.username,
            ],
          };
        } else {
          imgPath = `../images/${req.file.filename}`;
          query = {
            text:
              'UPDATE "user" SET name = $1, contact = $2, location = $3, year = $4,image = $5 WHERE username = $6',
            values: [
              details.name,
              details.contact,
              details.location,
              details.year,
              imgPath,
              sess.username,
            ],
          };
        }
        db.query(query, function (err, resp) {
          if (err) {
            res.send("Error");
            console.log(err);
          } else {
            res.redirect("/profile/" + sess.username);
          }
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

//---------------------------------------------------------------------------------------------------------------
//Display Add product for sale page
app.get("/sellproduct", function (req, res) {
  var sess = req.session;
  if (sess.username) {
    res.render("sellproduct", {
      user: sess.username,
      msg: "",
      pname: "",
      pyear: "",
      pcondition: "",
      price: "",
    });
  } else {
    res.redirect("/login");
  }
});

//Add product for sale
app.post("/productUpload", function (req, res) {
  var sess = req.session;
  upload(req, res, function (err) {
    var product = req.body;
    if (err) {
      res.render("sellproduct", {
        msg: err,
        user: sess.username,
        pname: product.name,
        pyear: product.years,
        pcondition: product.condition,
        price: product.price,
      });
    } else {
      (async () => {
        const client = await db.connect();
        var imgPath;
        try {
          if (req.file == undefined) {
            imgPath = "../images/sellicon.svg";
          } else {
            imgPath = `../images/${req.file.filename}`;
          }
          await client.query("BEGIN");
          const productTableInsertQuery = {
            text:
              "INSERT INTO product (product_name,years_of_usage,price,product_image,condition,seller_id,category) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING product_id",
            values: [
              product.name,
              product.years,
              product.price,
              imgPath,
              product.condition,
              sess.username,
              product.categoryOptions,
            ],
          };
          const productResp = await client.query(productTableInsertQuery);
          var product_id = productResp.rows[0].product_id;
          console.log(product_id);
          var category = product.categoryOptions;
          var query;

          switch (category) {
            case "books":
              query = {
                text: 'INSERT INTO "book" VALUES ($1,$2,$3,$4,$5)',
                values: [
                  product_id,
                  product.publication,
                  product.edition,
                  product.subject,
                  product.author,
                ],
              };
              break;
            case "clothing":
              query = {
                text: 'INSERT INTO "clothing" VALUES ($1,$2,$3,$4)',
                values: [product_id, product.size, product.type, product.color],
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
            case "calculators":
              query = {
                text: 'INSERT INTO "calculator" VALUES ($1,$2,$3,$4)',
                values: [
                  product_id,
                  product.calcibrand,
                  product.model,
                  product.features,
                ],
              };
              break;
            case "pcs":
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
              break;
          }

          await client.query(query);
          res.render("sellproduct", {
            msg: "Successfully added the product",
            user: sess.username,
            pname: "",
            pyear: "",
            pcondition: "",
            price: "",
          });
          await client.query("COMMIT");
        } catch (err) {
          var filePath = `./public/images/${req.file.filename}`;
          fs.unlink(filePath, function (err) {
            if (err) {
              console.log(err);
            } else {
              console.log("Deleted!");
            }
          });
          await client.query("ROLLBACK");
          //console.log(err);
          res.render("sellproduct", {
            msg: "Please fill out all fields!!",
            user: sess.username,
            pname: product.name,
            pyear: product.years,
            pcondition: product.condition,
            price: product.price,
          });
        } finally {
          client.release();
        }
      })().catch((err) => console.log(err.stack));
    }
  });
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

//From cart you can either buy or remove product
app.get("/cart/:action/:product", function (req, res) {
  var sess = req.session;
  var action = req.params.action;
  var product_id = req.params.product;
  if (sess.username) {
    // if action = 1 means buy from cart and 0 means remove from cart.

    if (action == 1) {
      // buy selected in cart on product_id
      // maybe send buy request to seller with buyer(i.e. user details) via email. And notify Buyer that request is sent.
      // first we need buyer details and then email id of seller
      (async () => {
        const client = await db.connect();

        try {
          await client.query("BEGIN");
          const buyerQuery = {
            text:
              'SELECT username, name, email_id, contact, location,year, image FROM "user" WHERE username = $1',
            values: [sess.username],
          };
          var buyerDetails = await client.query(buyerQuery);

          const emailQuery = {
            text:
              'SELECT username,email_id FROM "user" WHERE username IN ( SELECT seller_id FROM "product" WHERE product_id = $1)',
            values: [product_id],
          };
          var seller = await client.query(emailQuery);
          console.log(seller.rows[0].email_id);
          var transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.STORE_EMAIL,
              pass: process.env.STORE_PASS,
            },
          });

          var cipherKey = crypto.createCipheriv(
            "aes128",
            process.env.CRYPTO_KEY,
            process.env.CRYPTO_IV
          );
          var str = cipherKey.update(seller.rows[0].username, "utf8", "hex");
          str += cipherKey.final("hex");

          const data = await ejs.renderFile(
            __dirname + "/public/views/buyMail.ejs",
            {
              user: buyerDetails.rows[0],
              product_id: product_id,
              seller_id: str,
            }
          );

          var mailOptions = {
            from: process.env.STORE_EMAIL,
            to: seller.rows[0].email_id,
            subject: "Someone is interested in your product.",
            html: data,
          };

          transporter.sendMail(mailOptions, function (err, info) {
            if (err) {
              console.log(err);
            } else {
              sess.msg =
                "Request sent to seller! Once seller accepts the request you will receive a email and the product will appear here.";
              res.redirect("/request/1");
            }
          });
          await client.query("COMMIT");
        } catch (err) {
          console.log(err);
          res.send("error sending Email");
        } finally {
          client.release();
        }
      })().catch((err) => console.log(err.stack));
      // res.send("Request sent to seller!!");
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
//---------------------------------------------------------------------------------------------------------------

//Redirects to products for sale page for seller once he accepts request through mail
app.get("/request/:productID/:buyerID/:sellerID", function (req, res) {
  var sess = req.session;
  if (sess.username) {
    if (req.params.sellerID.length == 32) {
      var decipherKey = crypto.createDecipheriv(
        "aes128",
        process.env.CRYPTO_KEY,
        process.env.CRYPTO_IV
      );
      var username = decipherKey.update(req.params.sellerID, "hex", "utf8");
      username += decipherKey.final("utf8");
      if (username == sess.username) {
        // the seller is logged in
        (async () => {
          const client = await db.connect();

          try {
            await client.query("BEGIN");
            var otp = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
            const query = {
              text: 'INSERT INTO "requests" VALUES ($1,$2,$3,$4)',
              values: [
                req.params.buyerID,
                sess.username,
                req.params.productID,
                otp,
              ],
            };

            await client.query(query);
            //now send email with otp to buyer
            const buyerEmailquery = {
              text: 'SELECT email_id FROM "user" WHERE username = $1',
              values: [req.params.buyerID],
            };
            const buyerEmail = await client.query(buyerEmailquery);

            var transporter = nodemailer.createTransport({
              service: "gmail",
              auth: {
                user: process.env.STORE_EMAIL,
                pass: process.env.STORE_PASS,
              },
            });

            var mailOptions = {
              from: process.env.STORE_EMAIL,
              to: buyerEmail.rows[0].email_id,
              subject: "Request Accepted.",
              html: `<h2>${username} has accepted your request for purchase of product.</h2><p>On successful purchase of the product share this password <strong>${otp}</strong> with the seller to complete the process.
              You can view this password on your requests page.</p>`,
            };

            transporter.sendMail(mailOptions, function (err, info) {
              if (error) {
                console.log(error);
                throw error;
              }
            });
            res.redirect("/request/0");
            await client.query("COMMIT");
          } catch (err) {
            console.log(err);
            await client.query("ROLLBACK");
            res.send(
              "Maybe you already accepted this request. Check your requests page and try again!"
            );
          } finally {
            client.release();
          }
        })().catch((err) => console.log(err.stack));
      }
    } else {
      // somebody else logged in or url not correct
      res.redirect("/homepage");
    }
  } else {
    sess.redirectURL = `/request/${req.params.productID}/${req.params.buyerID}/${req.params.sellerID}`;
    res.redirect("/login");
  }
});
//---------------------------------------------------------------------------------------------------------------
//Ongoing deals for logged in user (displays either products for sale or requests by the user)
app.get("/request/:action", function (req, res) {
  // 0 show for sale, 1 show for buy
  var sess = req.session;
  if (sess.username) {
    (async () => {
      const client = await db.connect();

      try {
        await client.query("BEGIN");
        if (req.params.action == 0) {
          // for sale
          // first get all products and thier list of buyers from requests
          // then get all products details from product
          const buyerProductQuery = {
            text:
              'SELECT buyer_id,product_id FROM "requests" WHERE seller_id = $1 ORDER BY product_id ASC',
            values: [sess.username],
          };
          const buyerProduct = await client.query(buyerProductQuery);

          const productQuery = {
            text:
              'SELECT product_name,price,product_image,product_id, category FROM "product" WHERE seller_id = $1 ORDER BY product_id ASC',
            values: [sess.username],
          };
          const product = await client.query(productQuery);

          res.render("ongoing", {
            username: sess.username,
            rProduct: buyerProduct.rows,
            product: product.rows,
            action: "sale",
          });
        } else if (req.params.action == 1) {
          // for purchase
          // first select all products and seller_id whose buyer is sess.username
          // then select product details from product where product_id is from the above
          const sellerProductQuery = {
            text:
              'SELECT seller_id,product_id,otp FROM "requests" WHERE buyer_id = \'' +
              sess.username +
              "' ORDER BY product_id ASC",
          };
          const sellerProduct = await client.query(sellerProductQuery);

          const productQuery = {
            text:
              'SELECT product_name,price,product_image,product_id FROM "product" WHERE "product".product_id IN (SELECT product_id FROM "requests" WHERE buyer_id = \'' +
              sess.username +
              "' ) ORDER BY product_id ASC",
          };
          const product = await client.query(productQuery);
          if (sess.msg) {
            var msg = sess.msg;
            delete req.session.msg;
            res.render("ongoing", {
              username: sess.username,
              rProduct: sellerProduct.rows,
              product: product.rows,
              action: "purchase",
              msg: msg,
            });
          } else {
            res.render("ongoing", {
              username: sess.username,
              rProduct: sellerProduct.rows,
              product: product.rows,
              action: "purchase",
            });
          }
        }
      } catch (err) {
        console.log(err);
        res.send("ERROR!!");
      } finally {
        client.release();
      }
    })().catch((err) => console.log(err.stack));

    // query1: 'SELECT buyer_id,product_id FROM "requests" WHERE seller_id = 'someone1' ORDER BY product_id ASC'
    // query2: 'SELECT product_name,price,product_image,product_id FROM "product" WHERE "product".product_id IN (SELECT DISTINCT product_id FROM requests WHERE seller_id = 'someone1') ORDER BY product_id ASC;'
    // now render ongoing and show products accoring to second query and usernames of buyers until product_id matches
  } else {
    res.redirect("/login");
  }
});

//Edit product page of logged in user only
app.get("/editproduct/:category&:id", function (req, res) {
  var sess = req.session;
  var product_id = req.params.id;
  var category = req.params.category;
  if (sess.username) {
    //somone is logged in thus can access
    switch (category) {
      case "books":
        productQuery = {
          text: 'SELECT * FROM "bookview" WHERE product_id = $1',
          values: [product_id],
          rowMode: "array",
        };
        break;
      case "clothing":
        productQuery = {
          text: 'SELECT * FROM "clothview" WHERE product_id = $1',
          values: [product_id],
          rowMode: "array",
        };
        break;
      case "notes":
        productQuery = {
          text: 'SELECT * FROM "notesview" WHERE product_id = $1',
          values: [product_id],
          rowMode: "array",
        };
        break;
      case "other":
        productQuery = {
          text: 'SELECT * FROM "otherview" WHERE product_id = $1',
          values: [product_id],
          rowMode: "array",
        };
        break;
      case "calculators":
        productQuery = {
          text: 'SELECT * FROM "calcview" WHERE product_id = $1',
          values: [product_id],
          rowMode: "array",
        };
        break;
      case "pcs":
        productQuery = {
          text: 'SELECT * FROM "pcview" WHERE product_id = $1',
          values: [product_id],
          rowMode: "array",
        };
        break;
    }
    db.query(productQuery, function (err, resp) {
      var details = resp.rows;
      if (err) {
        res.send("Error");
      } else {
        res.render("editproduct", {
          username: sess.username,
          category: _.capitalize([(string = category)]),
          details: details,
          msg: "",
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

//Updating values in database
app.post("/editpro/:category&:id", function (req, res) {
  var sess = req.session;
  var prod_id = req.params.id;
  var category = req.params.category;
  console.log(prod_id);
  console.log(category);
  upload(req, res, function (err) {
    var product = req.body;
    // console.log(req.body);
    // console.log(req.file);
    if (err) {
      res.render("editproduct", {
        msg: err,
        username: sess.username,
        category: _.capitalize([(string = category)]),
        details: [[]],
      });
    } else {
      (async () => {
        const client = await db.connect();
        var imgPath;
        try {
          await client.query("BEGIN");
          if (req.file == undefined) {
            const imgQuery = {
              text: 'SELECT product_image FROM "product" WHERE product_id = $1',
              values: [req.params.id],
            };
            const response = await client.query(imgQuery);
            imgPath = response.rows[0].product_image;
          } else {
            imgPath = `../images/${req.file.filename}`;
          }

          const productTableUpdateQuery = {
            text:
              'UPDATE "product" SET product_name = $1,years_of_usage = $2,price = $3,product_image = $4,condition = $5,seller_id = $6 WHERE product_id = $7 RETURNING product_id',
            values: [
              product.name,
              product.years,
              product.price,
              imgPath,
              product.condition,
              sess.username,
              prod_id,
            ],
          };
          const productResp = await client.query(productTableUpdateQuery);
          var product_id = productResp.rows[0].product_id;
          console.log(product_id);
          var upquery;

          switch (category) {
            case "books":
              upquery = {
                text:
                  'UPDATE "book" SET author = $5,publication = $2,edition = $3,subject = $4 WHERE product_id = $1',
                values: [
                  product_id,
                  product.publication,
                  product.edition,
                  product.subject,
                  product.author,
                ],
              };
              break;
            case "clothing":
              upquery = {
                text:
                  'UPDATE "clothing" SET size = $2,type = $3,color = $4 WHERE product_id = $1',
                values: [product_id, product.size, product.type, product.color],
              };
              break;
            case "notes":
              upquery = {
                text:
                  'UPDATE "notes" SET subject = $2,topic = $3,professor = $4,noteyear = $5 WHERE product_id = $1',
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
              upquery = {
                text:
                  'UPDATE "other" SET description = $2,type = $3 WHERE product_id = $1',
                values: [product_id, product.description, product.cate],
              };
              break;
            case "calculators":
              upquery = {
                text:
                  'UPDATE "calculator" SET brand = $2,model = $3,features = $4 WHERE product_id = $1',
                values: [
                  product_id,
                  product.calcibrand,
                  product.model,
                  product.features,
                ],
              };
              break;
            case "pcs":
              upquery = {
                text:
                  'UPDATE "pc" SET os = $2,ram = $3,storage = $4,brand = $5,processor = $6 WHERE product_id = $1',
                values: [
                  product_id,
                  product.os,
                  product.ram,
                  product.storage,
                  product.pcbrand,
                  product.processor,
                ],
              };
              break;
          }

          await client.query(upquery);
          res.redirect("/product/" + prod_id);
          await client.query("COMMIT");
        } catch (err) {
          var filePath = `./public/images/${req.file.filename}`;
          fs.unlink(filePath, function (err) {
            if (err) {
              console.log(err);
            } else {
              console.log("Deleted!");
            }
          });
          await client.query("ROLLBACK");
          //console.log(err);
          res.render("editproduct", {
            msg: "Please fill out all fields!!",
            username: sess.username,
            category: _.capitalize([(string = category)]),
            details: [[]],
          });
        } finally {
          client.release();
        }
      })().catch((err) => console.log(err.stack));
    }
  });
});

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
// when seller selects sold on ongoing
app.get("/sold/:productID", function (req, res) {
  var sess = req.session;
  if (sess.username) {
    // select all buyers for productID and seller=sess.username
    const query = {
      text:
        'SELECT buyer_id FROM "requests" WHERE (seller_id,product_id) = ($1,$2)',
      values: [sess.username, req.params.productID],
    };
    db.query(query, function (err, resp) {
      if (err) {
        res.send("Error");
        console.log(err);
      } else {
        if (sess.msg) {
          var msg = sess.msg;
          delete req.session.msg;
          res.render("soldVerify", {
            username: sess.username,
            buyers: resp.rows,
            msg: msg,
          });
        } else {
          res.render("soldVerify", {
            username: sess.username,
            buyers: resp.rows,
            msg: "",
          });
        }
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.post("/sold/:productID", function (req, res) {
  var sess = req.session;
  if (sess.username) {
    // things to do
    // 1. verify entered otp from database
    // 2. From product_id get product_name and product_image
    // 3. Insert into transaction table seller_id from sess,
    //    buyer_id,finalizedPrice from form post, product_name
    //    product_image from product table
    // 4. Now remove the product from product table where product_id is
    //    req.params.product_id
    (async () => {
      const client = await db.connect();

      try {
        await client.query("BEGIN");
        // verify entered otp from database
        var content = req.body;
        const verifyQuery = {
          text:
            'SELECT otp FROM "requests" WHERE (buyer_id,seller_id) = ($1,$2)',
          values: [content.buyerOptions, sess.username],
        };
        const otp = await client.query(verifyQuery);

        if (otp.rows[0].otp == content.otp) {
          // correct now,
          // From product_id get product details
          const productQuery = {
            text:
              'SELECT product_name, product_image, years_of_usage, price,category, condition FROM "product" WHERE product_id = $1',
            values: [req.params.productID],
          };
          const product = await client.query(productQuery);

          const buyerSellerQuery = {
            text:
              'SELECT username, name, email_id, contact FROM "user" WHERE username IN ($1, $2)',
            values: [sess.username, content.buyerOptions],
          };

          const sellerBuyer = await client.query(buyerSellerQuery);

          // Insert into transaction table seller_id from sess,
          //    buyer_id,finalizedPrice from form post, product_name
          //    product_image from product table
          const insertTransQuery = {
            text:
              'INSERT INTO "transaction" (buyer_id,seller_id,product_name,finalized_price,product_image) VALUES ($1,$2,$3,$4,$5)',
            values: [
              content.buyerOptions,
              sess.username,
              product.rows[0].product_name,
              content.finalPrice,
              product.rows[0].product_image,
            ],
          };
          await client.query(insertTransQuery);

          // 4. Now remove the product from product table where product_id is
          //    req.params.product_id
          const deleteQuery = {
            text: 'DELETE FROM "product" WHERE product_id = $1',
            values: [req.params.productID],
          };
          await client.query(deleteQuery);
          var date = new Date();
          const html = await ejs.renderFile(
            __dirname + "/public/views/receipt.ejs",
            {
              product: product.rows,
              seller_id: sess.username,
              sellerBuyer: sellerBuyer.rows,
              finalizedPrice: content.finalPrice,
              date: date,
            }
          );

          //console.log(html);
          pdf
            .create(html, { format: "A4" })
            .toFile("./receipt.pdf", function (err, resp) {
              if (err) {
                throw err;
              } else {
                //     var cipherKey1 = crypto.createCipheriv(
                //   "aes128",
                //   process.env.CRYPTO_KEY,
                //   process.env.CRYPTO_IV
                // );
                // var str1 = cipherKey1.update(sellerBuyer.rows[0].email_id, "utf8", "hex");
                // str1 += cipherKey1.final("hex");

                //  var cipherKey2 = crypto.createCipheriv(
                //    "aes128",
                //    process.env.CRYPTO_KEY,
                //    process.env.CRYPTO_IV
                //  );
                // var str2 = cipherKey2.update(sellerBuyer.rows[1].email_id);
                // str2 += cipherKey2.final("hex")
                res.redirect(
                  "/receipt/" +
                    sellerBuyer.rows[0].email_id +
                    "/" +
                    sellerBuyer.rows[1].email_id
                );
              }
            });
        } else {
          throw "OTP Not Match!";
        }
        await client.query("COMMIT");
      } catch (err) {
        console.log(err);
        await client.query("ROLLBACK");
        sess.msg = "Pass Not Matched";
        res.redirect("/sold/" + req.params.productID);
      } finally {
        await client.release();
      }
    })().catch((err) => console.log(err.stack));
  } else {
    res.redirect("/login");
  }
});

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
