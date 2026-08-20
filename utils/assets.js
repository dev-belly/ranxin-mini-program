// 归属：B｜核心交互 Owner
// 资源加载辅助：真实图片优先，程序化渲染兜底。
// 用法：在页面 onLoad 时 resolvePatternAssets(catalog)，得到 { id: { file, hasImage } }。
// 图片放入 assets/patterns/ 且文件名与 manifest.json 一致即可自动启用，无需改代码。
const manifest = require('../assets/patterns/manifest.json');

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
