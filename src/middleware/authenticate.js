require("dotenv").config();
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");

// async function connectToDatabase() {
//   const db = await mysql.createConnection({
//     host: process.env.DB_HOST_NEW,
//     user: process.env.DB_USERNAME_NEW,
//     password: process.env.DB_PASSWORD_NEW,
//     database: process.env.DB_NAME_NEW,
//   });

//   return db;
// }

const db_test = mysql.createPool({
  connectionLimit : 5,
  host: process.env.DB_HOST_NEW,
  user: process.env.DB_USERNAME_NEW,
  password: process.env.DB_PASSWORD_NEW,
  database: process.env.DB_NAME_NEW,
});


module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    let authToken = "";
    if (authHeader) {
      authToken = authHeader.split(" ")[1];
    }

    const user = jwt.verify(authToken, process.env.JWT_SECRET_KEY);
    // const db = await connectToDatabase();
    const userDetail = await db_test.query(
      "SELECT * from user WHERE email = ?",
      user.email
    );

    req.user = userDetail[0];
    next();
  } catch (err) {
    res.json({ message: "ไม่มี token นะจ่ะ" });
    next(err);
  } finally {
    await db_test.releaseConnection();

  }
};
