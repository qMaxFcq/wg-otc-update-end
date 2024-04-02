require("dotenv").config();
const mysql = require("mysql2/promise");
const moment = require('moment');

const jwt = require("jsonwebtoken");
 
const db_test = mysql.createPool({
    connectionLimit : 5,
    host: process.env.DB_HOST_WG_PRO,
    user: process.env.DB_USERNAME_WG_PRO,
    password: process.env.DB_PASSWORD_WG_PRO,
    database: process.env.DB_NAME_WG_PRO,
  });

  exports.getAlertActive = async (req, res) => {
    try {
      const [alertActive] = await db_test.query(
        `SELECT * FROM customer_token`
      );
  
      const [mainAlertPrice] = await db_test.query(`SELECT * FROM price_alert`);

      const mergedData = {
        data_customer: alertActive,
        data_mainalert: mainAlertPrice
      };
  
      res.status(200).json(mergedData);
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      await db_test.releaseConnection();
    }
  };

  exports.updateAlertActive = async (req, res) => {
    try {
        const data = req.body;

        const alertMapping = {
            'allAlert':1,
            'tenXLine': 5,
            'wanLine': 7,
            'patLine': 6,
            'thbbbLine': 8,
            'winLine': 9,
            'yLine': 10,
            'wgtelegram': 11
        };

        const sqlUpdates = Object.entries(data)
            .map(([key, value]) => {
                if (key === 'allAlert') {
                    const id = alertMapping[key];
                    return db_test.query('UPDATE price_alert SET is_active = ? WHERE id = ?', [value ? 1 : 0, id]);
                } else {
                    if (alertMapping[key]) {
                        const isActive = value ? 1 : 0;
                        const id = alertMapping[key];
                        return db_test.query('UPDATE customer_token SET is_active = ? WHERE id = ?', [isActive, id]);
                    }
                }
            });

        const results = await Promise.all(sqlUpdates);

        res.status(200).json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      await db_test.releaseConnection();

    }
};