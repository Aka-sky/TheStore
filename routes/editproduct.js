const express = require('express');
const router = express.Router();
var db = require('../database');
var upload = require('../imgupload');
var _ = require("lodash");
var path = require("path");

//Edit product page of logged in user only
router.get("/:category&:id", function (req, res) {
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
router.post("/:category&:id", function (req, res) {
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

module.exports = router;
