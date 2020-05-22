const express = require('express');
const router = express.Router();
var bcrypt = require("bcrypt");
const saltRounds = 10;
var db = require('../database');

// displaying login page
router.get("/", function (req, res) {
    var sess = req.session;
    if (sess.username) {
        res.redirect("/homepage");
    } else {
        res.render("login", {
            msg: "",
            id: "",
            pas: "",
        });
    }
});

// handling submit on login page
router.post("/", function (req, res) {
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
                            pas: '',
                        });
                    }
                });
            } catch (e) {
                res.render("Login", {
                    msg: "Invalid Username",
                    id: '',
                    pas: '',
                });
            }
        }
    });
});

module.exports = router;