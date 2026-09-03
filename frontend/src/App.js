import React, { useState } from 'react';
import { Layout, Menu, Tabs, Card, Button } from 'antd';
import {
  ImportOutlined, ThunderboltOutlined, BarChartOutlined, FileTextOutlined,
  QuestionCircleOutlined, HistoryOutlined, InfoCircleOutlined, SettingOutlined, ApiOutlined
} from '@ant-design/icons';
import { Link, Routes, Route, BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import IndustryTemplateConfig from './IndustryTemplateConfig';
import AnalyzePage from './AnalyzePage';
import LlmConfigPage from './LlmConfigPage';
import SmartQA from './SmartQA';
import DataImport from './DataImport';
import AIBIChartsPage from './ChartsPage';
import PromptConfigPage from './PromptConfigPage';
import 'antd/dist/antd.css';

// 其它功能页面
function ImportPage() { return <h2>数据导入页面</h2>; }
// 原本地占位页面，已被AI+BI Demo页面替换，如需恢复可用LocalChartsPage
function LocalChartsPage() { return <h2>图表展示页面</h2>; }
function ReportPage() { return <h2>报告下载页面</h2>; }
function HistoryPage() { return <h2>历史记录页面</h2>; }
function AboutPage() { return <h2>产品知识页面</h2>; }
function Home() {
  return (
    <main style={{flex: 1, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 32}}>
      <h2>欢迎使用AI组织及人才分析平台</h2>
      <p>本平台支持团队数据导入、智能分析、可视化图表、报告下载、智能问答等功能，助力企业科学管理与人才发展。</p>
      <div style={{margin: '32px 0'}}>
        <Link to="/import"><button style={{marginRight: 16, padding: '8px 24px'}}>上传数据</button></Link>
        <Link to="/analyze"><button style={{marginRight: 16, padding: '8px 24px'}}>一键分析</button></Link>
        <Link to="/report"><button style={{padding: '8px 24px'}}>下载报告</button></Link>
      </div>
      <div style={{margin: '32px 0'}}>
        <h3>团队分析可视化</h3>
        <Link to="/charts">
          <img src="https://www.chartjs.org/img/chartjs-logo.svg" alt="图表示例" style={{width: 400, background: '#eee', padding: 16, borderRadius: 8, cursor: 'pointer'}} />
        </Link>
      </div>
      <div>
        <h3>智能问答</h3>
        <Link to="/qa"><button style={{padding: '8px 16px'}}>进入智能问答</button></Link>
      </div>
    </main>
  );
}

const { Sider, Content } = Layout;

const menuItems = [
  { key: '/qa', icon: <QuestionCircleOutlined />, label: '智能问答' },
  { key: '/analyze', icon: <ThunderboltOutlined />, label: '一键分析' },
  { key: '/history', icon: <HistoryOutlined />, label: '历史记录' },
  { key: '/charts', icon: <BarChartOutlined />, label: '图表展示' },
  { key: 'divider' },
  { key: '/ability-config', icon: <SettingOutlined />, label: '能力模型配置' },
  { key: '/llm-config', icon: <ApiOutlined />, label: '大模型接入配置' },
  { key: '/import', icon: <ImportOutlined />, label: '数据接入配置' },
];

const featureCards = [
  { key: '/qa', icon: <QuestionCircleOutlined style={{fontSize: 32, color: '#9254de'}} />, title: '智能问答', desc: 'AI助手随时解答你的业务与数据问题' },
  { key: '/analyze', icon: <ThunderboltOutlined style={{fontSize: 32, color: '#409eff'}} />, title: '一键分析', desc: '智能分析团队能力，生成可视化报告' },
  { key: '/charts', icon: <BarChartOutlined style={{fontSize: 32, color: '#faad14'}} />, title: '图表展示', desc: '可视化团队分析结果' },
];
const configCards = [
  { key: '/ability-config', icon: <SettingOutlined style={{fontSize: 32, color: '#9254de'}} />, title: '能力模型配置', desc: '自定义能力模型与评估维度' },
  { key: '/llm-config', icon: <ApiOutlined style={{fontSize: 32, color: '#409eff'}} />, title: '大模型接入配置', desc: '配置和管理大模型接入' },
  { key: '/prompt-config', icon: <FileTextOutlined style={{fontSize: 32, color: '#52c41a'}} />, title: 'Prompt配置', desc: '配置智能问答的默认行为和模板' },
  { key: '/import', icon: <ImportOutlined style={{fontSize: 32, color: '#13c2c2'}} />, title: '数据接入配置', desc: '导入团队数据，支持多种格式' },
];

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const [tab, setTab] = useState('feature');
  const navigate = useNavigate();

  function logout() {
    // 可自定义退出逻辑
    window.location.href = '/login';
  }

  const isHome = location.pathname === '/';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f0f7ff 0%, #f7f3ff 100%)' }}>
      {/* 顶部logo+标题+用户区 横向布局 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72, background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 48px' }}>
        {/* 左侧 logo+标题 */}
        <div
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          <img src="/vaiark.png" alt="logo" style={{ height: 40, marginRight: 16 }} />
          <span style={{ fontWeight: 700, fontSize: 26, color: '#222' }}>AI 组织及人才分析生成器</span>
        </div>
        {/* 右侧 头像+退出 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* SVG头像 */}
          <span style={{ width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#eee' }}>
            <svg width="28" height="28" viewBox="0 0 1024 1024" fill="#bfbfbf"><circle cx="512" cy="320" r="160"/><ellipse cx="512" cy="760" rx="240" ry="120"/></svg>
          </span>
          <span style={{ cursor: 'pointer', color: '#9254de', fontWeight: 500 }} onClick={logout}>退出</span>
        </div>
      </div>
      {/* 只在首页显示欢迎语和介绍 */}
      {isHome && (
        <div style={{ width: '100%', textAlign: 'center', margin: '48px 0 32px 0' }}>
          <h1 style={{ fontWeight: 800, fontSize: 32, color: '#222', marginBottom: 12 }}>
            欢迎使用AI组织及人才分析生成器
          </h1>
          <div style={{ fontSize: 22, color: '#888', fontWeight: 400 }}>
            本平台支持团队数据导入、智能分析、可视化图表、报告下载、智能问答等功能，助力企业科学管理与人才发展。
          </div>
        </div>
      )}
      {/* 只在首页显示Tabs和卡片区 */}
      {isHome && (
        <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto', paddingTop: 0 }}>
          <Tabs activeKey={tab} onChange={setTab} centered size="large" style={{ background: 'transparent', marginBottom: 32 }}>
            <Tabs.TabPane tab="功能" key="feature" />
            <Tabs.TabPane tab="配置" key="config" />
          </Tabs>
          {/* 功能/配置卡片区 */}
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', marginTop: 32 }}>
            {(tab === 'feature' ? featureCards : configCards).map(card => (
              <Card
                key={card.key}
                hoverable
                style={{
                  width: 300,
                  borderRadius: 16,
                  boxShadow: '0 4px 24px #e9eaff40',
                  textAlign: 'center',
                  background: '#fff',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                }}
                bodyStyle={{ paddingBottom: 32 }}
                onClick={() => navigate(card.key)}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 8px 32px #b39ddb40';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  const tip = e.currentTarget.querySelector('.card-tip');
                  if (tip) tip.style.opacity = 1;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 4px 24px #e9eaff40';
                  e.currentTarget.style.transform = 'none';
                  const tip = e.currentTarget.querySelector('.card-tip');
                  if (tip) tip.style.opacity = 0;
                }}
              >
                <div style={{ marginBottom: 16 }}>{card.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>{card.title}</div>
                <div style={{ color: '#888', fontSize: 16, minHeight: 40 }}>{card.desc}</div>
                {/* 悬浮提示 */}
                <div className="card-tip" style={{
                  position: 'absolute',
                  right: 18,
                  bottom: 12,
                  fontSize: 14,
                  color: '#9254de',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}>
                  <span style={{marginRight: 4}}>点击进入</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9254de" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      {/* 路由出口 */}
      <Routes>
        <Route path="/qa" element={<SmartQA />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/history" element={<AnalyzePage historyOnly />} />
        <Route path="/charts" element={<AIBIChartsPage />} />
        <Route path="/ability-config" element={<IndustryTemplateConfig />} />
        <Route path="/llm-config" element={<LlmConfigPage />} />
        <Route path="/import" element={<DataImport />} />
        <Route path="/prompt-config" element={<PromptConfigPage />} />
      </Routes>
    </div>
  );
}
