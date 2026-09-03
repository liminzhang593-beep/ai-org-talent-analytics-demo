import React, { useState } from 'react';
import { Card, Tabs, Button, message, Space } from 'antd';
import ReactECharts from 'echarts-for-react';

// 7大主题定义
const THEMES = [
  { key: 'job_match', label: '人岗匹配' },
  { key: 'ability_eval', label: '人才能力评估' },
  { key: 'org_diag', label: '组织结构诊断与优化' },
  { key: 'talent_pool', label: '人才盘点与继任梯队建设' },
  { key: 'org_health', label: '组织健康与氛围监测' },
  { key: 'change_eval', label: '变革影响评估与能力画像' },
  { key: 'strategy_forecast', label: '战略人力预测与D&I诊断' },
];

// 每个主题的mock数据和图表option、AI解读模板
const THEME_DEMOS = {
  job_match: {
    charts: [
      {
        title: '岗位胜任度分布',
        option: {
          xAxis: { type: 'category', data: ['高匹配', '中匹配', '低匹配'] },
          yAxis: { type: 'value' },
          series: [{ data: [32, 18, 5], type: 'bar', itemStyle: { color: '#409eff' } }],
          title: { text: '岗位胜任度分布', left: 'center' },
        },
        ai: data => `高匹配员工${data[0]}人，占比${Math.round(data[0]/(data[0]+data[1]+data[2])*100)}%。建议关注低匹配员工的能力提升。`
      }
    ]
  },
  ability_eval: {
    charts: [
      {
        title: '能力维度雷达图',
        option: {
          radar: {
            indicator: [
              { name: '专业能力', max: 100 },
              { name: '沟通协作', max: 100 },
              { name: '创新力', max: 100 },
              { name: '执行力', max: 100 },
              { name: '学习力', max: 100 }
            ]
          },
          series: [{
            type: 'radar',
            data: [{ value: [85, 78, 66, 90, 72], name: '均分' }],
            areaStyle: { opacity: 0.2 }
          }],
          title: { text: '能力维度雷达图', left: 'center' },
        },
        ai: data => `团队整体在执行力和专业能力上表现突出，创新力相对薄弱。建议加强创新相关培训。`
      }
    ]
  },
  org_diag: {
    charts: [
      {
        title: '组织结构分布',
        option: {
          series: [{
            type: 'pie',
            data: [
              { value: 20, name: '管理层' },
              { value: 35, name: '技术岗' },
              { value: 25, name: '业务岗' },
              { value: 10, name: '支持岗' }
            ],
            radius: ['40%', '70%'],
            label: { show: true, formatter: '{b}: {d}%' }
          }],
          title: { text: '组织结构分布', left: 'center' },
        },
        ai: data => `技术岗占比最高，管理层比例适中，组织结构较为合理。建议关注业务岗与支持岗的协同。`
      }
    ]
  },
  talent_pool: {
    charts: [
      {
        title: '九宫格人才盘点',
        option: {
          xAxis: { type: 'category', data: ['高绩效', '中绩效', '低绩效'] },
          yAxis: { type: 'category', data: ['高潜力', '中潜力', '低潜力'] },
          series: [{
            type: 'heatmap',
            data: [
              [0,0,3],[1,0,2],[2,0,1],
              [0,1,4],[1,1,6],[2,1,2],
              [0,2,1],[1,2,2],[2,2,1]
            ],
            label: { show: true },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } }
          }],
          visualMap: { min: 0, max: 6, calculable: true, orient: 'vertical', right: 0, top: 'center' },
          title: { text: '九宫格人才盘点', left: 'center' },
        },
        ai: data => `高绩效高潜力人才共3人，建议重点培养。中绩效中潜力为主力军，低绩效低潜力需关注。`
      }
    ]
  },
  org_health: {
    charts: [
      {
        title: '敬业度趋势',
        option: {
          xAxis: { type: 'category', data: ['1月','2月','3月','4月','5月'] },
          yAxis: { type: 'value' },
          series: [{ data: [78, 80, 76, 82, 85], type: 'line', smooth: true, areaStyle: {} }],
          title: { text: '敬业度趋势', left: 'center' },
        },
        ai: data => `本季度敬业度整体上升，5月达到高点85分，团队氛围持续改善。`
      }
    ]
  },
  change_eval: {
    charts: [
      {
        title: '变革影响力雷达',
        option: {
          radar: {
            indicator: [
              { name: '适应力', max: 100 },
              { name: '创新力', max: 100 },
              { name: '沟通力', max: 100 },
              { name: '执行力', max: 100 },
              { name: '抗压性', max: 100 }
            ]
          },
          series: [{
            type: 'radar',
            data: [{ value: [70, 65, 80, 75, 68], name: '均分' }],
            areaStyle: { opacity: 0.2 }
          }],
          title: { text: '变革影响力雷达', left: 'center' },
        },
        ai: data => `团队在沟通力和执行力方面变革适应较好，创新力和抗压性有提升空间。`
      }
    ]
  },
  strategy_forecast: {
    charts: [
      {
        title: 'D&I多样性分布',
        option: {
          xAxis: { type: 'category', data: ['女性', '男性', '90后', '80后', '70后', '少数民族'] },
          yAxis: { type: 'value' },
          series: [{ data: [22, 33, 18, 20, 10, 5], type: 'bar', itemStyle: { color: '#faad14' } }],
          title: { text: 'D&I多样性分布', left: 'center' },
        },
        ai: data => `团队性别和年龄结构多样，90后占比逐步提升，D&I表现良好。`
      }
    ]
  }
};

