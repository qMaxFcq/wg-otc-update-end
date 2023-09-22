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
    const userName = userData.username;
    const comparePassword = await bcrypt.compare(password, userData.password);

    if (!comparePassword) {
      return res.json({
        message: "login fail...",
      });
    }

    const token = jwt.sign({ email, userName }, process.env.JWT_SECRET_KEY, {
      expiresIn: "1d",
    });
    res.json({ message: "login done", token });
  } catch (error) {
    console.error("Error:", error);
  }
};
