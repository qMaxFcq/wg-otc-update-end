require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const app = express();
const Order = require("./routes/order");

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100000,
});

app.use(limiter);
app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/order", Order);


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(process.env.NODE_ENV);
});
