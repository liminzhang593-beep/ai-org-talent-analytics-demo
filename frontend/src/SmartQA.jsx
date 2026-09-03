import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Card, Spin, message, Dropdown, Menu, Tooltip, Upload } from 'antd';
import { 
  SendOutlined, 
  DownOutlined, 
  PlusOutlined, 
  UploadOutlined, 
  RedoOutlined, 
  BarChartOutlined 
} from '@ant-design/icons';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ReactECharts from 'echarts-for-react';

// --- 样式定义 (Styles) ---
const Wrapper = styled.div`
  max-width: 900px;
  width: 100%;
  margin: 40px auto;
  padding: 32px;
  border-radius: 24px;
  background: linear-gradient(180deg, #e9eaff 0%, #f7f3ff 100%);
  box-shadow: 0 4px 32px #e9eaff80;
`;

const BrandBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
`;

const Logo = styled.img`
  height: 40px;
  width: 40px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 8px #e9eaff80;
  object-fit: cover;
`;

const Title = styled.span`
  font-weight: 700;
  font-size: 24px;
  color: #222;
  letter-spacing: 2px;
`;

const CardBg = styled(Card)`
  border-radius: 20px;
  background: linear-gradient(135deg, #f7f3ff 60%, #e9eaff 100%);
  box-shadow: 0 4px 24px 0 rgba(0,0,0,0.06);
  padding: 0;
`;

const ChatArea = styled.div`
  min-height: 320px;
  max-height: 50vh;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
`;

const BubbleRow = styled.div`
  display: flex;
  justify-content: ${props => props.role === 'user' ? 'flex-end' : 'flex-start'};
  margin-bottom: 16px;
`;

const Bubble = styled.div`
  background: ${props => props.role === 'user' ? 'linear-gradient(90deg, #e9eaff 0%, #c6e2ff 100%)' : 'linear-gradient(90deg, #fff 0%, #f7f3ff 100%)'};
  border-radius: 16px;
  padding: 12px 20px;
  max-width: 90%;
  color: #222;
  font-size: 16px;
  box-shadow: 0 2px 8px 0 rgba(24,144,255,0.04);
  word-break: break-word;
`;

const InputSection = styled.div`
  padding: 16px 24px;
  border-top: 1px solid #e8e8e8;
  display: flex;
  align-items: flex-end;
  gap: 12px;
`;

const InputComposer = styled.div`
  flex: 1;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #d9d9d9;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
  
  &:hover, &:focus-within {
    border-color: #40a9ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
`;

const StyledTextArea = styled(Input.TextArea)`
  &.ant-input {
    padding: 4px 0;
    border: none;
    box-shadow: none;
    resize: none;
  }
`;

const ActionToolbar = styled.div`
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

// --- 核心组件 (Core Component) ---

// --- ECharts option 修正工具函数 ---
function fixEchartsOption(option) {
  if (!option || !option.series) return option;
  // 深拷贝，避免污染原对象
  let fixed = JSON.parse(JSON.stringify(option));
  fixed.series = fixed.series.map(ser => {
    // 只处理柱状图/折线图/条形图
    if ((ser.type === 'bar' || ser.type === 'line') && Array.isArray(ser.data)) {
      ser.data = ser.data.map(val => {
        if (typeof val === 'object' && val !== null && val.value !== undefined) {
          // 已有itemStyle
          return val;
        }
        // 负数红色，正数绿色
        return {
          value: val,
          itemStyle: { color: val >= 0 ? '#36a362' : '#e06262' }
        };
      });
      // 移除 itemStyle.color function
      if (ser.itemStyle && typeof ser.itemStyle.color === 'function') {
        delete ser.itemStyle.color;
      }
    }
    return ser;
  });
  return fixed;
}

// --- Markdown表格转ECharts option工具函数 ---
function markdownTableToOption(md) {
  // 简单解析Markdown表格为二维数组
  const lines = md.split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 2) return null;
  const header = lines[0].split('|').map(s => s.trim()).filter(Boolean);
  const rows = lines.slice(2).map(l => l.split('|').map(s => s.trim()).filter(Boolean));
  if (header.length < 2 || rows.length === 0) return null;
  // 默认第一列为x轴，第二列为y轴
  const xData = rows.map(r => r[0]);
  const yData = rows.map(r => parseFloat(r[1]));
  if (yData.some(isNaN)) return null;
  return {
    title: { text: `${header[0]} vs ${header[1]}（自动生成）`, left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: xData },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: yData, itemStyle: { color: '#409eff' } }],
    grid: { bottom: '20%' }
  };
}

