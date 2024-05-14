require("dotenv").config();
const mysql = require("mysql2/promise");
const moment = require("moment");

const jwt = require("jsonwebtoken");

const db_test = mysql.createPool({
  connectionLimit: 5,
  host: process.env.DB_HOST_WG_PRO,
  user: process.env.DB_USERNAME_WG_PRO,
  password: process.env.DB_PASSWORD_WG_PRO,
  database: process.env.DB_NAME_WG_PRO,
});

exports.getArbConfig = async (req, res) => {
  try {
    const [arbConfig] = await db_test.query(`SELECT * FROM config_arb`);
    res.status(200).json(arbConfig);
  } catch (error) {
    res.status(500).json({
      message: "Error From getArbConfig",
    });
  }
};

exports.updateArbConfig = async (req, res) => {
  try {
    const data = req.body;
    for (const item of data) {
      const { id, exchange_id, rate } = item;
      await db_test.query(
        "UPDATE config_arb SET rate = ? WHERE id = ? AND exchange_id = ?",
        [rate, id, exchange_id]
      );
    }
    res.status(200).json({
      message: "successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error updating arb config",
    });
  }
};
