const express = require('express');
const router = express.Router();
var db = require('../database');
var path = require("path");
var crypto = require("crypto");
var ejs = require("ejs");
var nodemailer = require("nodemailer");
var fs = require("fs");
var pdf = require("html-pdf");

// when seller selects sold on ongoing
router.get("/:productID", function (req, res) {
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

router.post("/:productID", function (req, res) {
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
                        path.resolve(__dirname, '..') + "/public/views/receipt.ejs",
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

module.exports = router;
