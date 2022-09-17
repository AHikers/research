const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { init: initDB, Counter } = require("./db");

const Tesseract = require('tesseract.js');

const logger = morgan("tiny");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

const worker = Tesseract.createWorker({
  logger: m => console.log(m),
  errorHandler: err => console.log('[error:]', err),
});

// 首页
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const workerFunc = async () => {
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng', OEM.LSTM_ONLY);
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
  });

  const image =  require('fs').readFileSync('./images/testocr.png');
  // const image = 'https://lzw.me/wp-content/uploads/2017/02/donate_wx.png';
  const { data: { text } } = await worker.recognize(image);
  // console.log(text);
  return text;
}

// 更新计数
app.post("/api/count", async (req, res) => {
  const { action } = req.body;
  if (action === "inc") {
    await Counter.create();
  } else if (action === "clear") {
    await Counter.destroy({
      truncate: true,
    });
  }
  res.send({
    code: 0,
    data: await Counter.count(),
  });
});

// 获取计数
app.get("/api/count", async (req, res) => {
  const result = await Counter.count();
  res.send({
    code: 0,
    data: result,
  });
});

// 获取图片中的文字
app.get("/api/getText", async (req, res) => {
  const result = await workerFunc();
  res.send({
    code: 0,
    data: result,
  });
});

// 小程序调用，获取微信 Open ID
app.get("/api/wx_openid", async (req, res) => {
  if (req.headers["x-wx-source"]) {
    res.send(req.headers["x-wx-openid"]);
  }
});

const port = process.env.PORT || 80;

async function bootstrap() {
  await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}

bootstrap();
