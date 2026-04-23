const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/videos.json');

// 创建数据库适配器
const adapter = new JSONFile(dbPath);

// 创建数据库实例
const db = new Low(adapter, {
  users: [],
  videos: []
});

// 初始化数据库
async function initDatabase() {
  try {
    // 读取数据
    await db.read();

    console.log('成功连接到LowDB数据库');
    console.log('数据库文件:', dbPath);
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
  }
}

// 调用初始化
initDatabase();

module.exports = db;