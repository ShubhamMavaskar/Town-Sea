
const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Database setup
const db = new sqlite3.Database("./offers.db");

// Create table if not exists
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_name TEXT,
    buyer_email TEXT,
    offer_price REAL,
    product_name TEXT,
    message TEXT,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Email setup
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "kakashihatakeo591@gmail.com", // Replace with your email
    pass: "Khatake@7",       // Replace with your password
  },
});

// Add new offer
app.post("/submit-offer", (req, res) => {
  const { buyerName, buyerEmail, offerPrice, productName, message } = req.body;

  const sql = `INSERT INTO offers (buyer_name, buyer_email, offer_price, product_name, message) VALUES (?, ?, ?, ?, ?)`;
  const params = [buyerName, buyerEmail, offerPrice, productName, message];

  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).send("Error saving offer.");
    }

    // Send email to seller
    const mailOptions = {
      from: buyerEmail,
      to: "shubhammavaskar586@gmail.com", // Replace with the seller's email
      subject: "New Offer Received",
      text: `Product: ${productName}
Buyer Name: ${buyerName}
Offer Price: $${offerPrice}
Message: ${message || "No message provided"}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).send("Error sending email.");
      }
      res.status(200).send("Offer submitted and email sent.");
    });
  });
});

// Get offers with filters
app.get("/offers", (req, res) => {
  const { date, product } = req.query;
  let sql = "SELECT * FROM offers WHERE 1=1";
  const params = [];

  if (date) {
    sql += " AND DATE(created_at) = ?";
    params.push(date);
  }
  if (product) {
    sql += " AND product_name LIKE ?";
    params.push(`%${product}%`);
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).send("Error fetching offers.");
    }
    res.json(rows);
  });
});

// Update offer status (accept, reject, counter)
app.put("/offers/:id", (req, res) => {
  const { id } = req.params;
  const { status, counterOffer } = req.body;

  let sql = "UPDATE offers SET status = ?";
  const params = [status];

  if (counterOffer) {
    sql += ", offer_price = ?";
    params.push(counterOffer);
  }

  sql += " WHERE id = ?";
  params.push(id);

  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).send("Error updating offer.");
    }
    res.status(200).send("Offer updated successfully.");
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
