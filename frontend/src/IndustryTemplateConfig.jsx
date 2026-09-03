import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, InputNumber, Space, Popconfirm, message, Switch } from "antd";
import axios from "axios";

const API_BASE = "/api";

const defaultTemplate = {
  industry: "",
  company: "",
  dimensions: [{ name: "", weight: 0, description: "" }],
  default_thresholds: { 优秀: 85, 良好: 70, 一般: 50 }
};

export default function IndustryTemplateConfig() {
  const [templates, setTemplates] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(defaultTemplate);
  const [form] = Form.useForm();
  const [modalKey, setModalKey] = useState(0);

  // 获取模板列表
  const loadTemplates = async () => {
    try {
      const res = await axios.get(`${API_BASE}/industry_templates`);
      if (res.data.success) {
        setTemplates(res.data.data);
      }
    } catch (err) {
      message.error("加载模板失败");
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // 新增/编辑
  const handleSave = async (values) => {
    try {
      // 唯一性校验：同一行业下company不能重复
      const isDuplicate = templates.some(item =>
        item.industry === values.industry &&
        item.company === values.company &&
        (!editing || (editing && (item.industry !== current.industry || item.company !== current.company)))
      );
      if (isDuplicate) {
        message.error("同一行业下企业名称已存在，不能重复！");
        return;
      }
      // 构造与后端一致的能力模型对象
      const payload = {
        industry: values.industry,
        company: values.company,
        dimensions: values.dimensions,
        default_thresholds: values.default_thresholds,
        enabled: current.enabled // 保持原有启用状态
      };
      if (editing) {
        await axios.put(`${API_BASE}/industry_templates/${encodeURIComponent(values.industry)}/${encodeURIComponent(values.company)}`, payload);
        message.success("更新成功");
      } else {
        await axios.post(`${API_BASE}/industry_templates`, payload);
        message.success("添加成功");
      }
      setModalVisible(false);
      loadTemplates();
    } catch (err) {
      message.error("保存失败");
    }
  };

  // 删除
  const handleDelete = async (industry, company) => {
    try {
      await axios.delete(`${API_BASE}/industry_templates/${encodeURIComponent(industry)}/${encodeURIComponent(company)}`);
    message.success("删除成功");
      loadTemplates();
    } catch (err) {
      message.error("删除失败");
    }
  };

  // 打开编辑
  const openEdit = (record) => {
    setEditing(true);
    setCurrent({ ...record, industry: record.industry });
    setModalVisible(true);
    setModalKey(Date.now());
    form.setFieldsValue({ ...record, industry: record.industry });
  };

  // 打开新增
  const openAdd = () => {
    setEditing(false);
    setCurrent(defaultTemplate);
    setModalVisible(true);
    setModalKey(Date.now());
    form.resetFields();
    form.setFieldsValue(defaultTemplate);
  };

  // 新增维度（在编辑行业模板时）
  const handleAddDimension = async (industry, dim) => {
    try {
      await axios.post(`${API_BASE}/industry_templates/${industry}/dimensions`, dim);
      message.success("维度添加成功");
      loadTemplates();
    } catch (err) {
      message.error("添加失败");
    }
  };

  // 启用开关切换
  const handleEnableChange = async (record, checked) => {
    try {
      await axios.put(`${API_BASE}/industry_templates/${encodeURIComponent(record.industry)}/${encodeURIComponent(record.company)}/enable`, { enabled: checked });
      message.success("状态更新成功");
      loadTemplates();
    } catch (err) {
      message.error("更新失败");
    }
  };

  // 表格列
  const columns = [
    { title: <div style={{textAlign: 'center'}}>行业</div>, dataIndex: "industry", align: 'center' },
    { title: <div style={{textAlign: 'center'}}>企业名称</div>, dataIndex: "company", align: 'center' },
    { 
      title: <div style={{textAlign: 'center'}}>能力维度</div>, 
      dataIndex: "dimensions", 
      align: 'center',
      render: dims => dims.map(d => d.name).join("，") 
    },
    { 
      title: <div style={{textAlign: 'center'}}>能力评估值</div>, 
      dataIndex: "default_thresholds", 
      align: 'center',
      render: t => {
        // 以区间段显示
        const youxiu = `优秀: ≥${t.优秀}`;
        const lianghao = `良好: ${t.良好}~${t.优秀-1}`;
        const yiban = `一般: ${t.一般}~${t.良好-1}`;
        return `${youxiu}  ${lianghao}  ${yiban}`;
      }
    },
    {
      title: <div style={{textAlign: 'center'}}>启用</div>,
      dataIndex: "enabled",
      align: 'center',
      render: (enabled, record) => (
        <Switch
          checked={!!enabled}
          onChange={checked => handleEnableChange(record, checked)}
        />
      )
    },
    {
      title: <div style={{textAlign: 'center'}}>操作</div>,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.industry, record.company)}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2>能力模型配置</h2>
      <Button type="primary" onClick={openAdd} style={{ marginBottom: 16 }}>新增</Button>
      <Table rowKey={record => `${record.industry}_${record.company}`} columns={columns} dataSource={Array.isArray(templates) ? templates : []} 
        style={{ width: '100%' }} 
        scroll={{ x: 'max-content' }}
      />

      <Modal
        key={modalKey}
        title={editing ? "编辑行业模板" : "新增行业模板"}
        visible={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText="保存"
        cancelText="取消"
        footer={[
          <div key="footer-btns" style={{ marginTop: 32, textAlign: 'right' }}>
            <Button key="back" onClick={() => setModalVisible(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button key="submit" type="primary" onClick={() => form.submit()}>保存</Button>
          </div>
        ]}
      >
        <Form form={form} initialValues={{...current, industry: current.industry}} layout="vertical">
          <Form.Item name="industry" label="行业" rules={[{ required: true, message: "请输入行业名称" }]}> 
            <Input disabled={editing} />
          </Form.Item>
          <Form.Item name="company" label="企业名称" rules={[{ required: false }]}> 
            <Input placeholder="请输入企业名称" />
          </Form.Item>
          <Form.List name="dimensions">
            {(fields, { add, remove }) => (
              <>
                <label>维度配置</label>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Form.Item {...restField} name={[name, "name"]} rules={[{ required: true, message: "维度名" }]} style={{ marginBottom: 0, width: 120 }}>
                      <Input placeholder="维度名" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, "weight"]} rules={[{ required: true, message: "权重" }]} style={{ marginBottom: 0, width: 80 }}>
                      <InputNumber min={0} max={100} placeholder="权重" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, "description"]} style={{ marginBottom: 0, width: 200 }}>
                      <Input placeholder="描述" />
                    </Form.Item>
                    <Button
                      type="primary"
                      onClick={() => { message.info("数据源接入功能待开发"); }}
                      style={{ background: '#2d8cf0', borderColor: '#2d8cf0', marginRight: 8 }}
                    >
                      数据源接入
                    </Button>
                    <Button onClick={() => remove(name)} danger>删除</Button>
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} block>添加维度</Button>
              </>
            )}
          </Form.List>
          <Form.Item label="能力评估值" style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <span>优秀</span>
              <Form.Item name={["default_thresholds", "优秀"]} rules={[{ required: true }]} noStyle>
                <InputNumber min={0} max={100} placeholder="优秀分数下限" style={{ width: 80 }} />
              </Form.Item>
              <span>良好</span>
              <Form.Item name={["default_thresholds", "良好"]} rules={[{ required: true }]} noStyle>
                <InputNumber min={0} max={100} placeholder="良好分数下限" style={{ width: 80 }} />
              </Form.Item>
              <span>一般</span>
              <Form.Item name={["default_thresholds", "一般"]} rules={[{ required: true }]} noStyle>
                <InputNumber min={0} max={100} placeholder="一般分数下限" style={{ width: 80 }} />
              </Form.Item>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
} 