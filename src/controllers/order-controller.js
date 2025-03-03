require("dotenv").config();
const mysql = require("mysql2/promise");
const moment = require("moment");
const moment_thai = require("moment-timezone");

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
    const id_is_com = req.body[0].id;

    let secondIncrement = 0;

    orders.forEach((order, index) => {
      const { side, symbol, price, amount, shop_id, customer, created_time } =
        order;

      if (index > 0) {
        const [datePart, timePart] = created_time.split(" ");
        const [year, month, day] = datePart.split("-");
        const [hour, minute, second] = timePart.split(":");
        const [secondPart, microsecond] = second.split(".");

        // เพิ่มวินาที
        let updatedSecond = parseInt(second) + index;
        secondIncrement++;

        const updatedTime = `${year}-${month}-${day} ${hour}:${minute}:${updatedSecond
          .toString()
          .padStart(2, "0")}`;

        order.created_time = updatedTime;
      }

      // console.log(order)

      const currentDate = new Date();
      const exchange_order_id = formatDate(currentDate);
      const cost = amount * price;
      const order_status = "COMPLETED";
      const convertedSide =
        side === "deposit" ? "BUY" : side === "withdraw" ? "SELL" : side;
      const convertedShop = shop_id === 1 ? 2 : shop_id === 3 ? 4 : shop_id;
      const convertedSymbol =
        symbol === 2
          ? "USDT_THB"
          : symbol === 3
          ? "BTC_THB"
          : symbol === 4
          ? "ETH_THB"
          : symbol === 5
          ? "BNB_THB"
          : "";

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
        order.created_time,
        order.created_time,
        req.user[0].username,
      ]);
    });

    // console.log(orderValues)

    const sql =
      "INSERT INTO `order` (shop_id, side, symbol, price, amount, cost, customer, exchange_order_id, order_status, created_time, completed_at, add_by) VALUES ?";

    const sql_update = `UPDATE withd_depo SET is_complete = 1 WHERE id = ${id_is_com}`;
    const [result] = await db_test.query(sql, [orderValues]);
    const result_is_update_com = await db_test.query(sql_update);

    res.status(201).json({ message: "บันทึกข้อมูลสำเร็จ" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
  } finally {
    await db_test.releaseConnection();
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

    const datetimeObject = existingOrder[0]["completed_at"];
    const datetimeString = JSON.stringify(datetimeObject);
    const [date_list, time_list] = datetimeString.split("T");
    const date = date_list.split('"');
    const [summanry_tally_list] = await db_test.query(
      "SELECT symbol_id, updated_at FROM summary_tally WHERE date = ?",
      [date[1]]
    );

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

      if (is_update) {
        await db_test.query("DELETE FROM `tally` WHERE completed_at >= ?", [
          oldCompletedAt,
        ]);

        function decrementUpdatedAt(array) {
          return array.map((item) => {
            const updatedTime = item.updated_at;
            const newTime = updatedTime - 1000;
            return { ...item, updated_at: new Date(newTime) };
          });
        }

        const decrementedData = decrementUpdatedAt(summanry_tally_list);
        const decrementedDataString = JSON.stringify(
          decrementedData[0]["updated_at"]
        );
        const [date_list, time_list] = decrementedDataString.split("T");
        const date = date_list.split('"');

        function updateDatabase(data) {
          data.forEach((item) => {
            const sql =
              "UPDATE `summary_tally` SET updated_at=? WHERE symbol_id=? AND date =?";
            const values = [item.updated_at, item.symbol_id, date[1]];
            db_test.query(sql, values);
          });
        }
        updateDatabase(decrementedData);
        // console.log(summanry_tally_list)
        // console.log(decrementedData);
      }
    }

    await db_test.releaseConnection();
    res.status(200).json({ message: "แก้ไขคำสั่งสำเร็จ" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการแก้ไขคำสั่ง" });
  }
};

exports.getOrderHistory = async (req, res) => {
  try {
    let selectedDate = req.query.selectedDate;
    let selectedShopId = req.query.shopId;
    if (selectedDate) {
      selectedDate = selectedDate.split("/").reverse().join("-");
    } else {
      selectedDate = new Date().toISOString().split("T")[0];
    }

    if (selectedShopId) {
      thisShopP2P = selectedShopId;
    } else {
      thisShopP2P = 2;
    }

    const limit = 10;
    let page = parseInt(req.query.page) || 1;
    page = isNaN(page) || page < 1 ? 1 : page;
    const offset = (page - 1) * limit;
    const sqlQuery = `SELECT * FROM \`order\` WHERE DATE(created_time) = ? AND shop_id = ? AND customer != 'FEES' ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;

    const queryParams = [selectedDate, selectedShopId];
    const [orderHistory] = await db_test.query(sqlQuery, queryParams);

    const historyOrderConthai = orderHistory.map((item) => ({
      ...item,
      created_time: moment(item.created_time).format("YYYY-MM-DD HH:mm:ss"),
      completed_at: moment(item.completed_at).format("YYYY-MM-DD HH:mm:ss"),
    }));

    const [withdrawDepositHistory] = await db_test.query(
      "SELECT * FROM `order` WHERE DATE(created_time) = ? AND shop_id IN (2, 4)",
      [selectedDate]
    );

    db_test.releaseConnection();

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
    db_test.releaseConnection();
  }
};

exports.getHistoryWidDepo = async (req, res) => {
  try {
    const [historyWidDepo] = await db_test.query(
      `SELECT * FROM withd_depo WHERE is_complete = 0`
    );

    // แปลง completed_at เป็นเวลาไทย
    const historyWidDepoWithThaiTime = historyWidDepo.map((item) => ({
      ...item,
      completed_at: moment(item.completed_at).format("YYYY-MM-DD HH:mm:ss"),
    }));

    res.status(200).json({ data: historyWidDepoWithThaiTime });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await db_test.releaseConnection();
  }
};

exports.exportData = async (req, res) => {
  try {
    const data = req.query;
    const { startDate, endDate, symbolId } = data;
    const symbolIds = symbolId.join(",");
    const [orderData] = await db_test.query(
      `
      SELECT
        o.created_time AS created_time,
        o.shop_id AS shop_id,
        o.side AS order_side,
        o.price AS order_price,
        o.amount AS order_amount,
        o.cost AS order_cost,
        o.customer AS order_customer,
        o.fee AS order_fee,
        t.symbol_id,
        t.left_amount,
        t.left_cost,
        t.avg_price,
        t.realized_pnl
      FROM
        \`tally\` t
      JOIN
        \`order\` o ON t.order_id = o.id
      WHERE
        t.completed_at BETWEEN ? AND ?
        AND t.symbol_id IN (${symbolIds})
    `,
      [startDate, endDate]
    );

    const thaiOrderData = orderData.map((order) => ({
      ...order,
      created_time: moment_thai
        .utc(order.created_time)
        .tz("Asia/Bangkok")
        .format("YYYY-MM-DD HH:mm:ss"),
    }));

    // console.log(thaiOrderData);

    res.status(200).json({ success: true, orderData: thaiOrderData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};
