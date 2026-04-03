// 简化的豆瓣导入功能 - 确保能用

// 设置豆瓣类型
function setDoubanType(type) {
    window.doubanType = type;
    
    const bookBtn = document.getElementById('type-book');
    const movieBtn = document.getElementById('type-movie');
    
    if (type === 'book') {
        bookBtn.className = 'flex-1 bg-pink-100 text-pink-700 py-1.5 rounded-lg text-sm font-medium border-2 border-pink-300';
        movieBtn.className = 'flex-1 bg-gray-100 text-gray-500 py-1.5 rounded-lg text-sm font-medium border-2 border-transparent';
    } else {
        movieBtn.className = 'flex-1 bg-blue-100 text-blue-700 py-1.5 rounded-lg text-sm font-medium border-2 border-blue-300';
        bookBtn.className = 'flex-1 bg-gray-100 text-gray-500 py-1.5 rounded-lg text-sm font-medium border-2 border-transparent';
    }
}

// 从豆瓣导入 - 简化版
async function importFromDouban() {
    const input = document.getElementById('douban-url').value.trim();
    const type = window.doubanType || 'book';
    
    // 直接打开手动填写表单
    openSimpleForm(type, input);
}

// 打开简化表单
function openSimpleForm(type, input) {
    const isBook = type === 'book';
    const title = isBook ? '📚 添加书籍' : '🎬 添加电影';
    
    // 关闭添加页面
    const addPage = document.getElementById('add-note-page');
    if (addPage) addPage.classList.add('hidden');
    
    const formHtml = `
        <div id="simple-form" class="fixed inset-0 bg-white z-50">
            <div class="max-w-lg mx-auto h-full flex flex-col">
                <header class="px-4 py-3 border-b flex items-center justify-between">
                    <button onclick="closeSimpleForm()" class="text-gray-600">✕ 取消</button>
                    <h2 class="text-lg font-semibold">${title}</h2>
                    <button onclick="saveSimpleForm('${type}')" class="text-indigo-600 font-medium">保存</button>
                </header>
                
                <div class="flex-1 p-4 overflow-y-auto space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                        <input type="text" id="sf-title" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="${isBook ? '书名' : '电影名'}" autofocus>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">${isBook ? '作者' : '导演'}</label>
                        <input type="text" id="sf-author" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="${isBook ? '作者名' : '导演名'}">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">${isBook ? '出版社' : '年份'}</label>
                        <input type="text" id="sf-publisher" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="${isBook ? '出版社' : '2024'}">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">评分</label>
                        <input type="number" id="sf-rating" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0-10" step="0.1" min="0" max="10">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">简介</label>
                        <textarea id="sf-summary" rows="3" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="简单描述（可选）"></textarea>
                    </div>
                    
                    <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                        <p class="text-sm text-indigo-800">✨ 保存后 AI 会自动生成标签和笔记模板</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', formHtml);
    setTimeout(() => document.getElementById('sf-title').focus(), 100);
}

// 关闭表单
function closeSimpleForm() {
    const form = document.getElementById('simple-form');
    if (form) form.remove();
    const addPage = document.getElementById('add-note-page');
    if (addPage) addPage.classList.remove('hidden');
}

// 保存表单 - 带 API 获取
async function saveSimpleForm(type) {
    const title = document.getElementById('sf-title').value.trim();
    
    if (!title) {
        alert('请填写标题');
        return;
    }
    
    const author = document.getElementById('sf-author').value.trim();
    const publisher = document.getElementById('sf-publisher').value.trim();
    const rating = document.getElementById('sf-rating').value.trim();
    const summary = document.getElementById('sf-summary').value.trim();
    const inputId = document.getElementById('douban-url').value.trim();
    
    // 尝试从 Google Books API 获取信息
    let bookData = null;
    let loadingMsg = '';
    
    if (type === 'book' && inputId) {
        // 显示加载状态
        loadingMsg = '正在获取图书信息...';
        console.log('尝试从 Google Books API 获取...');
        
        try {
            // 先尝试用 ISBN 搜索
            const isbnMatch = inputId.match(/\d{10,13}/);
            if (isbnMatch) {
                const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnMatch[0]}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.items && data.items.length > 0) {
                        bookData = data.items[0].volumeInfo;
                        console.log('通过 ISBN 获取成功:', bookData);
                    }
                }
            }
            
            // 如果没找到，尝试用书名搜索
            if (!bookData && title) {
                const query = encodeURIComponent(title + (author ? ' ' + author : ''));
                const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.items && data.items.length > 0) {
                        bookData = data.items[0].volumeInfo;
                        console.log('通过书名获取成功:', bookData);
                    }
                }
            }
        } catch (e) {
            console.log('Google Books API 失败:', e);
        }
    }
    
    // 使用 API 数据或手动填写的数据
    const finalTitle = bookData?.title || title;
    const finalAuthor = bookData?.authors?.join(', ') || author || '待补充';
    const finalPublisher = bookData?.publisher || publisher || '待补充';
    const finalSummary = bookData?.description || summary || '待补充';
    const finalImage = bookData?.imageLinks?.thumbnail || '';
    const finalRating = rating || '待评分';
    
    // 构建笔记内容
    const isBook = type === 'book';
    let content = isBook ? 
        `📖 读书笔记

书名：${finalTitle}
作者：${finalAuthor}
出版社：${finalPublisher}
评分：⭐${finalRating}/10
${finalImage ? `封面：${finalImage}` : ''}

简介：
${finalSummary}

---
📝 我的笔记：

核心观点：


金句摘录：


我的思考：


行动清单：
` : 
        `🎬 观影笔记

电影：${title}
导演：${author || '待补充'}
年份：${publisher || '待补充'}
评分：⭐${rating || '待评分'}/10

简介：
${summary || '待补充'}

---
📝 我的笔记：

剧情概要：


亮点：


我的感受：


推荐指数：
`;
    
    // 调用 AI 生成标签
    let tags = [isBook ? '读书' : '电影'];
    let aiSummary = finalSummary ? finalSummary.substring(0, 50) + '...' : '';
    
    try {
        const prompt = `为"${finalTitle}"生成 3 个标签和 50 字摘要，JSON 格式：{"tags":["标签 1"],"summary":"摘要"}`;
        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'qwen3.5-plus',
                messages: [{ role: 'user', content: prompt }]
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            const text = data.choices[0].message.content;
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                const result = JSON.parse(match[0]);
                if (result.tags) tags = result.tags;
                if (result.summary) aiSummary = result.summary;
            }
        }
    } catch (e) {
        console.log('AI 失败:', e);
    }
    
    // 创建笔记
    const note = {
        id: Date.now(),
        title: (isBook ? '📚' : '🎬') + ' ' + finalTitle,
        content: content,
        timestamp: Date.now(),
        category: isBook ? '读书' : '观影',
        tags: tags,
        aiSummary: aiSummary,
        metadata: {
            image: finalImage,
            source: bookData ? 'google_books' : 'manual'
        }
    };
    
    notes.push(note);
    saveNotesToLocal();
    renderNotes();
    
    closeSimpleForm();
    document.getElementById('add-note-page').classList.add('hidden');
    
    const sourceMsg = bookData ? '\n\n✅ 已从 Google Books 自动获取图书信息' : '';
    alert('✅ 创建成功！\n\n"' + finalTitle + '"' + sourceMsg + '\n\n已添加到笔记列表');
}
