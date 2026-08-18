# 染心 · 云数据库 Schema 设计（Owner: C）

> 本文档对应《研发规范 V1.0》附录 A 的 8 个冻结接口，描述微信云开发（CloudBase / 云数据库）的集合（collection）结构。
> 当前 `utils/api.js` 处于 `USE_MOCK = true`，所有读写走本地存储兜底；C 接好云函数后按本文档建集合并切换。

## 集合清单

### 1. users（用户）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| _openid | string | 微信 OPENID（系统自动） |
| nickname | string | 昵称 |
| createdAt | number | 注册时间戳 |

### 2. patterns（纹样主数据）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 纹样 id（hudie/tuan/shui/cang/ling/he），唯一 |
| name | string | 显示名（蝴蝶纹/团花纹/水波纹/山水纹/菱形纹/卷草纹） |
| category | string | 分类（白族传统/自然/几何） |
| thumb | string | 缩略图路径 `/assets/patterns/<id>.png` |
| story | string | 纹样寓意文案 |
| unlockedByDefault | boolean | 是否默认解锁 |

### 3. user_patterns（用户已解锁纹样）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| _openid | string | 用户 |
| patternId | string | 纹样 id |
| source | object | 解锁来源 { sourceType, sourceId }（game / mbti / manual） |
| createdAt | number | 时间戳 |

### 4. mbti_results（情绪/MBTI 测试结果）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| _openid | string | 用户 |
| answers | array | 答题记录 |
| mbtiType | string | 情绪类型 |
| patternId | string | 推荐纹样 id |
| createdAt | number | 时间戳 |

### 5. drafts（创作草稿）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| _openid | string | 用户 |
| carrier | string | 载体（丝巾/帆布袋/抱枕） |
| patternId | string | 纹样 id |
| diyParams | object | DIY 参数（花瓣数/紧密度/留白/角度） |
| dyeParams | object | 染材/浓度/氧化时间/拆结方式 |
| createdAt | number | 时间戳 |

### 6. works（作品）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| _openid | string | 用户 |
| title | string | 作品标题 |
| patternId | string | 纹样 id |
| thumb | string | 缩略图（DIY 导出图 / 实物图） |
| carrier / mood / dyeName / concentration / oxidationTime / untieMethod | mixed | 创作上下文 |
| createdAt | number | 时间戳 |

### 7. game_scores（合成大染缸成绩）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| _openid | string | 用户 |
| score | number | 得分 |
| duration | number | 时长（秒） |
| rewardPatternId | string | 解锁纹样 id |
| createdAt | number | 时间戳 |

## 接口 ↔ 集合映射
| 接口 | 读/写集合 |
| --- | --- |
| login | users |
| getPatterns | patterns（+ user_patterns 过滤解锁） |
| unlockPattern | user_patterns |
| saveMbtiResult | mbti_results |
| saveDraft | drafts |
| saveWork | works |
| getMyWorks | works |
| submitGame | game_scores（+ 触发 unlockPattern） |
