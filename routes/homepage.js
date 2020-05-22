const express = require('express');
const router = express.Router();
var _ = require("lodash");
var db = require('../database');

// display homepage
router.get("/", function (req, res) {
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
router.post("/", function (req, res) {
    var sess = req.session;
    var searchkeywords = req.body.productname.split(" ");
    if(searchkeywords[searchkeywords.length - 1] == '' && searchkeywords.length > 1){searchkeywords.pop()}
    for (var i = 0; i < searchkeywords.length; i++) {
        searchkeywords[i] = _.lowerCase([(string = searchkeywords[i])]);
    }
    // console.log(searchkeywords);
    var st = '';
    searchkeywords.map(function (keyword, index) {
        var index = index + 1;
        st += "'%" + keyword + "%'";
        if (index == searchkeywords.length) {
            st += '';
        }
        else {
            st += " OR LOWER(product_name) LIKE "
        }
    });
    // console.log(st);
    if (sess.username) {
        // somone is logged in thus can access
        const query = {
            text:
                "SELECT product_name,price,years_of_usage,product_image,category,product_id,seller_id FROM product WHERE LOWER(product_name) LIKE " + st,
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
router.get("/:category", function (req, res) {
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
            // console.log(product);
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
router.post("/:category", function (req, res) {
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

    if (sess.username) {
        // somone is logged in thus can access
        var searchmsg = "";
        switch (category) {
            case "book":
                searchmsg = "Search Book by Name, Author, Subject...";
                break;
            case "notes":
                searchmsg = "Search Notes by Subject, Professor, Topic...";
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
        var searchquery = {
            text:
                'select "product".product_name,"product".price,"product".years_of_usage,"product".product_image,"product".product_id,"product".seller_id from "product" where document_with_idx @@ to_tsquery(' +
                "$1" +
                ') and "product".product_id IN (SELECT product_id FROM ' +
                category +
                ')',
            values: [newstring],
        };
        db.query(searchquery, function (err, resp) {
            if (err) {
                res.send("Error");
                console.log(err);
            } else {
                var product = resp.rows;
                var response = product.map(function (item) {
                    return Object.values(item);
                });
                // console.log(response);
                res.render("search", {
                    product: response,
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

module.exports = router;