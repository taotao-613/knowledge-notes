// 闪念笔记 - 手机端知识管理应用

// 数据存储
let notes = [];
let apiKey = localStorage.getItem('qwen_api_key') || '';
let currentNoteId = null;

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
