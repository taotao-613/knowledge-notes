// 豆瓣内容导入功能

// 抓取豆瓣读书信息
async function fetchDoubanBook(url) {
    // 提取豆瓣 ID
    const match = url.match(/subject\/(\d+)/);
    if (!match) {
        throw new Error('无效的豆瓣链接');
    }
    const subjectId = match[1];
    
    // 由于豆瓣有反爬，我们用代理或模拟请求
    // 这里使用一个公共的豆瓣 API 镜像
    const apiUrl = `https://douban.uieee.com/v2/book/${subjectId}`;
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('无法获取豆瓣数据，请稍后重试');
        }
        const data = await response.json();
        
        return {
            type: 'book',
            title: data.title,
            author: data.author?.join(', ') || '未知',
            publisher: data.publisher || '',
            pubDate: data.pubdate || '',
            pages: data.pages || '',
            price: data.price || '',
            isbn: data.isbn13 || '',
            rating: data.rating?.average || 0,
            summary: data.summary || '',
            image: data.image || '',
            url: url,
            tags: data.tags?.map(t => t.name) || []
        };
    } catch (error) {
        // 如果 API 不可用，尝试直接抓取网页
        return await fetchDoubanPage(url, 'book');
    }
}

// 抓取豆瓣电影信息
async function fetchDoubanMovie(url) {
    const match = url.match(/subject\/(\d+)/);
    if (!match) {
        throw new Error('无效的豆瓣链接');
    }
    const subjectId = match[1];
    
    const apiUrl = `https://douban.uieee.com/v2/movie/${subjectId}`;
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('无法获取豆瓣数据，请稍后重试');
        }
        const data = await response.json();
        
        return {
            type: 'movie',
            title: data.title,
            director: data.directors?.map(d => d.name).join(', ') || '未知',
            cast: data.casts?.map(c => c.name).join(', ') || '',
            year: data.year || '',
            genre: data.genres?.join(', ') || '',
            duration: data.duration || '',
            rating: data.rating?.average || 0,
            summary: data.summary || '',
            image: data.images?.medium || '',
            url: url
        };
    } catch (error) {
        return await fetchDoubanPage(url, 'movie');
    }
}

// 备用方案：直接抓取网页（需要后端代理）
async function fetchDoubanPage(url, type) {
    // 由于跨域限制，这个需要后端支持
    // 这里提供一个示例实现
    const response = await fetch('/api/douban-proxy?url=' + encodeURIComponent(url));
    if (!response.ok) {
        throw new Error('无法获取豆瓣数据');
    }
    const html = await response.text();
    
    // 解析 HTML 提取信息
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    if (type === 'book') {
        return {
            type: 'book',
            title: doc.querySelector('h1')?.textContent?.trim() || '',
            // ... 提取其他字段
            url: url
        };
    }
    
    return { type: 'unknown', url: url };
}

// 生成 AI 导入提示词
function generateDoubanPrompt(data) {
    if (data.type === 'book') {
        return `请为这本书生成读书笔记模板：

书名：${data.title}
作者：${data.author}
出版社：${data.publisher}
出版年：${data.pubDate}
评分：${data.rating}/10

简介：${data.summary.substring(0, 300)}...

请生成：
1. 3-5 个标签
2. 50 字以内的摘要
3. 读书笔记模板（包括：核心观点、金句摘录、我的思考、行动清单）

返回 JSON 格式：
{
    "tags": ["标签 1", "标签 2"],
    "summary": "摘要",
    "template": "笔记模板内容"
}`;
    } else if (data.type === 'movie') {
        return `请为这部电影生成观影笔记模板：

电影：${data.title}
导演：${data.director}
主演：${data.cast}
年份：${data.year}
评分：${data.rating}/10

简介：${data.summary.substring(0, 300)}...

请生成：
1. 3-5 个标签
2. 50 字以内的摘要
3. 观影笔记模板（包括：剧情概要、亮点、我的感受、推荐指数）

返回 JSON 格式：
{
    "tags": ["标签 1", "标签 2"],
    "summary": "摘要",
    "template": "笔记模板内容"
}`;
    }
}

// 导入到笔记
async function importFromDouban(url) {
    // 检测链接类型
    const isBook = url.includes('/book/');
    const isMovie = url.includes('/movie/');
    
    if (!isBook && !isMovie) {
        throw new Error('暂不支持该类型的豆瓣链接');
    }
    
    // 抓取数据
    const data = isBook ? await fetchDoubanBook(url) : await fetchDoubanMovie(url);
    
    // 调用 AI 生成笔记模板
    const prompt = generateDoubanPrompt(data);
    const aiResult = await callQwenAPI('导入豆瓣内容', prompt);
    
    // 组合完整笔记
    const note = {
        id: Date.now(),
        title: `📚 ${data.title}`,
        content: `${data.type === 'book' ? '📖 读书笔记' : '🎬 观影笔记'}\n\n` +
                 `链接：${url}\n\n` +
                 (data.type === 'book' ? 
                   `作者：${data.author}\n出版社：${data.publisher}\n出版年：${data.pubDate}\n评分：${'⭐'.repeat(Math.round(data.rating/2))}\n\n` :
                   `导演：${data.director}\n主演：${data.cast}\n年份：${data.year}\n评分：${'⭐'.repeat(Math.round(data.rating/2))}\n\n`
                 ) +
                 `简介：${data.summary}\n\n` +
                 `---\n\n${aiResult.template || ''}`,
        timestamp: Date.now(),
        category: data.type === 'book' ? '读书' : '观影',
        tags: aiResult.tags || data.tags || [],
        aiSummary: aiResult.summary || '',
        metadata: data
    };
    
    return note;
}

// 在 app.js 中调用的函数
async function handleDoubanImport(url) {
    try {
        const note = await importFromDouban(url);
        notes.push(note);
        saveNotesToLocal();
        renderNotes();
        return { success: true, note: note };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
