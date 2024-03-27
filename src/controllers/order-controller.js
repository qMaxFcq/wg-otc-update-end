require("dotenv").config();
const mysql = require("mysql2/promise");
const moment = require('moment');

const jwt = require("jsonwebtoken");
 
const db_test = mysql.createPool({
    connectionLimit : 5,
    host: process.env.DB_HOST_NEW,
    user: process.env.DB_USERNAME_NEW,
    password: process.env.DB_PASSWORD_NEW,
    database: process.env.DB_NAME_NEW_2,
  });


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
    const { side, symbol, price, amount, shop_id, customer } = req.body;
    // const db_test = await connectToDatabase();
    const currentDate = new Date();
    const exchange_order_id = formatDate(currentDate);
    const cost = amount * price;
    const order_status = "COMPLETED";

    const sql =
      "INSERT INTO `order` (shop_id, side, symbol, price, amount, cost, customer, exchange_order_id, order_status, created_time, add_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)";

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
    
    res.status(201).json({ message: "บันทึกข้อมูลสำเร็จ" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
  } finally {
    await db_test.releaseConnection();
  }
};

exports.addNewOrderArray = async (req, res) => {

  try {
    const orders = req.body;
    const orderValues = [];
    const id_is_com = req.body[0].id

    let secondIncrement = 0;

    orders.forEach((order,index) => {
      const {
        side,
        symbol,
        price,
        amount,
        shop_id,
        customer,
        created_time
      } = order;

      if (index > 0) {
        const [datePart, timePart] = created_time.split(' ');
        const [year, month, day] = datePart.split('-');
        const [hour, minute, second] = timePart.split(':');
        const [secondPart, microsecond] = second.split('.');

        // เพิ่มวินาที
        let updatedSecond = parseInt(second) + index;
        secondIncrement++;

        const updatedTime = `${year}-${month}-${day} ${hour}:${minute}:${updatedSecond.toString().padStart(2, '0')}.${microsecond}`;

        order.created_time = updatedTime;
    }
    
      const currentDate = new Date();
      const exchange_order_id = formatDate(currentDate);
      const cost = amount * price;
      const order_status = "COMPLETED";
      const convertedSide = side === 'deposit' ? 'BUY' : side === 'withdraw' ? 'SELL' : side;
      const convertedShop = shop_id === 1 ? 2 : shop_id === 3 ? 4 : shop_id;
      const convertedSymbol = symbol === 2 ? "USDT_THB" : "";
      

      orderValues.push([
        convertedShop,
        convertedSide, 
        convertedSymbol,
        price,
        amount,
        cost,
        customer,
        exchange_order_id,
        order_status,
        created_time,
        req.user[0].username,
      ]);
    });

    const sql =
      "INSERT INTO `order` (shop_id, side, symbol, price, amount, cost, customer, exchange_order_id, order_status, created_time, add_by) VALUES ?";

    const sql_update = `UPDATE withd_depo SET is_complete = 1 WHERE id = ${id_is_com}`;
    const [result] = await db_test.query(sql, [orderValues]);
    const result_is_update_com = await db_test.query(sql_update)

    res.status(201).json({ message: "บันทึกข้อมูลสำเร็จ" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
  } finally {
    await db_test.releaseConnection()
  }
};

exports.editOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const [existingOrder] = await db_test.query(
      "SELECT * FROM `order` WHERE id = ?",
      [orderId]
    );

    if (!existingOrder || existingOrder.length === 0) {
      return res.status(404).json({ message: "ไม่พบคำสั่งที่ต้องการแก้ไข" });
    }

    const { side, symbol, price, amount, customer, shop_id } = req.body;
    const cost = amount * price;

    // ดึงค่า completed_at ปัจจุบันน
    const [currentCompletedAt] = await db_test.query(
      "SELECT completed_at FROM `order` WHERE id = ?",
      [orderId]
    );

    if (currentCompletedAt && currentCompletedAt.length > 0) {
      // ดึงค่า completed_at เดิมและวินาที
      const oldCompletedAt = currentCompletedAt[0].completed_at;
      const newCompletedAt = new Date(oldCompletedAt.getTime() + 1000);

      // อัปเดตค่า completed_at ในฐานข้อมูล
      const is_update = await db_test.query(
        "UPDATE `order` SET shop_id=?, side=?, symbol=?, price=?, amount=?, cost=?, customer=?, completed_at=? , edit_by=? WHERE id = ?",

        [
          shop_id,
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

      if (is_update){
        await db_test.query("DELETE FROM `tally` WHERE completed_at >= ?",[oldCompletedAt])
      }

    }

    await db_test.releaseConnection()
    res.status(200).json({ message: "แก้ไขคำสั่งสำเร็จ" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการแก้ไขคำสั่ง" });
  }
};

exports.getOrderHistory = async (req, res) => {

  try {
    let selectedDate = req.query.selectedDate;
    let selectedShopId = req.query.shopId
    if (selectedDate) {
      selectedDate = selectedDate.split("/").reverse().join("-");
    } else {
      selectedDate = new Date().toISOString().split("T")[0];
    }

    if (selectedShopId) {
      thisShopP2P = selectedShopId
    } else {
      thisShopP2P = 2
    }


    const limit = 10;
    let page = parseInt(req.query.page) || 1;
    page = isNaN(page) || page < 1 ? 1 : page;
    const offset = (page - 1) * limit;
    const sqlQuery = `SELECT * FROM \`order\` WHERE DATE(created_time) = ? AND shop_id = ? AND customer != 'FEES' ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;
    
    const queryParams = [selectedDate, selectedShopId];
    const [orderHistory] = await db_test.query(sqlQuery, queryParams);
    
    const historyOrderConthai = orderHistory.map(item => ({
      ...item,
      created_time: moment(item.created_time).format('YYYY-MM-DD HH:mm:ss'),
      completed_at: moment(item.completed_at).format('YYYY-MM-DD HH:mm:ss'),
    }));

    const [withdrawDepositHistory] = await db_test.query(
      "SELECT * FROM `order` WHERE DATE(created_time) = ? AND shop_id IN (2, 4)",
      [selectedDate]
    );

    db_test.releaseConnection()

    // สร้างโครง
    const totalsByCoin = {
      USDT_THB: { SELL: 0, BUY: 0 },
      BTC_THB: { SELL: 0, BUY: 0 },
      ETH_THB: { SELL: 0, BUY: 0 },
      BNB_THB: { SELL: 0, BUY: 0 },
    };

    // ดึงออเดอร์และ amount จากการเลือกวันมารวมกัน
    withdrawDepositHistory.forEach((record) => {
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

    // ดึงยอดการฝาก ถอน จาก api
    const [additionalData] = await db_test.query(
      "SELECT * FROM summary_witd_depo WHERE DATE(date) = ?",
      [selectedDate]
    );

    res.status(200).json({
      data: historyOrderConthai,
      withdrawDepositHistory,
      totalsByCoin,
      additionalData,
    });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
    res.status(500).json({
      success: false,
      error: "เกิดข้อผิดพลาดในการดึงข้อมูล getOrderHistory",
    });
  } finally {
    db_test.releaseConnection()
  }
};

exports.getHistoryWidDepo = async (req, res) => {
  try {
    const [historyWidDepo] = await db_test.query(
      `SELECT * FROM withd_depo WHERE is_complete = 0 AND DATE(completed_at) = CURDATE()`
    );

    // แปลง completed_at เป็นเวลาไทย
    const historyWidDepoWithThaiTime = historyWidDepo.map(item => ({
      ...item,
      completed_at: moment(item.completed_at).format('YYYY-MM-DD HH:mm:ss'),
    }));

    res.status(200).json({ data: historyWidDepoWithThaiTime });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await db_test.releaseConnection()
  }
};
