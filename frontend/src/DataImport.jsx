import React, { useState } from "react";
import { Card, Upload, Button, Form, Input, Select, Tabs, message } from "antd";
import { UploadOutlined, ApiOutlined, DatabaseOutlined, CloudServerOutlined, LinkOutlined } from "@ant-design/icons";

const { TabPane } = Tabs;

export default function DataImport() {
  const [activeTab, setActiveTab] = useState("file");

  // 文件上传
  const uploadProps = {
    showUploadList: true,
    beforeUpload: (file) => {
      message.success(`已选择文件：${file.name}`);
      return false; // 阻止自动上传
    }
  };

  // API表单提交
  const onApiFinish = (values) => {
    message.success(`API数据源 ${values.url} 已提交测试`);
  };

  // 数据库表单提交
  const onDbFinish = (values) => {
    message.success(`${values.type || "数据库"} 数据源已提交测试`);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 24 }}>数据接入配置</h2>
      <Card style={{ width: '100%' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" style={{ width: '100%' }}>
          <TabPane tab={<span><UploadOutlined />文件上传</span>} key="file">
            <Upload {...uploadProps} accept=".csv,.xls,.xlsx,.json">
              <Button icon={<UploadOutlined />}>选择文件上传</Button>
            </Upload>
            <div style={{ color: "#888", marginTop: 8 }}>支持 Excel、CSV、JSON 格式</div>
          </TabPane>
          <TabPane tab={<span><ApiOutlined />API数据服务</span>} key="api">
            <div style={{ maxWidth: 480 }}>
              <Form layout="vertical" onFinish={onApiFinish}>
                <Form.Item label="API地址" name="url" rules={[{ required: true, message: "请输入API地址" }]}> 
                  <Input placeholder="https://api.example.com/data" />
                </Form.Item>
                <Button type="primary" htmlType="submit">测试并接入</Button>
              </Form>
            </div>
          </TabPane>
          <TabPane tab={<span><DatabaseOutlined />数据库接入</span>} key="db">
            <div style={{ maxWidth: 480 }}>
              <Form layout="vertical" onFinish={onDbFinish}>
                <Form.Item label="数据库类型" name="type" rules={[{ required: true }]}> 
                  <Select>
                    <Select.Option value="mysql">MySQL</Select.Option>
                    <Select.Option value="postgres">PostgreSQL</Select.Option>
                    <Select.Option value="sqlserver">SQL Server</Select.Option>
                    <Select.Option value="oracle">Oracle</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="主机地址" name="host" rules={[{ required: true }]}> 
                  <Input placeholder="127.0.0.1" />
                </Form.Item>
                <Form.Item label="端口" name="port" rules={[{ required: true }]}> 
                  <Input placeholder="3306" />
                </Form.Item>
                <Form.Item label="数据库名" name="database" rules={[{ required: true }]}> 
                  <Input />
                </Form.Item>
                <Form.Item label="用户名" name="user" rules={[{ required: true }]}> 
                  <Input />
                </Form.Item>
                <Button type="primary" htmlType="submit">测试连接并接入</Button>
              </Form>
            </div>
          </TabPane>
          <TabPane tab={<span><CloudServerOutlined />数据仓库</span>} key="dw">
            <div style={{ color: '#888' }}>支持 Hive、ClickHouse、Snowflake、BigQuery 等，后续可扩展</div>
            <Button type="dashed" icon={<LinkOutlined />} style={{ marginTop: 16 }}>配置数据仓库</Button>
          </TabPane>
          <TabPane tab={<span><LinkOutlined />第三方平台</span>} key="third">
            <div style={{ color: '#888' }}>支持钉钉、企业微信、飞书等平台数据同步，后续可扩展</div>
            <Button type="dashed" icon={<LinkOutlined />} style={{ marginTop: 16 }}>配置第三方平台</Button>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
} 
