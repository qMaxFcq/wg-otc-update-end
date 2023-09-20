const mysql = require("mysql2/promise");
const { v4: uuidv4 } = require("uuid");

async function connectToDatabase() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST_NEW,
    user: process.env.DB_USERNAME_NEW,
    password: process.env.DB_PASSWORD_NEW,
    database: process.env.DB_NAME_NEW,
  });

  return db;
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
  //   console.log("เข้ามา");
  try {
    const { side, symbol, price, amount, customer } = req.body;
    const db = await connectToDatabase();
    const currentDate = new Date();
    const exchange_order_id = formatDate(currentDate);
    const shop_id = 2;
    const cost = amount * price;
    const order_status = "COMPLETED";
    const sql =
      "INSERT INTO order_temp (shop_id, side, symbol, price, amount, cost, customer, exchange_order_id,order_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?,?)";
    const [result] = await db.query(sql, [
      shop_id,
      side,
      symbol,
      price,
      amount,
      cost,
      customer,
      exchange_order_id,
      order_status,
    ]);

    res.status(201).json({ message: "บันทึกข้อมูลสำเร็จ" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
  }
};

exports.editOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const db = await connectToDatabase();
    const [existingOrder] = await db.query(
      "SELECT * FROM order_temp WHERE id = ?",
      [orderId]
    );

    if (!existingOrder || existingOrder.length === 0) {
      return res.status(404).json({ message: "ไม่พบคำสั่งที่ต้องการแก้ไข" });
    }

    const { side, symbol, price, amount, customer } = req.body;
    const cost = amount * price;

    // ดึงค่า completed_at ปัจจุบัน
    const [currentCompletedAt] = await db.query(
      "SELECT completed_at FROM order_temp WHERE id = ?",
      [orderId]
    );

    if (currentCompletedAt && currentCompletedAt.length > 0) {
      // ดึงค่า completed_at เดิมและวินาที
      const oldCompletedAt = currentCompletedAt[0].completed_at;
      const newCompletedAt = new Date(oldCompletedAt.getTime() + 1000);

      // อัปเดตค่า completed_at ในฐานข้อมูล
      await db.query(
        "UPDATE order_temp SET side=?, symbol=?, price=?, amount=?, cost=?, customer=?, completed_at=? WHERE id = ?",
        [side, symbol, price, amount, cost, customer, newCompletedAt, orderId]
      );
    }

    res.status(200).json({ message: "แก้ไขคำสั่งสำเร็จ" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการแก้ไขคำสั่ง" });
  }
};

// exports.getOrderHistory = async (req, res) => {
//   try {
//     const db = await connectToDatabase();
//     const [rows, fields] = await db.execute(
//       "SELECT * FROM order_temp ORDER BY id DESC LIMIT 10"
//     );
//     db.end();
//     res.json({ data: rows });
//   } catch (error) {
//     console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
//     res
//       .status(500)
//       .json({ success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
//   }
// };

// exports.getOrderHistory = async (req, res) => {
//   try {
//     const currentDateTime = new Date();
//     const nowDate = currentDateTime.toISOString().split("T")[0];
//     const db = await connectToDatabase();

//     const limit = 10;
//     const page = req.query.page || 1;
//     const offset = (page - 1) * limit;

//     const [rows, fields] = await db.execute(
//       `SELECT * FROM order_temp WHERE DATE(created_time) = ? LIMIT ${limit} OFFSET ${offset}`,
//       [nowDate]
//     );

//     db.end();
//     res.json({ data: rows });
//   } catch (error) {
//     console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
//     res
//       .status(500)
//       .json({ success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
//   }
// };

exports.getOrderHistory = async (req, res) => {
  try {
    let selectedDate = req.query.selectedDate;
    const db = await connectToDatabase();

    const limit = 10;
    const page = req.query.page || 1;
    const offset = (page - 1) * limit;

    if (!selectedDate || typeof selectedDate === "undefined") {
      // ถ้าไม่ได้รับวันที่จากผู้ใช้ ให้ใช้วันปัจจุบัน
      const currentDateTime = new Date();
      selectedDate = currentDateTime.toISOString().split("T")[0];
    }

    const [rows, fields] = await db.execute(
      `SELECT * FROM order_temp WHERE DATE(created_time) = ? LIMIT ${limit} OFFSET ${offset}`,
      [selectedDate]
    );

    db.end();
    res.json({ data: rows });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
    res
      .status(500)
      .json({ success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
  }
};

exports.getOrderHistoryWithPage = async (req, res) => {};
