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

const saveResultObj = {}

const worker = Tesseract.createWorker({
  logger: m => console.log(m),
  errorHandler: err => console.log('[error:]', err),
});

// 首页
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const workerFunc = async (base64Img, reqImgId) => {
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng', Tesseract.OEM.LSTM_ONLY);
  await worker.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
  });

  // const image =  require('fs').readFileSync('./images/testocr.png');
  // const image = 'https://lzw.me/wp-content/uploads/2017/02/donate_wx.png';
  const bufferImg = Buffer.from(base64Img, 'base64')
  // console.log('image:', image)
  const { data: { text } } = await worker.recognize(bufferImg);
  saveResultObj[reqImgId] = text;
  console.log('ocrResult:', text);
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
app.post("/api/getText", async (req, res) => {
  const {base64_image, reqImgId} = req.body;
  workerFunc(base64_image, reqImgId);
  res.send({
    code: 0,
    data: 'doing',
  });
});

// 获取图片中的文字
app.post("/api/getResult", async (req, res) => {
  const {reqImgId} = req.body;
  let result = 'doing'
  console.log('saveResultObj:', saveResultObj)
  if (saveResultObj[reqImgId]) {
    result = 'sucess'
  }
  res.send({
    code: 0,
    data: {
      text: saveResultObj[reqImgId],
      result,
    },
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

// workerFunc()

bootstrap();
