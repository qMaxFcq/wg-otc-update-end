require("dotenv").config();
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");

async function connectToDatabaseTest() {
  const db_test = await mysql.createConnection({
    host: process.env.DB_HOST_NEW,
    user: process.env.DB_USERNAME_NEW,
    password: process.env.DB_PASSWORD_NEW,
    database: process.env.DB_NAME_NEW,
  });

  return db_test;
}

async function connectToDatabase() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST_NEW,
    user: process.env.DB_USERNAME_NEW,
    password: process.env.DB_PASSWORD_NEW,
    database: process.env.DB_NAME_NEW_2,
  });

  return db;
}

async function connectToDatabaseWG() {
  const db_wg = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  return db_wg;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

exports.addNewOrder = async (req, res) => {
  // console.log(req.user[0].username);
  try {
    const { side, symbol, price, amount, customer } = req.body;
    const db_test = await connectToDatabaseTest();
    const currentDate = new Date();
    const exchange_order_id = formatDate(currentDate);
    const shop_id = 2;
    const cost = amount * price;
    const order_status = "COMPLETED";

    const sql =
      "INSERT INTO order_temp (shop_id, side, symbol, price, amount, cost, customer, exchange_order_id, order_status, add_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const [result] = await db_test.query(sql, [
      shop_id,
      side,
      symbol,
      price,
      amount,
      cost,
      customer,
      exchange_order_id,
      order_status,
      req.user[0].username,
    ]);
    await db_test.end();
    res.status(201).json({ message: "บันทึกข้อมูลสำเร็จ" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
  }
};

exports.editOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const db_test = await connectToDatabaseTest();
    const [existingOrder] = await db_test.query(
      "SELECT * FROM order_temp WHERE id = ?",
      [orderId]
    );

    if (!existingOrder || existingOrder.length === 0) {
      return res.status(404).json({ message: "ไม่พบคำสั่งที่ต้องการแก้ไข" });
    }

    const { side, symbol, price, amount, customer } = req.body;
    const cost = amount * price;

    // ดึงค่า completed_at ปัจจุบัน
    const [currentCompletedAt] = await db_test.query(
      "SELECT completed_at FROM order_temp WHERE id = ?",
      [orderId]
    );

    if (currentCompletedAt && currentCompletedAt.length > 0) {
      // ดึงค่า completed_at เดิมและวินาที
      const oldCompletedAt = currentCompletedAt[0].completed_at;
      const newCompletedAt = new Date(oldCompletedAt.getTime() + 1000);

      // อัปเดตค่า completed_at ในฐานข้อมูล
      await db_test.query(
        "UPDATE order_temp SET side=?, symbol=?, price=?, amount=?, cost=?, customer=?, completed_at=? , edit_by=? WHERE id = ?",

        [
          side,
          symbol,
          price,
          amount,
          cost,
          customer,
          newCompletedAt,
          req.user[0].username,
          orderId,
        ]
      );
    }

    await db_test.end();
    res.status(200).json({ message: "แก้ไขคำสั่งสำเร็จ" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการแก้ไขคำสั่ง" });
  }
};

exports.getOrderHistory = async (req, res) => {
  try {
    let selectedDate = req.query.selectedDate;
    if (selectedDate) {
      selectedDate = selectedDate.split("/").reverse().join("-");
    } else {
      selectedDate = new Date().toISOString().split("T")[0];
    }

    const limit = 10;
    let page = parseInt(req.query.page) || 1;
    page = isNaN(page) || page < 1 ? 1 : page;
    const offset = (page - 1) * limit;

    const db_test = await connectToDatabaseTest();
    const [rows] = await db_test.execute(
      `SELECT * FROM order_temp WHERE DATE(created_time) = ? LIMIT ${limit} OFFSET ${offset}`,
      [selectedDate]
    );

    db_test.end();
    res.json({ data: rows });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
    res.status(500).json({
      success: false,
      error: "เกิดข้อผิดพลาดในการดึงข้อมูล getOrderHistory",
    });
  }
};

exports.getWithdrawDepositAllCoin = async (req, res) => {
  try {
    let selectedDate = req.query.selectedDate;
    if (selectedDate) {
      selectedDate = selectedDate.split("/").reverse().join("-");
    } else {
      selectedDate = new Date().toISOString().split("T")[0];
    }

    console.log(selectedDate);

    const db_test = await connectToDatabaseTest();
    const [allHistory] = await db_test.execute(
      "SELECT * FROM order_temp WHERE DATE(created_time) = ?",
      [selectedDate]
    );
    db_test.end();

    // สร้างออบเจกต์เพื่อเก็บยอดรวมแยกตามเหรียญและฝ่าย
    const totalsByCoin = {
      USDT_THB: { SELL: 0, BUY: 0 },
      BTC_THB: { SELL: 0, BUY: 0 },
      ETH_THB: { SELL: 0, BUY: 0 },
      BNB_THB: { SELL: 0, BUY: 0 },
    };

    allHistory.forEach((record) => {
      const isSellSymbol =
        ["USDT_THB", "BTC_THB", "ETH_THB", "BNB_THB"].includes(record.symbol) &&
        record.side === "SELL";
      const isBuySymbol =
        ["USDT_THB", "BTC_THB", "ETH_THB", "BNB_THB"].includes(record.symbol) &&
        record.side === "BUY";

      if (isSellSymbol || isBuySymbol) {
        const coin = record.symbol;
        const amount = parseFloat(record.amount);

        if (record.side === "SELL") {
          totalsByCoin[coin].SELL += amount;
        } else if (record.side === "BUY") {
          totalsByCoin[coin].BUY += amount;
        }
      }
    });

    const db = await connectToDatabase();
    const [rows_wow] = await db.execute(
      "SELECT * FROM tally_wid_depo WHERE DATE(created_time) = ?",
      [selectedDate]
    );
    db.end();

    res.status(200).json({ totalsByCoin, rows_wow });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
    res.status(500).json({
      success: false,
      error: "เกิดข้อผิดพลาดในการดึงข้อมูล getWithdrawDepositAllCoin",
    });
  }
};
