const path = require("path");
const fs = require('fs');
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
// const { init: initDB, Counter } = require("./db");

const Tesseract = require('tesseract.js');

const logger = morgan("tiny");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

let saveResultObj = {}

// 储存从文件中读取出来的内容
let fileContentList = [];

// const worker = Tesseract.createWorker({
//   logger: m => console.log(m),
//   errorHandler: err => console.log('[error:]', err),
// });

// 首页
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// const workerFunc = async (base64Img, reqImgId) => {
//   let testResult = ''
//   try {
//     await worker.load();
//     await worker.loadLanguage('eng');
//     await worker.initialize('eng', Tesseract.OEM.LSTM_ONLY);
//     await worker.setParameters({
//       tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
//     });

//     // const image =  require('fs').readFileSync('./images/testocr.png');
//     // const image = 'https://lzw.me/wp-content/uploads/2017/02/donate_wx.png';
//     const bufferImg = Buffer.from(base64Img, 'base64')
//     // console.log('image:', image)
//     const { data } = await worker.recognize(bufferImg);
//     testResult = data.text
//   } catch (e) {
//     console.log('error2:', e)
//   }
//   saveResultObj[reqImgId] = testResult;
//   console.log('ocrResult:', testResult);
//   if (!testResult) {
//     testResult = '匹配不到'
//   }
//   return testResult;
// }

// 更新计数
// app.post("/api/count", async (req, res) => {
//   const { action } = req.body;
//   if (action === "inc") {
//     await Counter.create();
//   } else if (action === "clear") {
//     await Counter.destroy({
//       truncate: true,
//     });
//   }
//   res.send({
//     code: 0,
//     data: await Counter.count(),
//   });
// });

// // 获取计数
// app.get("/api/count", async (req, res) => {
//   const result = await Counter.count();
//   res.send({
//     code: 0,
//     data: result,
//   });
// });

// 获取图片中的文字
// app.post("/api/getText", async (req, res) => {
//   // 清空
//   saveResultObj = {}
//   const { base64_image, reqImgId } = req.body;
//   try {
//     workerFunc(base64_image, reqImgId);
//   } catch (e) {
//     console.log('error:', e)
//   }
//   res.send({
//     code: 0,
//     data: 'doing',
//   });
// });

// 获取图片中的文字
// app.post("/api/getResult", async (req, res) => {
//   const { reqImgId } = req.body;
//   let result = 'doing'
//   console.log('saveResultObj:', saveResultObj)
//   if (saveResultObj[reqImgId]) {
//     result = 'sucess'
//   }
//   res.send({
//     code: 0,
//     data: {
//       text: saveResultObj[reqImgId],
//       result,
//     },
//   });
// });

// 审核时用的测试数据
const testContentList = [
  {
    content: '今日笔记↵每天下来发现许多该做的事都没做完，进度十分的不理想。时间紧迫，但又效率低下，导致↵事实上的拖延、懈怠。做事不果敢，发心无力，知行不能合一。↵请问如何才能致心一处、心无旁骛',
    id: 417,
    mainTagId: 2,
  },
  {
    content: '今日笔记↵诚其意”解释是：不自欺，如闻屎臭就远离，见鲜花就驻足，喜欢就喜欢，承↵认喜欢；不喜欢就不喜欢，承认不喜欢，知之就坦诚其知之，不知就坦诚其不知。简简单单',
    id: 416,
    mainTagId: 1,
  },
  {
    content: '今日笔记↵今日小观：近日发生很多不如意的事情，接二连三受到打击，自己也能做到心不随境↵转，没有什么特别悲伤的情绪，知道是自己的问题，需要接纳',
    id: 415,
    mainTagId: 0,
  },
]

// 获取问答内容
app.post("/api/getContent", async (req, res) => {
  const { mainTagId, subTagIds, page } = req.body;

  // 真实数据
  if (!fileContentList || !fileContentList.length) {
    fileContentList = await readFileGetContent()
  }
  const finalContentList = filterDataWithParams(mainTagId, subTagIds, page)
  const deepCopyContentList = finalContentList.map(item => {
    return {
      ...item,
    }
  })

  // 运用在正式环境
  // res.send({
  //   code: 0,
  //   data: {
  //     type: 0,
  //     content: adjustContentData(deepCopyContentList),
  //   },
  // });

  // 审核时用的代码
  res.send({
    code: 0,
    data: {
      type: 1,
      content: testContentList,
    },
  });

});

