import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, Select, Switch, message, Space, Popconfirm, Tabs } from "antd";
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';
import { CheckOutlined } from '@ant-design/icons';

const API_BASE = "/api";
const MODEL_TYPES = [
  { 
    label: "GPT-4", 
    value: "gpt-4",
    description: "OpenAI 最强大的大语言模型，支持复杂推理和创造性任务"
  },
  { 
    label: "GPT-3.5", 
    value: "gpt-3.5",
    description: "OpenAI 的轻量级模型，适合一般对话和文本生成"
  },
  { 
    label: "Claude", 
    value: "claude",
    description: "Anthropic 开发的大语言模型，擅长长文本理解和生成"
  },
  { 
    label: "DeepsSeek-R1", 
    value: "deepseek-r1",
    description: "DeepsSeek 基础版本，适合一般对话和文本生成"
  },
  { 
    label: "DeepsSeek-V3", 
    value: "deepseek-v3",
    description: "DeepsSeek 增强版本，支持更复杂的推理和生成任务"
  },
  { 
    label: "DeepsSeek-Pro", 
    value: "deepseek-pro",
    description: "DeepsSeek 满血版本，支持最复杂的推理和创造性任务"
  },
  { 
    label: "通义", 
    value: "tongyi",
    description: "通义 满血版本，支持最复杂的推理和创造性任务"
  },
  { 
    label: "本地模型", 
    value: "local",
    description: "本地部署的大模型（如 Ollama、FastChat 等），无需联网，数据更安全"
  },
  { 
    label: "通用", 
    value: "common",
    description: "其他通用大语言模型，需自行配置API参数"
  },
];

const LOCAL_MODEL_NAMES = [
  { label: "llama3", value: "llama3" },
  { label: "qwen", value: "qwen" },
  { label: "deepseek", value: "deepseek" },
  { label: "baichuan", value: "baichuan" },
  { label: "chatglm3", value: "chatglm3" },
  { label: "vicuna-13b", value: "vicuna-13b" },
];

const defaultModel = {
  name: '',
  type: '',
  api_url: '',
  api_key: '',
  enabled: false,
  remark: '',
};

const { TabPane } = Tabs;

// 自定义表头样式：浅蓝色
const tableHeaderStyle = { background: '#e6f4ff', color: '#333', fontWeight: 600 };

const customTableComponents = {
  header: {
    cell: (props) => <th {...props} style={{ ...props.style, ...tableHeaderStyle }} />
  }
};

const CONNECT_STATUS_KEY = 'llm_connect_status';

