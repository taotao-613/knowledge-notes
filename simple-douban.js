// 简化的图书/电影添加功能

// 打开表单
function openSimpleForm(type, inputId) {
    console.log('打开表单，类型:', type);
    
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
                    <button onclick="saveSimpleForm('${type}', '${inputId}')" class="text-indigo-600 font-medium">保存</button>
                </header>
                
                <div class="flex-1 p-4 overflow-y-auto space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                        <input type="text" id="sf-title" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="${isBook ? '书名' : '电影名'}">
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
    
    // 等待 DOM 渲染后再聚焦
    setTimeout(() => {
        const titleInput = document.getElementById('sf-title');
        if (titleInput) {
            titleInput.focus();
            console.log('表单已打开，焦点已设置');
        } else {
            console.error('找不到标题输入框');
        }
    }, 200);
}

// 关闭表单
function closeSimpleForm() {
    const form = document.getElementById('simple-form');
    if (form) form.remove();
    const addPage = document.getElementById('add-note-page');
    if (addPage) addPage.classList.remove('hidden');
}

// 保存表单
async function saveSimpleForm(type, inputId) {
    console.log('===== 开始保存 =====');
    console.log('类型:', type);
    console.log('输入 ID:', inputId);
    
    try {
        // 等待 DOM 完全渲染
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const titleEl = document.getElementById('sf-title');
        const authorEl = document.getElementById('sf-author');
        const publisherEl = document.getElementById('sf-publisher');
        const ratingEl = document.getElementById('sf-rating');
        const summaryEl = document.getElementById('sf-summary');
        
        if (!titleEl) {
            alert('❌ 表单未正确加载，请刷新页面重试');
            return;
        }
        
        const title = titleEl.value.trim();
        console.log('标题:', title);
        
        if (!title) {
            alert('请填写标题');
            titleEl.focus();
            return;
        }
        
        const author = authorEl ? authorEl.value.trim() : '';
        const publisher = publisherEl ? publisherEl.value.trim() : '';
        const rating = ratingEl ? ratingEl.value.trim() : '';
        const summary = summaryEl ? summaryEl.value.trim() : '';
        
        console.log('作者:', author);
        console.log('出版社:', publisher);
        console.log('评分:', rating);
        console.log('简介:', summary ? summary.substring(0, 20) + '...' : '空');
        
        // 尝试从 Google Books API 获取信息（仅书籍）
        let bookData = null;
        
        if (type === 'book' && inputId) {
            console.log('尝试从 Google Books API 获取...');
            
            try {
                // 先尝试用 ISBN 搜索
                const isbnMatch = inputId.match(/\d{10,13}/);
                if (isbnMatch) {
                    console.log('使用 ISBN 搜索:', isbnMatch[0]);
                    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnMatch[0]}`);
                    console.log('ISBN 搜索响应状态:', response.status);
                    if (response.ok) {
                        const data = await response.json();
                        console.log('ISBN 搜索结果:', data);
                        if (data.items && data.items.length > 0) {
                            bookData = data.items[0].volumeInfo;
                            console.log('通过 ISBN 获取成功:', bookData.title);
                        }
                    }
                }
                
                // 如果没找到，尝试用书名搜索
                if (!bookData && title) {
                    const query = encodeURIComponent(title + (author ? ' ' + author : ''));
                    console.log('使用书名搜索:', query);
                    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
                    console.log('书名搜索响应状态:', response.status);
                    if (response.ok) {
                        const data = await response.json();
                        console.log('书名搜索结果:', data);
                        if (data.items && data.items.length > 0) {
                            bookData = data.items[0].volumeInfo;
                            console.log('通过书名获取成功:', bookData.title);
                        }
                    }
                }
            } catch (e) {
                console.log('Google Books API 失败:', e.message);
            }
        }
        
        // 使用 API 数据或手动填写的数据
        const finalTitle = bookData?.title || title;
        const finalAuthor = bookData?.authors?.join(', ') || author || '待补充';
        const finalPublisher = bookData?.publisher || publisher || '待补充';
        const finalSummary = bookData?.description || summary || '待补充';
        const finalImage = bookData?.imageLinks?.thumbnail || '';
        const finalRating = rating || '待评分';
        
        console.log('最终标题:', finalTitle);
        console.log('最终作者:', finalAuthor);
        
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
        
        console.log('内容生成完成');
        
        // 调用 AI 生成标签
        let tags = [isBook ? '读书' : '电影'];
        let aiSummary = finalSummary ? finalSummary.substring(0, 50) + '...' : '';
        
        if (apiKey) {
            console.log('调用 AI 生成标签...');
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
                
                console.log('AI 响应状态:', response.status);
                
                if (response.ok) {
                    const data = await response.json();
                    const text = data.choices[0].message.content;
                    const match = text.match(/\{[\s\S]*\}/);
                    if (match) {
                        const result = JSON.parse(match[0]);
                        if (result.tags) tags = result.tags;
                        if (result.summary) aiSummary = result.summary;
                        console.log('AI 生成成功:', tags, aiSummary);
                    }
                }
            } catch (e) {
                console.log('AI 失败:', e.message);
            }
        } else {
            console.log('未配置 API Key，跳过 AI 生成');
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
        
        console.log('创建笔记对象:', note.title);
        
        notes.push(note);
        saveNotesToLocal();
        renderNotes();
        
        console.log('笔记已保存');
        
        closeSimpleForm();
        const addPage = document.getElementById('add-note-page');
        if (addPage) addPage.classList.add('hidden');
        
        const sourceMsg = bookData ? '\n\n✅ 已从 Google Books 自动获取图书信息' : '';
        alert('✅ 创建成功！\n\n"' + finalTitle + '"' + sourceMsg + '\n\n已添加到笔记列表');
        
    } catch (error) {
        console.error('保存失败:', error);
        alert('❌ 保存失败：' + error.message + '\n\n请打开浏览器控制台查看详细错误信息');
    }
}