// 搜索内容接口
app.post("/api/searchContent", async (req, res) => {
  const { searchData } = req.body;
  // 真实数据
  if (!fileContentList || !fileContentList.length) {
    fileContentList = await readFileGetContent()
  }
  const finalContentList = searchContentByData(searchData);
  const deepCopyContentList = finalContentList.map(item => {
    return {
      ...item,
    }
  })

  // 运用在正式环境
  // res.send({
  //   code: 0,
  //   data: {
  //     type: 0,
  //     content: adjustContentData(deepCopyContentList),
  //   },
  // });

  // 审核时用的代码
  res.send({
    code: 0,
    data: {
      type: 1,
      content: testContentList,
    },
  });
});
// 根据搜索内容匹配数据
function searchContentByData(searchContent) {
  // 根据搜索内容找出最匹配的十五条数据
  const searchList = []
  const searchChars = searchContent.split('');
  fileContentList.forEach((item, index) => {
    let weight = 0
    searchChars.forEach(val => {
      if (item.content.indexOf(val) > -1) {
        weight++;
      }
    })
    if (weight) {
      searchList.push({
        index,
        weight,
      })
    }
  })
  // 按照weight排序，找出最匹配的15条数据,
  searchList.sort((a, b) => b.weight - a.weight)
  const newSearchList = searchList.length > 15 ? searchList.slice(0, 15) : searchList;
  return newSearchList.map(item => fileContentList[item.index])
}


// 小程序调用，获取微信 Open ID
app.get("/api/wx_openid", async (req, res) => {
  if (req.headers["x-wx-source"]) {
    res.send(req.headers["x-wx-openid"]);
  }
});

const port = process.env.PORT || 80;

async function bootstrap() {
  // await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}

async function readFileGetContent() {
  // 读取文件的路径
  const filePath = './nodeGetText/finalData.txt';

  const result = await new Promise((resolve, reject) => {
    // 使用 fs.readFile 方法异步读取文件内容
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('读取文件出错:', err);
        reject(err)
        return;
      }

      // 输出文件内容
      // console.log('文件内容:', JSON.parse(data));
      resolve(JSON.parse(data))
    });
  })

  return result;
}

function filterDataWithParams(mainTagId, subTagIds, page) {
  const offset = 15;
  if (!fileContentList || !fileContentList.length) {
    return []
  }
  const newContentList = fileContentList.filter(obj => {
    // 判断子标签中是否有查询条件中的标签，有返回true，没有返回false
    let subTagFlag = false;
    if (!subTagIds.length) {
      subTagFlag = true
    } else {
      subTagIds.forEach(val => {
        if (obj.subTagIds.includes(val)) {
          subTagFlag = true
        }
      })
    }
    // -1表示全部
    if (mainTagId === -1) {
      return subTagFlag;
    }
    return obj.mainTagId === mainTagId && subTagFlag;
  })
  const start = (page - 1) * offset;
  const end = start + 15;
  const pageContentList = newContentList.slice(start, end);
  return pageContentList;
}

// 调整数据结构, 把content中问和答分开变成一个数组
function adjustContentData(data) {
  // console.log('调整前的数据：', data);
  const newData = data.map(item => {
    if (!item.content || item.content.indexOf('问：') === -1) {
      item.content = [];
      return item;
    }

    const questionList = item.content.split('问：');
    questionList.shift();
    const adjustContent = questionList.map(val => {
      const arr = val.split('答：');
      return {
        question: arr[0],
        answer: arr[1],
      }
    })
    item.content = adjustContent;
    return item;
  });
  return newData;
}

// workerFunc()

bootstrap();

// async function testData() {
//   if (!fileContentList || !fileContentList.length) {
//     fileContentList = await readFileGetContent()
//   }
//   // const finalContentList = filterDataWithParams(-1, [], 1)
//   const finalContentList = searchContentByData('执着')
//   console.log(adjustContentData(finalContentList))
// }
// testData()
