const express = require('express');
const router = express.Router();
var db = require('../database');
var path = require("path");
var crypto = require("crypto");
var nodemailer = require("nodemailer");

//Redirects to products for sale page for seller once he accepts request through mail
router.get("/:productID/:buyerID/:sellerID", function (req, res) {
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
router.get("/:action", function (req, res) {
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

module.exports = router;