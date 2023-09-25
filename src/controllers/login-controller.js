require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

async function connectToDatabase() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST_NEW,
    user: process.env.DB_USERNAME_NEW,
    password: process.env.DB_PASSWORD_NEW,
    database: process.env.DB_NAME_NEW,
  });

  return db;
}

exports.register = async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const passwordHash = await bcrypt.hash(password, 15);

    const userData = {
      email,
      password: passwordHash,
      username,
    };
    const db = await connectToDatabase();
    const [results] = await db.query("INSERT INTO user SET ?", userData);
    await db.end();
    res.json({ message: "insert ok", results });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "An error occurred" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await connectToDatabase();
    const [results] = await db.query(
      "SELECT * FROM user WHERE email = ?",
      email
    );
    const userData = results[0];

    if (!userData || !userData.username) {
      return res.status(401).json({
        message: "User not found or missing username.",
      });
    }

    const userName = userData.username;
    const comparePassword = await bcrypt.compare(password, userData.password);

    if (!comparePassword) {
      return res.status(401).json({
        message: "Login failed.",
      });
    }

    const token = jwt.sign({ email, userName }, process.env.JWT_SECRET_KEY, {
      expiresIn: "1d",
    });
    await db.end();
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    // console.error("Error:", error);
    res.status(500).json({
      message: "An error occurred while processing your request.",
    });
  }
};

exports.userProflie = async (req, res) => {
  try {
    const user = req.user[0];
    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }
    const { email, username } = user;
    res.status(200).json({ email, username });
  } catch (error) {
    res.status(500).json({
      message: "Error From UserProfile",
    });
  }
};
