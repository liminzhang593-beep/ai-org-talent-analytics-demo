import React, { useEffect, useState } from "react";
import { Card, Select, Upload, Button, message, Table, Descriptions, Spin, Form, Radio } from "antd";
import { UploadOutlined } from '@ant-design/icons';
import axios from "axios";
import * as XLSX from 'xlsx';
import ReactMarkdown from 'react-markdown';
import 'antd/dist/antd.css';

const API_BASE = "/api";

export default function AnalyzePage({ historyOnly = false }) {
  const [templates, setTemplates] = useState([]);
  const [models, setModels] = useState([]);
  const [industry, setIndustry] = useState("");
  const [company, setCompany] = useState("");
  const [file, setFile] = useState(null);
  const [excelData, setExcelData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [useCursor, setUseCursor] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 获取所有行业+企业模板
  useEffect(() => {
    if (historyOnly) {
      setHistoryLoading(true);
      axios.get(`${API_BASE}/history`).then(res => {
        if (res.data.success) {
          setHistoryRecords(Array.isArray(res.data.data) ? res.data.data : []);
        }
      }).catch(() => {
        message.error("获取历史记录失败");
      }).finally(() => {
        setHistoryLoading(false);
      });
      return;
    }
    axios.get(`${API_BASE}/industry_templates`).then(res => {
      if (res.data.success) {
        setTemplates(res.data.data);
      }
    });
    axios.get(`${API_BASE}/llm-configs`).then(res => {
      const allModels = Array.isArray(res.data.data) ? res.data.data : [];
      const enabledModels = allModels.filter(model => model.enabled);
      const availableModels = enabledModels.length > 0 ? enabledModels : allModels;
      setModels(availableModels);
      if (availableModels.length > 0) {
        setSelectedModel(availableModels[0].id);
      }
    }).catch(() => {
      message.error("获取模型列表失败");
    });
  }, [historyOnly]);

  // 行业下拉选项
  const industryOptions = [...new Set(templates.map(t => t.industry))].map(i => ({ label: i, value: i }));
  // 企业下拉选项
  const companyOptions = templates.filter(t => t.industry === industry).map(t => ({ label: t.company, value: t.company }));

  // 选择文件
  const beforeUpload = file => {
    setFile(file);
    // 解析Excel
    if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
       
        const json = XLSX.utils.sheet_to_json(worksheet);
        setExcelData(json);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setExcelData(null);
    }
    setFileName(file.name);
    return false;
  };

  // 一键分析
  const handleAnalyze = async () => {
    if (!industry || !company) {
      message.warning("请选择行业和企业模板");
      return;
    }
    if (!file) {
      message.warning("请上传员工数据文件");
      return;
    }
    setAnalyzing(true);
    try {
      let staff_list = [];
      if (file.name.endsWith('.json')) {
        // 读取JSON
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            staff_list = JSON.parse(e.target.result);
            await doAnalyze(staff_list);
          } catch {
            message.error("数据文件格式错误");
            setAnalyzing(false);
          }
        };
        reader.readAsText(file);
        return;
      } else if (file.name.endsWith('.csv')) {
        // 读取CSV
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const lines = e.target.result.split('\n').filter(Boolean);
            const headers = lines[0].split(',');
            staff_list = lines.slice(1).map(line => {
              const values = line.split(',');
              const obj = {};
              headers.forEach((h, idx) => { obj[h.trim()] = values[idx]?.trim() || ""; });
              return obj;
            });
            await doAnalyze(staff_list);
          } catch {
            message.error("数据文件格式错误");
            setAnalyzing(false);
          }
        };
        reader.readAsText(file);
        return;
      } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
        // 直接用excelData
        if (!excelData) {
          message.error("Excel文件解析失败，请重新上传");
          setAnalyzing(false);
          return;
        }
        staff_list = excelData;
        await doAnalyze(staff_list);
        return;
      } else {
        message.error("仅支持csv/json/xls/xlsx文件");
        setAnalyzing(false);
        return;
      }
    } catch (err) {
      message.error("分析失败");
      setAnalyzing(false);
    }
  };

  // 发送分析请求
  const doAnalyze = async (staff_list) => {
    const template = templates.find(t => t.industry === industry && t.company === company);
    if (!template) {
      message.error("未找到对应模板");
      setAnalyzing(false);
      return;
    }
    const payload = {
      industry,
      thresholds: template.default_thresholds,
      staff_list,
      use_cursor: useCursor,
      model_id: useCursor ? null : selectedModel
    };
    try {
      const res = await axios.post(`${API_BASE}/analyze`, payload);
      const analysisResult = res.data?.result || res.data;
      setResult({
        ...analysisResult,
        markdown: res.data?.markdown,
        pdf_url: res.data?.pdf_url
      });
    } catch (err) {
      message.error("分析失败，请检查后端服务");
    }
    setAnalyzing(false);
  };

  // 分层明细表格
  const columns = [
    { title: "姓名", dataIndex: "姓名", align: 'center' },
    { title: "岗位", dataIndex: "岗位", align: 'center' },
    { title: "分层", dataIndex: "分层", align: 'center' },
    { title: "总分", dataIndex: "总分", align: 'center' },
    { title: "建议", dataIndex: "建议", align: 'center' },
    { title: "风险等级", dataIndex: "风险等级", align: 'center' }
  ];

  const historyColumns = [
    { title: "时间", dataIndex: "timestamp", align: 'center' },
    { title: "行业", dataIndex: "industry", align: 'center' },
    { title: "企业", dataIndex: "company", align: 'center' },
    { title: "团队人数", dataIndex: "staff_count", align: 'center' },
    { title: "平均分", dataIndex: "average_score", align: 'center' },
    {
      title: "报告",
      dataIndex: "pdf_url",
      align: 'center',
      render: (pdfUrl) => pdfUrl ? <Button type="link" href={API_BASE + pdfUrl} target="_blank">查看报告</Button> : "-"
    }
  ];

  const uploadProps = {
    beforeUpload,
    showUploadList: false,
    accept: ".csv,.json,.xls,.xlsx"
  };

  if (historyOnly) {
    return (
      <div style={{ padding: 32 }}>
        <h2>历史记录</h2>
        <Card>
          <Table
            columns={historyColumns}
            dataSource={historyRecords}
            loading={historyLoading}
            rowKey={(record, idx) => record.analysis_id || record.timestamp || idx}
            pagination={{ pageSize: 10 }}
            bordered
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      <h2>一键分析</h2>
      <Card style={{ maxWidth: 900, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
          <span>行业：</span>
          <Select
            style={{ width: 240 }}
            options={industryOptions}
            value={industry}
            onChange={v => { setIndustry(v); setCompany(""); }}
            placeholder="请选择行业"
            allowClear
          />
          <span>企业：</span>
          <Select
            style={{ width: 240 }}
            options={companyOptions}
            value={company}
            onChange={setCompany}
            placeholder="请选择企业"
            allowClear
            disabled={!industry}
          />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>上传员工数据</Button>
            </Upload>
            {fileName && <span style={{ marginLeft: 8 }}>{fileName}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 24 }}>
          <Button type="primary" onClick={handleAnalyze}>一键分析</Button>
        </div>
      </Card>

      
      <Spin spinning={analyzing} tip="分析中...">
        {result && (
          <Card style={{ maxWidth: 900 }}>
            <Descriptions title="团队总览" bordered column={2} size="middle">
              <Descriptions.Item label="分析时间">{result.analysis_date}</Descriptions.Item>
              <Descriptions.Item label="团队人数">{result.staff_count}</Descriptions.Item>
              <Descriptions.Item label="团队平均分">{result.ai_insights?.team_overview?.average_score}</Descriptions.Item>
              <Descriptions.Item label="最高分/最低分">{result.ai_insights?.team_overview?.highest_score} / {result.ai_insights?.team_overview?.lowest_score}</Descriptions.Item>
              <Descriptions.Item label="分数区间">{result.ai_insights?.team_overview?.score_range}</Descriptions.Item>
            </Descriptions>
            <Descriptions title="维度分析" bordered column={2} size="middle" style={{ marginTop: 24 }}>
              <Descriptions.Item label="优势维度">{result.ai_insights?.dimension_analysis?.strength?.dimension}（{result.ai_insights?.dimension_analysis?.strength?.score}）</Descriptions.Item>
              <Descriptions.Item label="薄弱维度">{result.ai_insights?.dimension_analysis?.weakness?.dimension}（{result.ai_insights?.dimension_analysis?.weakness?.score}）</Descriptions.Item>
              <Descriptions.Item label="各维度均分" span={2}>
                {Object.entries(result.ai_insights?.dimension_analysis?.averages || {}).map(([k, v]) => `${k}: ${v}`).join('，')}
              </Descriptions.Item>
            </Descriptions>
            <Descriptions title="团队建议" bordered column={1} size="middle" style={{ marginTop: 24 }}>
              <Descriptions.Item>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {(result.ai_insights?.recommendations || []).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 32 }}>
              <h3>分层明细</h3>
              <Table columns={columns} dataSource={Array.isArray(result?.results) ? result.results : []} rowKey={(_, idx) => idx} pagination={{ pageSize: 10 }} bordered size="small" scroll={{ x: 'max-content' }} />
            </div>
          </Card>
        )}
      </Spin>
      <div style={{ marginTop: 32 }}>
        <span>分析方式：</span>
        <Radio.Group value={useCursor ? 1 : 0} onChange={e => setUseCursor(e.target.value === 1)} style={{ marginRight: 24 }}>
          <Radio value={0}>使用配置的模型</Radio>
          <Radio value={1}>使用 Cursor 客户端</Radio>
        </Radio.Group>
      </div>
      {!useCursor && (
        <div style={{ marginTop: 16 }}>
          <span>选择模型：</span>
          <Select
            style={{ width: 600 }}
            value={selectedModel}
            onChange={setSelectedModel}
            placeholder="请选择模型"
            allowClear
            options={models.map(model => ({
              label: model.name || model.model_name || model.id,
              value: model.id
            }))}
          />
        </div>
      )}
      {result?.markdown && (
        <Card style={{ marginTop: 32 }}>
          <h3>AI分析报告</h3>
          <ReactMarkdown>{result.markdown}</ReactMarkdown>
          <Button type="primary" href={API_BASE + result.pdf_url} target="_blank" style={{marginTop:16}}>下载PDF报告</Button>
        </Card>
      )}
    </div>
  );
} 
