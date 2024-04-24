require("dotenv").config();
const mysql = require("mysql2/promise");
const moment = require("moment");

const db_test = mysql.createPool({
  // connectionLimit : 5,
  // host: process.env.DB_HOST_NEW,
  // user: process.env.DB_USERNAME_NEW,
  // password: process.env.DB_PASSWORD_NEW,
  // database: process.env.DB_NAME_NEW_2,
  connectionLimit: 5,
  host: process.env.DB_HOST_WG_PRO,
  user: process.env.DB_USERNAME_WG_PRO,
  password: process.env.DB_PASSWORD_WG_PRO,
  database: process.env.DB_NAME_NEW_2,
});

exports.getVolumePnl = async (req, res) => {
  try {
    let selectedDate = req.query.selectedDate;
    if (selectedDate != null) {
      selectedDate = selectedDate.split("/").reverse().join("-");
    } else {
      selectedDate = new Date().toISOString().split("T")[0];
    }
    const [date] = await db_test.query(
      `WITH v AS (
              SELECT date, 
                     SUM(volumns) AS total_volume, 
                     SUM(orders) AS total_order
              FROM summary_volumns
              WHERE (date) = ?
              GROUP BY date
            ),
            t AS (
              SELECT date, 
                     SUM(realized_pnl) AS total_pnl
              FROM summary_tally
              WHERE (date) = ?
              GROUP BY date
            )
            SELECT v.date, 
                   v.total_volume, 
                   v.total_order, 
                   t.total_pnl
            FROM v
            INNER JOIN t ON v.date = t.date;
            
              `,
      [selectedDate, selectedDate]
    );

    res.status(200).json(date[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await db_test.releaseConnection();
  }
};
