// 闪念笔记 - 手机端知识管理应用

// 数据存储
let notes = [];
let apiKey = localStorage.getItem('qwen_api_key') || '';
let currentNoteId = null;
let doubanType = 'book'; // 默认书籍

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadNotes();
    renderNotes();
    updateStats();
    registerServiceWorker();
    
    // 检查是否已设置 API Key
    if (!apiKey) {
        setTimeout(() => {
            alert('请先在设置中配置通义千问 API Key，这样 AI 才能帮你整理笔记！');
            showSettings();
        }, 1000);
    }
});

// 设置豆瓣类型
function setDoubanType(type) {
    doubanType = type;
    
    const bookBtn = document.getElementById('type-book');
    const movieBtn = document.getElementById('type-movie');
    
    if (type === 'book') {
        bookBtn.classList.add('border-pink-300', 'bg-pink-100', 'text-pink-700');
        bookBtn.classList.remove('border-transparent');
        movieBtn.classList.remove('border-blue-300', 'bg-blue-100', 'text-blue-700');
        movieBtn.classList.add('border-transparent');
    } else {
        movieBtn.classList.add('border-blue-300', 'bg-blue-100', 'text-blue-700');
        movieBtn.classList.remove('border-transparent');
        bookBtn.classList.remove('border-pink-300', 'bg-pink-100', 'text-pink-700');
        bookBtn.classList.add('border-transparent');
    }
}

// 从豆瓣导入
async function importFromDouban() {
    console.log('开始导入豆瓣内容...');
    
    let input = document.getElementById('douban-url').value;
    
    if (!input) {
        alert('请输入豆瓣链接或 ID');
        return;
    }
    
    // 清理输入
    input = input.trim()
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, '');
    
    console.log('清理后的输入:', input);
    
    // 尝试提取 ID - 多种方式
    let subjectId = null;
    let type = doubanType;
    
    // 方式 1: 从完整链接提取
    const fullMatch = input.match(/douban\.com\/(book|movie)\/subject\/(\d+)/);
    if (fullMatch) {
        type = fullMatch[1];
        subjectId = fullMatch[2];
        console.log('从完整链接提取:', type, subjectId);
    }
    
    // 方式 2: 只提取数字 ID（如果输入看起来像 ID）
    if (!subjectId && /^\d{6,}$/.test(input)) {
        subjectId = input;
        console.log('直接输入 ID:', subjectId);
    }
    
    // 方式 3: 从任何包含数字的字符串中提取
    if (!subjectId) {
        const idMatch = input.match(/(\d{6,})/);
        if (idMatch) {
            subjectId = idMatch[1];
            console.log('从字符串提取 ID:', subjectId);
        }
    }
    
    // 检查是否找到 ID
    if (!subjectId) {
        alert('❌ 无法识别豆瓣链接或 ID\n\n请检查输入是否正确，例如：\n- 完整链接：https://book.douban.com/subject/37407149/\n- 只需 ID: 37407149');
        return;
    }
    
    // 检查 API Key
    if (!apiKey) {
        alert('请先在设置中配置 API Key');
        showSettings();
        return;
    }
    
    console.log('最终类型:', type, 'ID:', subjectId);
    
    await processDoubanImport(type, subjectId, input);
}