export default function SmartQA() {
  // --- 状态管理 (State Management) ---
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([
    { id: 'initial-message', role: "ai", content: "你好，我是你的数据助手，有什么可以帮您？" }
  ]);
  const [sending, setSending] = useState(false);
  const [modelList, setModelList] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedModelName, setSelectedModelName] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState({});
  const chatEndRef = useRef(null);
  // --- 新增：多轮追问补图表 ---
  const [pendingChartRequest, setPendingChartRequest] = useState(null);

  // --- 副作用 (Side Effects) ---

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 获取模型列表
  useEffect(() => {
    fetch("/api/llm-configs")
      .then(res => res.json())
      .then(data => {
        const models = Array.isArray(data.data) ? data.data : [];
        setModelList(models);
        if (models.length > 0) {
          setSelectedModel(models[0].id);
          setSelectedModelName(models[0].name || models[0].model_name);
        }
      }).catch(() => message.error("获取模型列表失败"));
  }, []);

  // --- 事件处理 (Event Handlers) ---

  const handleNewChat = () => {
    setMessages([{ id: 'initial-message', role: "ai", content: "你好，我是你的数据助手，有什么可以帮您？" }]);
    setInputValue("");
  };

  const handleRetry = () => {
    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
    if (lastUserMessage) {
      setInputValue(lastUserMessage.content);
    } else {
      message.error('没有可以重试的消息。');
    }
  };

  const uploadProps = {
    name: 'file',
    action: '/api/upload',
    showUploadList: false,
    onChange(info) {
      if (info.file.status === 'uploading') {
        if (!sending) setSending(true);
      } else {
        if (sending) setSending(false);
      }

      if (info.file.status === 'done') {
        message.success(`${info.file.name} 上传成功`);
        const { file_id, filename } = info.file.response;
        if (file_id && filename) {
          setUploadedFiles(prev => ({...prev, [filename]: file_id}));
          setInputValue(prev => `${prev} [已上传文件: ${filename}]`.trim());
        }
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 上传失败。`);
      }
    },
  };

  const handleModelSelect = ({ key }) => {
    const model = modelList.find(m => String(m.id) === String(key));
    if (model) {
      setSelectedModel(model.id);
      setSelectedModelName(model.name || model.model_name);
    }
  };

  const handleSend = async () => {
    const userQuestion = inputValue.trim();
    if (!userQuestion || sending) return;
    setSending(true);
    // 先插入用户消息和一个空AI消息
    const newUserMessage = { 
      id: Date.now() + '-user', 
      role: 'user', 
      content: userQuestion 
    };
    const newAiMessage = {
      id: Date.now() + '-ai',
      role: 'ai',
      content: '',
      chart: null
    };
    setMessages(prev => [...prev, newUserMessage, newAiMessage]);
    setInputValue('');
    try {
      // 智能提取 file_ids（支持多文件）
      let fileIdsToSend = [];
      const fileMatches = [...userQuestion.matchAll(/\[已上传文件: (.*?)\]/g)];
      if (fileMatches.length > 0) {
        fileIdsToSend = fileMatches.map(m => uploadedFiles[m[1]]).filter(Boolean);
      } else {
        fileIdsToSend = Object.values(uploadedFiles);
      }
      const payload = {
        question: userQuestion,
        model_id: selectedModel,
        file_ids: fileIdsToSend,
      };
      // --- 流式请求 ---
      const res = await fetch('/api/qa/stream', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.body) throw new Error('流式响应失败');
      const reader = res.body.getReader();
      let result = '';
      let chartJson = null;
      let done = false;
      let firstTokenTime = null;
      let firstTokenDelay = null;
      const startTime = Date.now();
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = new TextDecoder().decode(value);
          chunk.split('\n').forEach(line => {
            if (line.startsWith('data:')) {
              try {
                const json = JSON.parse(line.replace('data:', '').trim());
                const delta = json.choices?.[0]?.delta;
                if (delta && typeof delta.content === 'string') {
                  if (!firstTokenTime) {
                    firstTokenTime = Date.now();
                    firstTokenDelay = (firstTokenTime - startTime) / 1000;
                  }
                  result += delta.content;
                }
                const chartMatch = result.match(/```json[\s\n]*({[\s\S]*?})[\s\n]*```/);
                if (chartMatch) {
                  try {
                    chartJson = JSON.parse(chartMatch[1]);
                  } catch {}
                }
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: result, chart: chartJson, firstTokenDelay };
                  return newMsgs;
                });
              } catch {}
            }
          });
        }
      }
    } catch (err) {
      message.error(err.message || "请求失败，请检查网络和后端服务。\n(流式)");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // --- 新增：多轮追问补图表 ---
  const handleAskForChart = async (msg) => {
    setSending(true);
    try {
      let fileIdsToSend = Object.values(uploadedFiles);
      const payload = {
        question: msg.content + '\n请只输出ECharts option JSON，禁止输出Python、matplotlib、图片链接等。',
        model_id: selectedModel,
        file_ids: fileIdsToSend,
      };
      const res = await fetch('/api/qa/stream', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.body) throw new Error('流式响应失败');
      const reader = res.body.getReader();
      let result = '';
      let chartJson = null;
      let done = false;
      let firstTokenTime = null;
      let firstTokenDelay = null;
      const startTime = Date.now();
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = new TextDecoder().decode(value);
          chunk.split('\n').forEach(line => {
            if (line.startsWith('data:')) {
              try {
                const json = JSON.parse(line.replace('data:', '').trim());
                const delta = json.choices?.[0]?.delta;
                if (delta && typeof delta.content === 'string') {
                  if (!firstTokenTime) {
                    firstTokenTime = Date.now();
                    firstTokenDelay = (firstTokenTime - startTime) / 1000;
                  }
                  result += delta.content;
                }
                const chartMatch = result.match(/```json[\s\n]*({[\s\S]*?})[\s\n]*```/);
                if (chartMatch) {
                  try {
                    chartJson = JSON.parse(chartMatch[1]);
                  } catch {}
                }
              } catch {}
            }
          });
        }
      }
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs.push({ id: Date.now() + '-ai', role: 'ai', content: result, chart: chartJson });
        return newMsgs;
      });
    } catch (err) {
      message.error(err.message || "请求失败，请检查网络和后端服务。\n(流式)");
    } finally {
      setSending(false);
      setPendingChartRequest(null);
    }
  };

  // --- 渲染 (Render) ---

  const modelMenu = (
    <Menu selectedKeys={selectedModel ? [String(selectedModel)] : []} onClick={handleModelSelect}>
      {modelList.length > 0 ? (
        modelList.map(m => (
          <Menu.Item key={m.id}>
            {m.name || m.model_name || m.id}
          </Menu.Item>
        ))
      ) : (
        <Menu.Item disabled>暂无可用模型</Menu.Item>
      )}
    </Menu>
  );

  function renderMessage(msg) {
    
    if (msg.chart && typeof msg.chart === 'object' && Object.keys(msg.chart).length > 0) {
      const fixedOption = fixEchartsOption(msg.chart);
      return (
        <>
          <ReactECharts option={fixedOption} style={{ minHeight: 320 }} />
          {msg.content && <div style={{marginTop: 16}}>{msg.content}</div>}
        </>
      );
    }
    // 检测Markdown表格并自动转为ECharts option
    if (msg.content && msg.content.includes('|') && msg.content.includes('\n|')) {
      const option = markdownTableToOption(msg.content);
      if (option) {
        return (
          <>
            <ReactECharts option={option} style={{ minHeight: 320 }} />
            <div style={{marginTop: 16, color:'#888'}}>（表格已自动转为图表）</div>
            <ReactMarkdown children={msg.content} remarkPlugins={[remarkGfm]} />
          </>
        );
      }
    }
    // 兜底：如果AI返回内容中包含"option"或"matplotlib"等代码块但没有chart，提示用户并可一键补图表
    if (msg.content && /matplotlib|plt\.|option|json|python|chart|图表|可视化/.test(msg.content)) {
      return (
        <>
          <div style={{color:'#faad14',fontWeight:500,marginBottom:8}}>
            ⚠️ 未检测到可用的 ECharts 图表配置。
            <Button size="small" style={{marginLeft:8}} onClick={()=>handleAskForChart(msg)} disabled={sending}>补充图表</Button>
          </div>
          <ReactMarkdown children={msg.content} remarkPlugins={[remarkGfm]} />
        </>
      );
    }
    return <ReactMarkdown children={msg.content} remarkPlugins={[remarkGfm]} />;
  }

  return (
    <Wrapper>
      <BrandBar>
        <Logo src="/logo.png" alt="logo" />
        <Title>智能数据互动</Title>
      </BrandBar>

      <CardBg bordered={false}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, padding: '16px 24px' }}>
          <Dropdown overlay={modelMenu} disabled={modelList.length === 0}>
            <Button>
              {selectedModelName || "选择模型"} <DownOutlined />
            </Button>
          </Dropdown>
        </div>

        <ChatArea>
          {messages.map((msg, idx) => (
            <BubbleRow key={msg.id} role={msg.role}>
              <Bubble role={msg.role}>
                {renderMessage(msg)}
              </Bubble>
            </BubbleRow>
          ))}
          <div ref={chatEndRef} />
        </ChatArea>

        <InputSection>
          <InputComposer>
            <StyledTextArea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="输入您的问题..."
              autoSize={{ minRows: 1, maxRows: 6 }}
              disabled={sending}
            />
            <ActionToolbar>
              <Tooltip title="新会话">
                <Button type="text" shape="circle" icon={<PlusOutlined />} onClick={handleNewChat} />
              </Tooltip>
              <Upload {...uploadProps}>
                <Tooltip title="上传附件">
                  <Button type="text" shape="circle" icon={<UploadOutlined />} loading={sending} />
                </Tooltip>
              </Upload>
              <Tooltip title="重试上次问题">
                <Button type="text" shape="circle" icon={<RedoOutlined />} onClick={handleRetry} />
              </Tooltip>
              <Tooltip title="插入图表请求">
                <Button type="text" shape="circle" icon={<BarChartOutlined />} onClick={() => setInputValue('请基于当前数据生成合适的图表')} />
              </Tooltip>
            </ActionToolbar>
          </InputComposer>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={sending}
            disabled={!inputValue.trim() || sending}
            style={{ borderRadius: '50%', width: 48, height: 48 }}
          />
        </InputSection>
      </CardBg>
    </Wrapper>
  );
}