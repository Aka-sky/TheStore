const express = require('express');
const router = express.Router();
var nodemailer = require("nodemailer");
var db = require('../database');

//Page to check if mail id is already in use
router.get("/", function (req, res) {
    var sess = req.session;
    if (sess.username) {
        res.redirect("/homepage");
    } else {
        res.render("verify", { msg: "" });
    }
});
//On entering email
router.post("/", function (req, res) {
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
router.get("/:mail_id", function (req, res) {
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
router.post("/:mail_id", function (req, res) {
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

module.exports = router;