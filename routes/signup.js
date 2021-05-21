const express = require('express');
const router = express.Router();
var bcrypt = require("bcrypt");
const saltRounds = 10;
var db = require('../database');

// showing registration page
router.get("/:mail_id", function (req, res) {
    var sess = req.session;
    if (sess.username) {
        res.redirect("/homepage");
    } else {
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
    }
});

// handling submit on signup Page
router.post("/:mail_id", function (req, res) {
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
            }
        });
    });
});

module.exports = router;