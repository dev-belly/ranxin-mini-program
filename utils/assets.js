// 归属：B｜核心交互 Owner
// 资源加载辅助：真实图片优先，程序化渲染兜底。
// 用法：在页面 onLoad 时 resolvePatternAssets(catalog)，得到 { id: { file, hasImage } }。
// 小程序运行时不能稳定 require 任意 JSON（会被解析成不存在的 .json.js 模块），
// 因此把这份很小的打包清单保留为 JS 常量；manifest.json 继续作为资源说明文件。
const manifest = {
  patterns: {
    hudie: 'hudie.jpg',
    tuan: 'tuan.jpg',
    shui: 'shui.jpg',
    cang: 'cang.jpg',
    ling: 'ling.jpg',
    he: 'he.jpg',
    heling: 'heling.jpg'
  },
  products: {
    scarf: 'scarf.png',
    bag: 'bag.png',
    pillow: 'pillow.png'
  }
};

function assetPath(file) {
  if (!file) return '';
  return '/assets/patterns/' + file;
}

function patternFile(id) {
  return (manifest.patterns && manifest.patterns[id]) || null;
}

function productFile(id) {
  return (manifest.products && manifest.products[id]) || null;
}

// 检测打包资源是否存在（微信基础库支持对包内资源 access）
function assetExists(file) {
  return new Promise((resolve) => {
    if (!file) { resolve(false); return; }
    try {
      wx.getFileSystemManager().access({
        path: assetPath(file),
        success: () => resolve(true),
        fail: () => resolve(false)
      });
    } catch (e) {
      resolve(false);
    }
  });
}

// 批量解析整组纹样的资源就绪状态
async function resolvePatternAssets(catalog) {
  const map = {};
  await Promise.all(catalog.map(async (item) => {
    const file = patternFile(item.id);
    map[item.id] = {
      file: file,
      hasImage: file ? await assetExists(file) : false
    };
  }));
  return map;
}

module.exports = {
  assetPath,
  patternFile,
  productFile,
  assetExists,
  resolvePatternAssets,
  manifest
};