// 处理豆瓣导入
async function processDoubanImport(type, subjectId, url) {
    if (!apiKey) {
        alert('请先在设置中配置 API Key');
        showSettings();
        return;
    }
    
    // 显示加载状态
    const importBtn = document.getElementById('douban-import-btn');
    if (!importBtn) {
        alert('找不到导入按钮，请刷新页面重试');
        return;
    }
    
    const originalText = importBtn.innerHTML;
    importBtn.innerHTML = '<div class="loading-spinner inline-block"></div><span class="ml-2">正在获取信息...</span>';
    importBtn.disabled = true;
    
    try {
        // 方案 1: 尝试多个 API 源
        let data = null;
        const apiSources = [
            `https://api.douban.com/v2/${type}/${subjectId}`,
            `https://douban-api.uomg.com/api/${type}?id=${subjectId}`,
        ];
        
        for (const apiUrl of apiSources) {
            try {
                console.log('尝试 API:', apiUrl);
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                console.log('API 响应状态:', response.status);
                if (response.ok) {
                    data = await response.json();
                    console.log('获取到数据:', data);
                    if (data.title || data.name) break;
                }
            } catch (e) {
                console.log(`API ${apiUrl} 失败:`, e.message);
                continue;
            }
        }
        
        // 方案 2: 如果 API 都失败，用手动填写
        if (!data || !data.title) {
            console.log('API 获取失败，使用手动填写');
            const manualInput = confirm('豆瓣 API 暂时不可用，是否手动填写信息？\n\n点击"确定"手动填写，"取消"跳过');
            
            if (manualInput) {
                openManualDoubanForm(type, url);
                importBtn.innerHTML = originalText;
                importBtn.disabled = false;
                return;
            } else {
                data = {
                    title: `${type === 'book' ? '书籍' : '电影'} ${subjectId}`,
                    summary: '请稍后手动补充详细信息',
                    rating: { average: 0 }
                };
            }
        }
        
        // 构建笔记内容
        const title = data.title || data.name || '未知';
        const rating = data.rating?.average || data.rate || 0;
        const summary = data.summary || data.intro || data.desc || '';
        
        let content = '';
        if (type === 'book') {
            content = `📖 读书笔记

书名：${title}
作者：${data.author?.join(', ') || data.authors?.join(', ') || '待补充'}
出版社：${data.publisher || '待补充'}
出版年：${data.pubdate || data.year || '待补充'}
页数：${data.pages || '待补充'}
ISBN: ${data.isbn13 || data.isbn || '待补充'}
评分：${rating > 0 ? '⭐'.repeat(Math.round(rating/2)) + ` ${rating}/10` : '待评分'}

简介：
${summary || '待补充'}

---
📝 我的笔记：

核心观点：


金句摘录：


我的思考：


行动清单：
`;
        } else if (type === 'movie') {
            content = `🎬 观影笔记

电影：${title}
导演：${data.directors?.map(d => d.name).join(', ') || '待补充'}
主演：${data.casts?.map(c => c.name).slice(0, 5).join(', ') || '待补充'}
年份：${data.year || '待补充'}
类型：${data.genres?.join(', ') || '待补充'}
片长：${data.duration || '待补充'}
评分：${rating > 0 ? '⭐'.repeat(Math.round(rating/2)) + ` ${rating}/10` : '待评分'}

简介：
${summary || '待补充'}

---
📝 我的笔记：

剧情概要：


亮点：


我的感受：


推荐指数：
`;
        }
        
        // 调用 AI 生成标签和摘要
        const aiPrompt = `请为这个${type === 'book' ? '书籍' : '电影'}生成标签和摘要：

标题：${title}
${type === 'book' ? `作者：${data.author?.join(', ') || ''}` : `导演：${data.directors?.map(d => d.name).join(', ') || ''}`}
简介：${summary ? summary.substring(0, 200) : '信息待补充'}

返回 JSON 格式：
{
    "tags": ["标签 1", "标签 2", "标签 3"],
    "summary": "50 字以内的摘要"
}`;
        
        let aiResult = { tags: [type === 'book' ? '读书' : '电影'], summary: '' };
        try {
            const aiResponse = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'qwen3.5-plus',
                    messages: [{ role: 'user', content: aiPrompt }],
                    temperature: 0.7
                })
            });
            
            if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                const aiText = aiData.choices[0].message.content.trim();
                const jsonMatch = aiText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    aiResult = JSON.parse(jsonMatch[0]);
                }
            }
        } catch (e) {
            console.log('AI 生成失败，使用默认值');
        }
        
        // 创建笔记
        const note = {
            id: Date.now(),
            title: `${type === 'book' ? '📚' : '🎬'} ${title}`,
            content: content,
            timestamp: Date.now(),
            category: type === 'book' ? '读书' : '观影',
            tags: aiResult.tags || [type === 'book' ? '读书' : '电影'],
            aiSummary: aiResult.summary || (summary ? summary.substring(0, 50) + '...' : '待补充'),
            metadata: { type: 'douban', doubanId: subjectId, url: url, rating: rating }
        };
        
        notes.push(note);
        saveNotesToLocal();
        renderNotes();
        
        // 清空输入框并关闭添加页
        document.getElementById('douban-url').value = '';
        closeAddPage();
        
        alert(`✅ 导入成功！\n\n${title}\n已添加到笔记`);
        
    } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败：' + error.message + '\n\n建议：稍后重试，或手动创建笔记');
    } finally {
        importBtn.innerHTML = originalText;
        importBtn.disabled = false;
    }
}