export default function LlmConfigPage() {
  console.log('LlmConfigPage loaded!');
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [modelType, setModelType] = useState('');
  const [localModelOptions, setLocalModelOptions] = useState(LOCAL_MODEL_NAMES);
  const [connectStatus, setConnectStatus] = useState({});
  const [activeTab, setActiveTab] = useState('config');
  const [logs, setLogs] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const LOG_PAGE_SIZE = 10;

  // 初始化时从 localStorage 恢复 connectStatus
  useEffect(() => {
    const local = localStorage.getItem(CONNECT_STATUS_KEY);
    if (local) {
      try {
        setConnectStatus(JSON.parse(local));
      } catch {}
    }
  }, []);

  // 每次 connectStatus 变化时保存到 localStorage
  useEffect(() => {
    localStorage.setItem(CONNECT_STATUS_KEY, JSON.stringify(connectStatus));
  }, [connectStatus]);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/llm-configs`);
      setConfigs(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      message.error('获取模型配置失败');
    }
    setLoading(false);
  };

  const fetchLogs = async (page = 1) => {
    setLogLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/model-call-logs?page=${page}&page_size=${LOG_PAGE_SIZE}`);
      setLogs(Array.isArray(res.data.data) ? res.data.data : []);
      setLogTotal(res.data.total || 0);
    } catch {
      setLogs([]);
      setLogTotal(0);
      message.error('获取日志失败');
    }
    setLogLoading(false);
  };

  useEffect(() => {
    fetchConfigs();
    if (activeTab === 'log') fetchLogs(logPage);
    // eslint-disable-next-line
  }, [activeTab, logPage]);

  const handleEdit = (record) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModelType(record.type);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setEditing(null);
    form.resetFields();
    setModelType('');
    setModalVisible(true);
  };

  const handleTypeChange = (value) => {
    setModelType(value);
    // 清空API Key，避免切换类型后校验冲突
    form.setFieldsValue({ api_key: '' });
  };

  const handleDelete = async (record) => {
    try {
      await axios.delete(`${API_BASE}/llm-configs/${record.id}`);
      message.success('删除成功');
      fetchConfigs();
    } catch {
      message.error('删除失败');
    }
  };

  const handleTest = async (record) => {
    setConnectStatus(prev => ({ ...prev, [record.id]: 'loading' }));
    try {
      const res = await axios.post(`${API_BASE}/llm-configs/${record.id}/test`);
      const data = res.data;
      if (data.success) {
        setConnectStatus(prev => ({ ...prev, [record.id]: 'success' }));
        message.success('连通性测试成功');
      } else {
        setConnectStatus(prev => ({ ...prev, [record.id]: 'fail' }));
        message.error('连通性测试失败: ' + (data.msg || ''));
      }
    } catch (e) {
      setConnectStatus(prev => ({ ...prev, [record.id]: 'fail' }));
      message.error('连通性测试异常');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      // 字段清洗，保证类型和后端一致
      const payload = {
        id: editing?.id || uuidv4(),
        name: values.name || '',
        type: values.type || '',
        api_url: values.api_url || '',
        api_key: values.api_key || '',
        enabled: !!values.enabled,
        remark: values.remark || ''
      };
      if (editing && editing.id) {
        await axios.put(`${API_BASE}/llm-configs/${editing.id}`, payload);
        message.success('修改成功');
      } else {
        await axios.post(`${API_BASE}/llm-configs`, payload);
        message.success('新增成功');
      }
      setModalVisible(false);
      fetchConfigs();
    } catch {
      message.error('保存失败');
    }
  };

  const columns = [
    { title: "模型名称", dataIndex: "name", key: "name" },
    { title: "类型", dataIndex: "type", key: "type" },
    { title: "API地址", dataIndex: "api_url", key: "api_url" },
    { title: "API Key", dataIndex: "api_key", key: "api_key", render: v => v ? "******" : "未设置" },
    { title: "启用", dataIndex: "enabled", key: "enabled", render: v => v ? "是" : "否" },
    { title: "备注", dataIndex: "remark", key: "remark" },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <>
          <Button size="small" onClick={() => handleEdit(record)} style={{ marginRight: 8 }}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record)}>
            <Button size="small" danger style={{ marginRight: 8 }}>删除</Button>
          </Popconfirm>
          {connectStatus[record.id] === 'success' ? (
            <Button
              size="small"
              type="default"
              icon={<CheckOutlined style={{ color: '#52c41a' }} />}
              disabled
              style={{
                borderColor: '#52c41a',
                color: '#52c41a',
                minWidth: 96,
                fontWeight: 600,
                background: '#f6ffed',
                boxShadow: 'none',
                marginRight: 0
              }}
            >
              已连通
            </Button>
          ) : (
            <Button
              size="small"
              loading={connectStatus[record.id] === 'loading'}
              onClick={() => handleTest(record)}
              type={connectStatus[record.id] === 'fail' ? 'danger' : 'default'}
              style={{ marginRight: 0 }}
            >
              测试连通性
            </Button>
          )}
        </>
      ),
    },
  ];

  const logColumns = [
    { title: '时间', dataIndex: 'time', key: 'time', width: 180, align: 'center' },
    { title: '模型名称', dataIndex: 'model_name', key: 'model_name', width: 140, align: 'center' },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100, align: 'center' },
    { title: '操作', dataIndex: 'input', key: 'input', width: 180, align: 'center' },
    { title: '状态', dataIndex: 'success', key: 'success', width: 100, align: 'center',
      render: v => v ? <span style={{color:'#52c41a'}}>成功</span> : <span style={{color:'#ff4d4f'}}>失败</span>
    },
    { title: '详情', dataIndex: 'response', key: 'response', align: 'center' },
  ];

  return (
    <div style={{ padding: 32 }}>
      <h2>大模型接入配置</h2>
      <div style={{ marginLeft: 8 }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          style={{ background: '#fff', borderRadius: 8, marginLeft: 0 }}
          tabBarGutter={32}
          tabBarStyle={{ fontWeight: 600 }}
          className="custom-tabs"
        >
          <TabPane tab="配置" key="config">
            <Button type="primary" onClick={handleAdd} style={{ marginBottom: 16, marginLeft: 0 }}>新增模型配置</Button>
            <Table 
              rowKey="id" 
              columns={columns} 
              dataSource={Array.isArray(configs) ? configs : []} 
              loading={loading} 
              bordered 
              components={customTableComponents}
            />
          </TabPane>
          <TabPane tab="日志" key="log">
            <Table
              rowKey={(_, idx) => idx}
              columns={logColumns.map(col =>
                col.dataIndex === 'input' || col.dataIndex === 'response'
                  ? { ...col, ellipsis: true, render: text => <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxWidth: 320 }}>{text}</div> }
                  : col
              )}
              dataSource={logs}
              loading={logLoading}
              bordered
              pagination={{
                current: logPage,
                pageSize: LOG_PAGE_SIZE,
                total: logTotal,
                onChange: page => {
                  setLogPage(page);
                  fetchLogs(page);
                },
                showSizeChanger: false
              }}
              scroll={{ x: 'max-content' }}
              components={customTableComponents}
            />
          </TabPane>
        </Tabs>
      </div>
      <Modal
        title={editing ? "编辑模型配置" : "新增模型配置"}
        open={modalVisible}
        onOk={handleOk}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={defaultModel}>
          <Form.Item name="type" label="类型" rules={[{ required: true, message: "请选择类型" }]}>
            <Select onChange={handleTypeChange}>
              {MODEL_TYPES.map(m => (
                <Select.Option key={m.value} value={m.value} title={m.description}>
                  <div>
                    <div>{m.label}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{m.description}</div>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="name" label="模型名称" rules={[{ required: true, message: "请输入模型名称" }]}>
            {modelType === 'local' ? (
              <Select
                showSearch
                allowClear
                placeholder="请选择或输入本地模型名称"
                options={localModelOptions}
                value={form.getFieldValue('name')}
                onChange={value => form.setFieldsValue({ name: value })}
                dropdownRender={menu => {
                  let inputValue = '';
                  return (
                    <>
                      {menu}
                      <div style={{ display: 'flex', alignItems: 'center', padding: 8 }}>
                        <Input
                          style={{ flex: 1 }}
                          placeholder="自定义模型名，回车添加"
                          onChange={e => { inputValue = e.target.value; }}
                          onPressEnter={e => {
                            const value = e.target.value.trim();
                            if (value && !localModelOptions.some(opt => opt.value === value)) {
                              setLocalModelOptions([...localModelOptions, { label: value, value }]);
                            }
                            form.setFieldsValue({ name: value });
                          }}
                        />
                      </div>
                    </>
                  );
                }}
              />
            ) : (
              <Input />
            )}
          </Form.Item>
          <Form.Item name="api_url" label="API地址" rules={[{ required: true, message: "请输入API地址" }]}>
            <Input placeholder={modelType === 'local' ? '如：http://localhost:11434/api/generate' : ''} />
          </Form.Item>
          {modelType === 'local' ? (
            <Form.Item name="api_key" label="API Key">
              <Input.Password placeholder="本地模型通常无需API Key，可留空" />
            </Form.Item>
          ) : (
            <Form.Item name="api_key" label="API Key" rules={[{ required: true, message: "请输入API Key" }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input placeholder={modelType === 'local' ? '本地模型无需联网，数据更安全' : ''} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
} 