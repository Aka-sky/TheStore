const express = require('express');
const router = express.Router();
var db = require('../database');
var upload = require('../imgupload');
var path = require("path");

//Edit profile page of logged in user only
router.get("/", function (req, res) {
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
router.post("/", function (req, res) {
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

module.exports = router;