// AI一键综合分析（前端模拟，预留真实AI接口扩展点）
function getAIReport(themeKey) {
  // 真实AI接口扩展点：
  // 可将charts数据打包，POST到后端AI接口，返回AI生成的解读
  // 如需接入真实AI，只需替换下方逻辑为API调用
  const charts = THEME_DEMOS[themeKey]?.charts || [];
  let report = `【${THEMES.find(t=>t.key===themeKey)?.label}】AI综合分析：\n`;
  charts.forEach((c, i) => {
    report += `\n${i+1}. ${c.title}：${c.ai && c.option ? c.ai(c.option.series?.[0]?.data || c.option.series?.[0]?.value || []) : ''}`;
  });
  report += '\n\n（本解读为演示用，后续可接入真实AI分析）';
  return report;
}

export default function AIBIChartsPage() {
  const [theme, setTheme] = useState(THEMES[0].key);
  const [aiReport, setAiReport] = useState('');

  const charts = THEME_DEMOS[theme]?.charts || [];

  const handleAIAnalyze = () => {
    // 预留AI接口扩展点
    setAiReport(getAIReport(theme));
  };

  const handleExport = () => {
    if (!aiReport) {
      message.info('请先生成AI综合分析');
      return;
    }
    // 导出为txt（可扩展为PDF/Markdown）
    const blob = new Blob([aiReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${theme}_AI分析.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '40px auto', padding: 32, background: 'linear-gradient(180deg, #e9eaff 0%, #f7f3ff 100%)', borderRadius: 24, boxShadow: '0 4px 32px #e9eaff80' }}>
      <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 24, color: '#222' }}>图表展示（AI+BI Demo）</h2>
      <Tabs activeKey={theme} onChange={setTheme} style={{ marginBottom: 32 }}>
        {THEMES.map(t => <Tabs.TabPane tab={t.label} key={t.key} />)}
      </Tabs>
      <Space direction="vertical" size={32} style={{ width: '100%' }}>
        {charts.map((c, idx) => (
          <Card key={idx} bordered={false} style={{ borderRadius: 16, boxShadow: '0 2px 12px #e9eaff40', marginBottom: 24 }}>
            <div style={{ fontWeight: 600, fontSize: 20, marginBottom: 12 }}>{c.title}</div>
            <div style={{ width: '100%', minHeight: 360 }}>
              <ReactECharts
                key={theme + '-' + idx}
                option={JSON.parse(JSON.stringify(c.option))}
                style={{ height: 360, width: '100%' }}
              />
            </div>
            <div style={{ background: '#f7f3ff', borderRadius: 8, padding: '12px 18px', marginTop: 18, color: '#9254de', fontSize: 16, fontWeight: 500 }}>
              <span style={{ marginRight: 8 }}>AI解读：</span>
              {c.ai && c.option ? c.ai(c.option.series?.[0]?.data || c.option.series?.[0]?.value || []) : '暂无解读'}
            </div>
          </Card>
        ))}
      </Space>
      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <Button type="primary" size="large" style={{ borderRadius: 12, fontWeight: 600, marginRight: 16 }} onClick={handleAIAnalyze}>AI一键综合分析</Button>
        <Button size="large" style={{ borderRadius: 12, fontWeight: 600 }} onClick={handleExport}>导出AI分析报告</Button>
      </div>
      {aiReport && (
        <Card style={{ marginTop: 32, borderRadius: 16, background: '#f7f3ff' }}>
          <div style={{ fontWeight: 600, fontSize: 18, color: '#222', marginBottom: 8 }}>AI综合分析报告</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 16, color: '#333', background: 'none', border: 'none', margin: 0 }}>{aiReport}</pre>
        </Card>
      )}
    </div>
  );
} 