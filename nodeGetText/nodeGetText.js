const fs = require('fs');
const pdf = require('pdf-parse');

// 读取PDF文件的路径
const pdfFilePath = './origin_text.pdf';
const tagFilePath = './contentTag.pdf';
const finalDataPath = './finalData.txt';

function getPdfFileText(filePath) {
  // 使用pdf-parse库解析PDF文件
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error('读取PDF文件出错:', err);
      return;
    }

    // 将PDF文件数据传递给pdf库的解析器
    pdf(data).then(function (data) {
      // 提取PDF文本内容
      let pdfText = data.text;

      // 使用正则表达式去除空行
      pdfText = pdfText.replace(/^\s*\n/gm, '');

      // 使用正则表达式去除数字加换行格式的字符
      pdfText = pdfText.replace(/\d+\n/g, ''); // 匹配数字加换行并替换为空字符串

      // 加个特殊字符方便划分
      pdfText = pdfText.replace(/\d+问/g, '&&问'); // 匹配数字加换行并替换为空字符串
      // const newText = pdfText.slice(0, 10000)

      // 将各个回答生成数组
      const contentArr = pdfText.split('&&');
      // 输出PDF文本内容
      // console.log('PDF文本内容:', contentArr);
      // 读取标签pdf文件并处理各条内容的标签
      getTagPdfText(contentArr);
    });
  });
}

// contentArr:各条问答内容组成的数组
function getTagPdfText(contentArr) {
  // 使用pdf-parse库解析PDF文件
  fs.readFile(tagFilePath, (err, data) => {
    if (err) {
      console.error('读取PDF文件出错:', err);
      return;
    }

    // 将PDF文件数据传递给pdf库的解析器
    pdf(data).then(function (data) {
      // 提取PDF文本内容
      let pdfText = data.text;

      // 使用正则表达式去除空行
      pdfText = pdfText.replace(/^\s*\n/gm, '');

      // 使用正则表达式去除数字加换行格式的字符（去掉pdf中页数信息）
      pdfText = pdfText.replace(/\d+\n/g, ''); // 匹配数字加换行并替换为空字符串
      // console.log(pdfText)
      // 转为数组
      const dataList = pdfText.split(/\d+、/)
      //第一个为空字符，需要去掉
      dataList.shift();
      // console.log(dataList)

      const subTagArr = dealTagOriginData(dataList);

      // 各条问答内容对应的标签id
      const dataTagObj = makeTagId(dataList, subTagArr);
      // console.log(dataTagObj)

      const finalData = generateObjDataByContent(contentArr, dataTagObj);
      // 将获得的最终数据写入文件中
      writeFinalData(finalData);
    });
  });
}

// 处理各个标签获得每个标签出现的次数
function dealTagOriginData(dataList) {
  // 截取“（”字符前的部分
  const newDataList = dataList.map(val => {
    const index = val.indexOf('（')
    return val.slice(0, index)
  })

  // console.log(newDataList)
  // 将处理好的重新转为字符串
  const dataChar = newDataList.join('、');
  // console.log(dataChar)
  // 将字符串转为数组方便操作
  const tagList = dataChar.split('、');
  // 计算每个标签出现的次数
  const mapObj = {}
  tagList.forEach(val => {
    if (mapObj[val]) {
      mapObj[val] = mapObj[val] + 1;
    } else {
      mapObj[val] = 1;
    }
  })
  // 把--这项去掉
  delete mapObj['--'];
  // console.log(mapObj)
  // 转化成数组
  const tagArr = []
  for (let key in mapObj) {
    const item = {
      name: key,
      weight: mapObj[key]
    }
    tagArr.push(item);
  }

  // 按照权重从大到小排序
  tagArr.sort((a, b) => b.weight - a.weight)
  // 加id、isSelect两个属性
  const newTagArr = tagArr.map((item, index) => {
    item.id = index;
    item.isSelect = false;
    return item;
  })
  // console.log(newTagArr)
  return newTagArr;
}

// subTagArr包含各个标签id、name等信息的对象数组
// dataList是各条内容所对应的标签组成的数组
function makeTagId(dataList, subTagArr) {
  const bigTypeList = [
    { name: '困惑', id: 0 },
    { name: '烦恼', id: 1 },
    { name: '感悟', id: 2 },
    { name: '家庭问题', id: 3 },
    { name: '孩子教育', id: 4 },
    { name: '工作问题', id: 5 },
  ];
  const dataTagObj = dataList.map(val => {
    const valArr = val.split('（');
    const item = {
      mainTagId: 0,
      subTagIds: [],
    }
    // 获取子标签所对应的id
    subTagArr.forEach(obj => {
      if (valArr[0] && valArr[0].indexOf(obj.name) > -1) {
        item.subTagIds.push(obj.id)
      }
    })
    // 获取大类标签所对应的id
    bigTypeList.forEach(obj => {
      if (valArr[1] && valArr[1].indexOf(obj.name) > -1) {
        item.mainTagId = obj.id;
      }
    })
    return item;
  })
  return dataTagObj;
}

// 将数组的内容转为一定格式的对象
// dataTagObj:各条问答内容对应的标签id
// contentArr:各条问答内容组成的数组
function generateObjDataByContent(contentArr, dataTagObj) {
  const objData = contentArr.map((val, index) => {
    return {
      id: index + 1,
      content: val,
      mainTagId: dataTagObj[index].mainTagId,
      subTagIds: dataTagObj[index].subTagIds,
    }
  })
  // console.log(objData)
  return objData;
}

// 将得到的内容写入文件
function writeFinalData(finalData) {
  const content = JSON.stringify(finalData);
  // 将数据写入文件
  fs.writeFile(finalDataPath, content, 'utf8', (err) => {
    if (err) {
      console.error('写入文件出错:', err);
    } else {
      console.log('文件写入成功');
    }
  });
}


getPdfFileText(pdfFilePath);

// 测试读文件
function testReadText() {
  // 读取文件的路径
  const filePath = './finalData.txt';

  // 使用 fs.readFile 方法异步读取文件内容
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('读取文件出错:', err);
      return;
    }

    // 输出文件内容
    console.log('文件内容:', JSON.parse(data));
  });
}

// testReadText()
