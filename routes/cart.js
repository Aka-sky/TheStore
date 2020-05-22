const express = require('express');
const router = express.Router();
var crypto = require("crypto");
var nodemailer = require("nodemailer");
var ejs = require("ejs");
var path = require("path");
var db = require('../database');

// add to cart clicked on homepage or product page
router.get("/:id", function (req, res) {
    var sess = req.session;
    var product_id = req.params.id;
    if (sess.username) {
        // somone is logged in thus can access
        const query = {
            text: 'INSERT INTO "cart" VALUES ($1,$2) ',
            values: [sess.username, product_id],
        };

        db.query(query, function (err, resp) {
            if (err) {
                sess.cartaction = 2;
            } else {
                sess.cartaction = 1;
            }
            res.redirect("/cart");
        });
    } else {
        res.redirect("/login");
    }
});

// get the cart page
router.get("/", function (req, res) {
    var sess = req.session;
    var cartmsg = ''
    if (sess.cartaction == 1) {
        cartmsg = "Added to Cart";
    } else if (sess.cartaction == 2) {
        cartmsg = "Product already in Cart";
    }
    delete req.session.cartaction;
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
                res.render("cart", { details: details, user: sess.username, cartmsg: cartmsg });
            }
        });
    } else {
        res.redirect("/login");
    }
});

//From cart you can either buy or remove product
router.get("/:action/:product", function (req, res) {
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
                        path.resolve(__dirname, '..') + "/public/views/buyMail.ejs",
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

module.exports = router;