// 打开手动填写表单
function openManualDoubanForm(type, url) {
    closeAddPage();
    
    const formHtml = `
        <div id="manual-douban-form" class="fixed inset-0 bg-white z-50">
            <div class="max-w-lg mx-auto h-full flex flex-col">
                <header class="px-4 py-3 border-b flex items-center justify-between">
                    <button onclick="closeManualDoubanForm()" class="text-gray-600 flex items-center gap-1">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                        取消
                    </button>
                    <h2 class="text-lg font-semibold">${type === 'book' ? '📚 手动添加书籍' : '🎬 手动添加电影'}</h2>
                    <button onclick="saveManualDouban('${type}', '${url}')" class="text-indigo-600 font-medium">保存</button>
                </header>
                
                <div class="flex-1 p-4 overflow-y-auto space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">标题</label>
                        <input type="text" id="manual-title" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                    
                    ${type === 'book' ? `
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">作者</label>
                        <input type="text" id="manual-author" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">出版社</label>
                        <input type="text" id="manual-publisher" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">出版年</label>
                            <input type="text" id="manual-pubdate" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">评分</label>
                            <input type="text" id="manual-rating" placeholder="0-10" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        </div>
                    </div>
                    ` : `
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">导演</label>
                        <input type="text" id="manual-director" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">主演</label>
                        <input type="text" id="manual-cast" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">年份</label>
                            <input type="text" id="manual-year" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">评分</label>
                            <input type="text" id="manual-rating" placeholder="0-10" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        </div>
                    </div>
                    `}
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">简介</label>
                        <textarea id="manual-summary" rows="4" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
                    </div>
                    
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p class="text-sm text-blue-800">💡 提示：豆瓣链接已保存，你可以稍后在笔记中补充完整信息</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', formHtml);
}

// 关闭手动表单
function closeManualDoubanForm() {
    const form = document.getElementById('manual-douban-form');
    if (form) form.remove();
}

// 保存手动填写的内容
async function saveManualDouban(type, url) {
    const title = document.getElementById('manual-title').value.trim();
    const summary = document.getElementById('manual-summary').value.trim();
    const rating = document.getElementById('manual-rating').value.trim();
    
    if (!title) {
        alert('请填写标题');
        return;
    }
    
    let content = '';
    if (type === 'book') {
        const author = document.getElementById('manual-author').value.trim();
        const publisher = document.getElementById('manual-publisher').value.trim();
        const pubdate = document.getElementById('manual-pubdate').value.trim();
        
        content = `📖 读书笔记

书名：${title}
作者：${author || '待补充'}
出版社：${publisher || '待补充'}
出版年：${pubdate || '待补充'}
评分：${rating ? `⭐${rating}/10` : '待评分'}

简介：
${summary || '待补充'}

---
📝 我的笔记：

核心观点：


金句摘录：


我的思考：


行动清单：
`;
    } else {
        const director = document.getElementById('manual-director').value.trim();
        const cast = document.getElementById('manual-cast').value.trim();
        const year = document.getElementById('manual-year').value.trim();
        
        content = `🎬 观影笔记

电影：${title}
导演：${director || '待补充'}
主演：${cast || '待补充'}
年份：${year || '待补充'}
评分：${rating ? `⭐${rating}/10` : '待评分'}

简介：
${summary || '待补充'}

---
📝 我的笔记：

剧情概要：


亮点：


我的感受：


推荐指数：
`;
    }
    
    // 调用 AI 生成标签
    let tags = [type === 'book' ? '读书' : '电影'];
    try {
        const aiResponse = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'qwen3.5-plus',
                messages: [{ 
                    role: 'user', 
                    content: `为"${title}"生成 3-5 个标签，返回 JSON 数组格式：["标签 1", "标签 2"]` 
                }],
                temperature: 0.7
            })
        });
        
        if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const aiText = aiData.choices[0].message.content.trim();
            const jsonMatch = aiText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                tags = JSON.parse(jsonMatch[0]);
            }
        }
    } catch (e) {
        console.log('AI 生成失败');
    }
    
    const note = {
        id: Date.now(),
        title: `${type === 'book' ? '📚' : '🎬'} ${title}`,
        content: content,
        timestamp: Date.now(),
        category: type === 'book' ? '读书' : '观影',
        tags: tags,
        aiSummary: summary ? summary.substring(0, 50) + '...' : '待补充',
        metadata: { type: 'manual', doubanUrl: url }
    };
    
    notes.push(note);
    saveNotesToLocal();
    renderNotes();
    
    closeManualDoubanForm();
    closeAddPage();
    
    alert('✅ 添加成功！');
}

// 加载笔记
function loadNotes() {
    const saved = localStorage.getItem('knowledge_notes');
    if (saved) {
        notes = JSON.parse(saved);
    }
}

// 保存笔记到本地
function saveNotesToLocal() {
    localStorage.setItem('knowledge_notes', JSON.stringify(notes));
    updateStats();
}

// 渲染笔记列表
function renderNotes(filterText = '') {
    const list = document.getElementById('notes-list');
    const emptyState = document.getElementById('empty-state');
    
    let filteredNotes = notes;
    if (filterText) {
        filteredNotes = notes.filter(note => 
            note.title.toLowerCase().includes(filterText.toLowerCase()) ||
            note.content.toLowerCase().includes(filterText.toLowerCase()) ||
            note.tags.some(tag => tag.toLowerCase().includes(filterText.toLowerCase()))
        );
    }
    
    // 按时间倒序排序
    filteredNotes.sort((a, b) => b.timestamp - a.timestamp);
    
    if (filteredNotes.length === 0) {
        list.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    list.innerHTML = filteredNotes.map(note => `
        <div class="note-card bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer" onclick="showNoteDetail(${note.id})">
            <h3 class="font-semibold text-gray-900 mb-2 line-clamp-2">${escapeHtml(note.title)}</h3>
            <p class="text-gray-600 text-sm mb-3 line-clamp-2">${escapeHtml(note.content)}</p>
            <div class="flex flex-wrap gap-1 mb-2">
                ${note.tags.map(tag => `<span class="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">${escapeHtml(tag)}</span>`).join('')}
            </div>
            <div class="flex items-center justify-between text-xs text-gray-400">
                <span>${formatTime(note.timestamp)}</span>
                <span class="px-2 py-0.5 bg-gray-100 rounded">${escapeHtml(note.category)}</span>
            </div>
        </div>
    `).join('');
    
    // 更新统计
    document.getElementById('total-notes').textContent = `📝 ${notes.length} 篇笔记`;
    const allTags = new Set(notes.flatMap(n => n.tags));
    document.getElementById('total-tags').textContent = `🏷️ ${allTags.size} 个标签`;
}

// 搜索笔记
function searchNotes(text) {
    renderNotes(text);
}

// 打开添加页面
function openAddPage() {
    document.getElementById('add-note-page').classList.remove('hidden');
    document.getElementById('note-title').value = '';
    document.getElementById('note-content').value = '';
    document.getElementById('note-title').focus();
}

// 关闭添加页面
function closeAddPage() {
    document.getElementById('add-note-page').classList.add('hidden');
}

// 保存笔记
async function saveNote() {
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();
    
    if (!title || !content) {
        alert('请填写标题和内容');
        return;
    }
    
    const note = {
        id: Date.now(),
        title,
        content,
        timestamp: Date.now(),
        category: '未分类',
        tags: [],
        aiSummary: ''
    };
    
    notes.push(note);
    saveNotesToLocal();
    renderNotes();
    closeAddPage();
    
    // 提示用户可以使用 AI 整理
    setTimeout(() => {
        if (confirm('是否使用 AI 智能整理这篇笔记？（自动分类、打标签、生成摘要）')) {
            analyzeNoteWithAI(note.id);
        }
    }, 500);
}

// 使用 AI 分析
async function analyzeWithAI() {
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();
    
    if (!title || !content) {
        alert('请先填写标题和内容');
        return;
    }
    
    if (!apiKey) {
        alert('请先在设置中配置 API Key');
        showSettings();
        return;
    }
    
    // 显示加载状态
    document.getElementById('ai-analyze-btn').classList.add('hidden');
    document.getElementById('ai-loading').classList.remove('hidden');
    
    try {
        const result = await callQwenAPI(title, content);
        
        // 保存分析结果
        const note = {
            id: Date.now(),
            title,
            content,
            timestamp: Date.now(),
            category: result.category,
            tags: result.tags,
            aiSummary: result.summary
        };
        
        notes.push(note);
        saveNotesToLocal();
        renderNotes();
        closeAddPage();
        
        alert('✅ AI 整理完成！\n\n分类：' + result.category + '\n标签：' + result.tags.join(', ') + '\n摘要：' + result.summary);
    } catch (error) {
        alert('AI 分析失败：' + error.message);
    } finally {
        document.getElementById('ai-analyze-btn').classList.remove('hidden');
        document.getElementById('ai-loading').classList.add('hidden');
    }
}

// 对单篇笔记进行 AI 分析
async function analyzeNoteWithAI(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    if (!apiKey) {
        alert('请先在设置中配置 API Key');
        showSettings();
        return;
    }
    
    try {
        const result = await callQwenAPI(note.title, note.content);
        
        note.category = result.category;
        note.tags = result.tags;
        note.aiSummary = result.summary;
        
        saveNotesToLocal();
        renderNotes();
        
        alert('✅ AI 整理完成！');
    } catch (error) {
        alert('AI 分析失败：' + error.message);
    }
}

// 调用通义千问 API
async function callQwenAPI(title, content) {
    const prompt = `请分析以下笔记内容，返回 JSON 格式：
{
    "category": "分类（工作/学习/生活/灵感/其他）",
    "tags": ["标签 1", "标签 2", "标签 3"],
    "summary": "50 字以内的摘要"
}

笔记标题：${title}
笔记内容：${content}

只返回 JSON，不要其他内容。`;

    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'qwen3.5-plus',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        throw new Error('API 请求失败');
    }
    
    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    // 解析 JSON
    try {
        // 尝试提取 JSON 部分
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(aiResponse);
    } catch (e) {
        // 如果解析失败，返回默认值
        return {
            category: '未分类',
            tags: ['笔记'],
            summary: content.substring(0, 50) + '...'
        };
    }
}

// 显示笔记详情
function showNoteDetail(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    currentNoteId = noteId;
    
    document.getElementById('detail-title').textContent = note.title;
    document.getElementById('detail-content').textContent = note.content;
    
    // 渲染元信息
    const metaHtml = `
        <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">${note.category}</span>
        ${note.tags.map(tag => `<span class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">${escapeHtml(tag)}</span>`).join('')}
        <span class="text-gray-400 text-sm">${formatTime(note.timestamp)}</span>
    `;
    document.getElementById('detail-meta').innerHTML = metaHtml;
    
    // 显示 AI 摘要
    const summaryDiv = document.getElementById('detail-ai-summary');
    if (note.aiSummary) {
        document.getElementById('ai-summary-text').textContent = note.aiSummary;
        summaryDiv.classList.remove('hidden');
    } else {
        summaryDiv.classList.add('hidden');
    }
    
    document.getElementById('note-detail-page').classList.remove('hidden');
}

// 关闭详情页
function closeDetailPage() {
    document.getElementById('note-detail-page').classList.add('hidden');
    currentNoteId = null;
}

// 编辑当前笔记
function editCurrentNote() {
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;
    
    closeDetailPage();
    openAddPage();
    document.getElementById('note-title').value = note.title;
    document.getElementById('note-content').value = note.content;
    
    // 保存时更新而不是新建
    window.editingNoteId = currentNoteId;
    const saveBtn = document.querySelector('#add-note-page header button:last-child');
    saveBtn.textContent = '更新';
    saveBtn.onclick = updateNote;
}

// 更新笔记
function updateNote() {
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();
    
    if (!title || !content) {
        alert('请填写标题和内容');
        return;
    }
    
    const noteIndex = notes.findIndex(n => n.id === window.editingNoteId);
    if (noteIndex === -1) return;
    
    notes[noteIndex].title = title;
    notes[noteIndex].content = content;
    notes[noteIndex].timestamp = Date.now();
    
    saveNotesToLocal();
    renderNotes();
    closeAddPage();
    
    // 重置保存按钮
    const saveBtn = document.querySelector('#add-note-page header button:last-child');
    saveBtn.textContent = '保存';
    saveBtn.onclick = saveNote;
    window.editingNoteId = null;
}

// 删除当前笔记
function deleteCurrentNote() {
    if (!confirm('确定要删除这篇笔记吗？')) return;
    
    notes = notes.filter(n => n.id !== currentNoteId);
    saveNotesToLocal();
    renderNotes();
    closeDetailPage();
}

// 显示设置
function showSettings() {
    document.getElementById('settings-page').classList.remove('hidden');
    document.getElementById('api-key-input').value = apiKey;
    document.getElementById('stats-total').textContent = notes.length;
}

// 关闭设置
function closeSettings() {
    document.getElementById('settings-page').classList.add('hidden');
}

// 保存 API Key
function saveApiKey() {
    const key = document.getElementById('api-key-input').value.trim();
    if (key) {
        apiKey = key;
        localStorage.setItem('qwen_api_key', key);
        alert('API Key 已保存！');
        closeSettings();
    }
}

// 导出数据
function exportData() {
    const data = JSON.stringify(notes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge-notes-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// 清空所有数据
function clearAllData() {
    if (!confirm('确定要清空所有笔记吗？此操作不可恢复！')) return;
    notes = [];
    saveNotesToLocal();
    renderNotes();
    closeSettings();
}

// 显示统计
function showStats() {
    const categoryStats = {};
    notes.forEach(note => {
        categoryStats[note.category] = (categoryStats[note.category] || 0) + 1;
    });
    
    let statsHtml = '<div class="p-4"><h2 class="text-xl font-bold mb-4">📊 统计</h2>';
    statsHtml += '<div class="space-y-3">';
    statsHtml += `<div class="bg-white rounded-xl p-4"><p class="text-gray-600">总笔记数</p><p class="text-2xl font-bold text-indigo-600">${notes.length}</p></div>`;
    
    Object.entries(categoryStats).forEach(([cat, count]) => {
        statsHtml += `<div class="bg-white rounded-xl p-4"><p class="text-gray-600">${cat}</p><p class="text-xl font-semibold">${count} 篇</p></div>`;
    });
    
    statsHtml += '</div></div>';
    
    // 简单显示在设置页
    showSettings();
    document.querySelector('#settings-page .space-y-4').insertAdjacentHTML('afterbegin', statsHtml);
}

// 显示首页
function showHome() {
    closeAddPage();
    closeDetailPage();
    closeSettings();
}

// 更新统计
function updateStats() {
    // 已在 renderNotes 中更新
}

// 工具函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    
    return date.toLocaleDateString('zh-CN');
}

// 注册 Service Worker（PWA）
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {
            console.log('Service Worker 注册失败');
        });
    }
}
