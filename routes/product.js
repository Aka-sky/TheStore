const express = require('express');
const router = express.Router();
var db = require('../database');

//display product details page
router.get("/:id", function (req, res) {
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
router.post("/:id", function (req, res) {
    var sess = req.session;
    var product_id = req.params.id;
    var comment = req.body.comment;

    if (sess.username) {
        if (comment != '') {
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
        }
        else{
            res.redirect("/product/" + product_id);
        }
    } else {
        res.redirect("/login");
    }
});

module.exports = router;