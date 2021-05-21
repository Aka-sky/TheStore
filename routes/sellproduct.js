const express = require('express');
const router = express.Router();
var db = require('../database');
var upload = require('../imgupload');
var path = require("path");

//Display Add product for sale page
router.get("/", function (req, res) {
    var sess = req.session;
    if (sess.username) {
      res.render("sellproduct", {
        user: sess.username,
        msg: "",
        pname: "",
        pyear: "",
        pcondition: "",
        price: "",
      });
    } else {
      res.redirect("/login");
    }
  });
  
  //Add product for sale
  router.post("/", function (req, res) {
    var sess = req.session;
    upload(req, res, function (err) {
      var product = req.body;
      if (err) {
        res.render("sellproduct", {
          msg: err,
          user: sess.username,
          pname: product.name,
          pyear: product.years,
          pcondition: product.condition,
          price: product.price,
        });
      } else {
        (async () => {
          const client = await db.connect();
          var imgPath;
          try {
            if (req.file == undefined) {
              imgPath = "../images/sellicon.svg";
            } else {
              imgPath = `../images/${req.file.filename}`;
            }
            await client.query("BEGIN");
            const productTableInsertQuery = {
              text:
                "INSERT INTO product (product_name,years_of_usage,price,product_image,condition,seller_id,category) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING product_id",
              values: [
                product.name,
                product.years,
                product.price,
                imgPath,
                product.condition,
                sess.username,
                product.categoryOptions,
              ],
            };
            const productResp = await client.query(productTableInsertQuery);
            var product_id = productResp.rows[0].product_id;
            console.log(product_id);
            var category = product.categoryOptions;
            var query;
  
            switch (category) {
              case "books":
                query = {
                  text: 'INSERT INTO "book" VALUES ($1,$2,$3,$4,$5)',
                  values: [
                    product_id,
                    product.publication,
                    product.edition,
                    product.subject,
                    product.author,
                  ],
                };
                query2 = {
                  text: "UPDATE product SET document_with_idx = to_tsvector($1 || ' ' || $2 || ' ' || $3) WHERE product_id = $4",
                  values: [
                    product.name,
                    product.subject,
                    product.author,
                    product_id,
                  ],
                };
                break;
              case "clothing":
                query = {
                  text: 'INSERT INTO "clothing" VALUES ($1,$2,$3,$4)',
                  values: [product_id, product.size, product.type, product.color],
                };
                query2 = {
                  text: "UPDATE product SET document_with_idx = to_tsvector($1 || ' ' || $2) WHERE product_id = $3",
                  values: [
                    product.name,
                    product.type,
                    product_id,
                  ],
                };
                break;
              case "notes":
                query = {
                  text: 'INSERT INTO "notes" VALUES ($1,$2,$3,$4,$5)',
                  values: [
                    product_id,
                    product.n_subject,
                    product.topic,
                    product.professor,
                    product.year,
                  ],
                };
                query2 = {
                  text: "UPDATE product SET document_with_idx = to_tsvector($1 || ' ' || $2 || ' ' || $3 || ' ' || $4) WHERE product_id = $5",
                  values: [
                    product.name,
                    product.n_subject,
                    product.topic,
                    product.professor,
                    product_id,
                  ],
                };
                break;
              case "other":
                query = {
                  text: 'INSERT INTO "other" VALUES ($1,$2,$3)',
                  values: [product_id, product.description, product.cate],
                };
                query2 = {
                  text: "UPDATE product SET document_with_idx = to_tsvector($1 || ' ' || $2 || ' ' || $3) WHERE product_id = $4",
                  values: [
                    product.name, product.description, product.cate,
                    product_id,
                  ],
                };
                break;
              case "calculators":
                query = {
                  text: 'INSERT INTO "calculator" VALUES ($1,$2,$3,$4)',
                  values: [
                    product_id,
                    product.calcibrand,
                    product.model,
                    product.features,
                  ],
                };
                query2 = {
                  text: "UPDATE product SET document_with_idx = to_tsvector($1 || ' ' || $2 || ' ' || $3) WHERE product_id = $4",
                  values: [
                    product.name,
                    product.calcibrand,
                    product.model,
                    product_id,
                  ],
                };
                break;
              case "pcs":
                query = {
                  text: 'INSERT INTO "pc" VALUES ($1,$2,$3,$4,$5,$6)',
                  values: [
                    product_id,
                    product.os,
                    product.ram,
                    product.storage,
                    product.pcbrand,
                    product.processor,
                  ],
                };
                query2 = {
                  text: "UPDATE product SET document_with_idx = to_tsvector($1 || ' ' || $2) WHERE product_id = $3",
                  values: [
                    product.name,
                    product.pcbrand,
                    product_id,
                  ],
                };
                break;
            }
            await client.query(query);
            await client.query(query2);
            res.render("sellproduct", {
              msg: "Successfully added the product",
              user: sess.username,
              pname: "",
              pyear: "",
              pcondition: "",
              price: "",
            });
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
            res.render("sellproduct", {
              msg: "Please fill out all fields!!",
              user: sess.username,
              pname: product.name,
              pyear: product.years,
              pcondition: product.condition,
              price: product.price,
            });
          } finally {
            client.release();
          }
        })().catch((err) => console.log(err.stack));
      }
    });
  });

  module.exports = router;