import React, { useState, useEffect } from 'react';
import { Card, Button, message, Spin, Select, Input, Form, Tabs } from 'antd';
import styled from 'styled-components';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { TabPane } = Tabs;

const Wrapper = styled.div`
  max-width: 1000px;
  margin: 40px auto;
  padding: 32px;
`;

const Title = styled.h2`
  font-weight: 700;
  font-size: 24px;
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  margin-top: 24px;
  margin-bottom: 16px;
  border-left: 4px solid #9254de;
  padding-left: 12px;
`;

// 每个意图下可配置的字段
const intentPromptFields = [
  { name: 'system_role', label: '系统角色定义', rows: 3 },
  { name: 'main_prompt', label: '主模板/指令', rows: 6 },
  { name: 'user_question_suffix', label: '用户问题后缀', rows: 2 },
];

// 默认意图识别prompt内容
const DEFAULT_PROMPTS_BY_INTENT = {
  GREETING: {
    system_role: '你是一个友好的智能助手，能够用简洁温暖的语言与用户打招呼或道别。',
    main_prompt: '请用简短的方式进行问候或回应。',
    user_question_suffix: ''
  },
  DATA_ANALYSIS: {
    system_role: '你是一个专业的数据分析师，能够根据数据和分析目标自动判断是否需要用图表（如柱状图、饼图、折线图、雷达图等）来展示结果。',
    main_prompt: '请根据用户提供的数据和分析目标，自动判断是否需要用图表（如柱状图、饼图、折线图、雷达图等）来展示结果。如果你认为用图表更直观，请输出对应的 ECharts option 配置。必须严格遵守：1. option 只能是纯 JSON，禁止出现任何 JavaScript 函数、new、undefined、null 等 JS 代码。2. 如需动态颜色，请直接在 data 中为每个项加 itemStyle.color 字段。3. 用 ```json ... ``` 代码块包裹，只返回 option JSON，不要多余解释。option.title.text 里请写明图表类型和含义。如果不适合用图表，请直接用自然语言分析。',
    user_question_suffix: ''
  },
  CHART_GENERATION: {
    system_role: '你是一个专业的数据分析师和可视化专家，擅长根据数据和分析目标自动选择最合适的可视化图表类型（如柱状图、饼图、折线图、雷达图等），并能输出标准的ECharts option JSON。',
    main_prompt: '请根据用户提供的数据和分析目标，自动判断最适合用哪种可视化图表（如柱状图、饼图、折线图、雷达图等）来展示结果，并输出对应的 ECharts option 配置。必须严格遵守：1. option 只能是纯 JSON，禁止出现任何 JavaScript 函数、new、undefined、null 等 JS 代码。2. 如需动态颜色，请直接在 data 中为每个项加 itemStyle.color 字段。3. 用 ```json ... ``` 代码块包裹，只返回 option JSON，不要多余解释。option.title.text 里请写明图表类型和含义。',
    user_question_suffix: ''
  },
  CAPABILITY_ANALYSIS: {
    system_role: '你是一名拥有15年工作经验的组织发展专家与数据分析专家，拥有深厚的人力资源、管理学、组织行为学、心理学、数据科学、谈判学的理论和知识沉淀，并且擅长丰富的人力资源管理实践和咨询经验，熟知行业内的最佳实践。你的任务是综合用户提供的信息进行深度思考，结合行业对人才通用能力要求及当前传输给你已启用的企业本身的能力维度要求，完成对人员的综合评价、对人员进行点评、输出有力基于数据的管理建议。语言专业、精简。',
    main_prompt: '请基于以下能力模型和员工数据，分析员工的能力短板和提升建议。输出：\n1.\t阐述你分析评价的理论框架，说明其合理性。\n2.\t综合评价、对比、管理建议。\n3.\t为了后续更好的分析，你还希望补充哪些信息即原因。\n',
    user_question_suffix: '请用结构化方式输出分析结果。'
  }
};

// 默认合并策略和复合prompt
const DEFAULT_MERGE_STRATEGY = {
  default: ["DATA_ANALYSIS", "CAPABILITY_ANALYSIS", "CHART_GENERATION"],
  custom_rules: [
    {
      if: ["DATA_ANALYSIS", "CHART_GENERATION"],
      merge_as: "ANALYSIS_WITH_CHART"
    },
    {
      if: ["DATA_ANALYSIS", "CAPABILITY_ANALYSIS"],
      merge_as: "ANALYSIS_WITH_CAPABILITY"
    }
  ]
};
const DEFAULT_COMPOSITE_PROMPTS = {
  ANALYSIS_WITH_CHART: "你是一名数据分析和可视化专家。请先对数据进行分析，然后输出ECharts图表option，最后用简明语言总结主要发现。",
  ANALYSIS_WITH_CAPABILITY: "你是一名数据分析和能力评估专家。请先对数据进行分析，再对人员能力进行评估，并给出发展建议。"
};

function PromptConfigPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [capabilityModels, setCapabilityModels] = useState([]);
  const [compositePromptList, setCompositePromptList] = useState([]);

  // 获取能力模型列表 (用于下拉选择)
  const fetchCapabilityModels = async () => {
    try {
      const res = await fetch('/api/enabled_capability_models'); 
      const apiResponse = await res.json();
      if (apiResponse && Array.isArray(apiResponse.data)) {
        setCapabilityModels(apiResponse.data.map(m => ({
          ...m,
          id: `${m.industry}_${m.company}`
        })));
      } else {
        setCapabilityModels([]);
      }
    } catch (e) {
      message.error("获取能力模型列表失败");
    }
  };
  
  // 获取完整的Prompt配置
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/prompt-config');
      const data = await res.json();
      
      const lastSelectedModelId = localStorage.getItem('defaultCapabilityModelId');
      if (lastSelectedModelId && data.qa_defaults) {
        data.qa_defaults.capability_model_id = lastSelectedModelId;
      }

      // 自动补全意图识别prompt内容
      if (!data.PROMPTS_BY_INTENT) data.PROMPTS_BY_INTENT = {};
      for (const key of Object.keys(DEFAULT_PROMPTS_BY_INTENT)) {
        if (!data.PROMPTS_BY_INTENT[key]) {
          data.PROMPTS_BY_INTENT[key] = { ...DEFAULT_PROMPTS_BY_INTENT[key] };
        } else {
          for (const field of Object.keys(DEFAULT_PROMPTS_BY_INTENT[key])) {
            if (!data.PROMPTS_BY_INTENT[key][field]) {
              data.PROMPTS_BY_INTENT[key][field] = DEFAULT_PROMPTS_BY_INTENT[key][field];
            }
          }
        }
      }

      // 自动补全合并策略
      if (!data.merge_strategy || !data.merge_strategy.default || !data.merge_strategy.custom_rules) {
        data.merge_strategy = JSON.parse(JSON.stringify(DEFAULT_MERGE_STRATEGY));
      }
      // 自动补全复合prompt
      if (!data.COMPOSITE_PROMPTS || Object.keys(data.COMPOSITE_PROMPTS).length === 0) {
        data.COMPOSITE_PROMPTS = { ...DEFAULT_COMPOSITE_PROMPTS };
      }

      setConfig(data);
      form.setFieldsValue(data);
    } catch (e) {
      message.error("加载配置失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchCapabilityModels();
  }, []);

  // 在fetchConfig后补全compositePromptList
  useEffect(() => {
    if (config && config.COMPOSITE_PROMPTS) {
      setCompositePromptList(Object.entries(config.COMPOSITE_PROMPTS));
    }
  }, [config]);

  // 保存配置
  const handleSave = async (values) => {
    setLoading(true);
    try {
      // 复合Prompt模板转对象
      const compositePromptsObj = {};
      compositePromptList.forEach(([k, v]) => {
        if (k) compositePromptsObj[k] = v;
      });
      const fullConfig = {
        ...config,
        ...values,
        COMPOSITE_PROMPTS: compositePromptsObj
      };
      const res = await fetch('/api/prompt-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullConfig)
      });
      const data = await res.json();
      if (data.success) {
        message.success("配置保存成功！");
      } else {
        message.error(data.msg || "保存失败");
      }
    } catch (e) {
      message.error("保存配置失败");
    } finally {
      setLoading(false);
    }
  };

  // 重点：当表单值变化时，将选择的模型ID存入浏览器缓存
  const handleValuesChange = (changedValues, allValues) => {
    if (changedValues.qa_defaults && 'capability_model_id' in changedValues.qa_defaults) {
      const selectedId = changedValues.qa_defaults.capability_model_id;
      if (selectedId) {
        localStorage.setItem('defaultCapabilityModelId', selectedId);
      } else {
        localStorage.removeItem('defaultCapabilityModelId');
      }
    }
  };

  // 合并策略编辑辅助
  const mergeStrategy = Form.useWatch(['merge_strategy'], form) || {};
  const compositePrompts = Form.useWatch(['COMPOSITE_PROMPTS'], form) || {};

  // 合并策略default编辑
  const renderDefaultIntents = () => (
    <Form.List name={['merge_strategy', 'default']} initialValue={mergeStrategy.default || []}>
      {(fields, { add, remove }) => (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>默认合并顺序：</span>
            <Button size="small" icon={<PlusOutlined />} onClick={() => add('')} type="dashed">添加意图</Button>
          </div>
          {fields.map((field, idx) => (
            <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Form.Item {...field} name={field.name} style={{ margin: 0 }}>
                <Input placeholder="如 DATA_ANALYSIS" style={{ width: 200 }} />
              </Form.Item>
              <MinusCircleOutlined onClick={() => remove(field.name)} />
            </div>
          ))}
        </>
      )}
    </Form.List>
  );

  // 合并策略custom_rules编辑
  const renderCustomRules = () => (
    <Form.List name={['merge_strategy', 'custom_rules']} initialValue={mergeStrategy.custom_rules || []}>
      {(fields, { add, remove }) => (
        <>
          <div style={{ display: 'flex', gap: 8, margin: '16px 0 8px 0' }}>
            <span style={{ fontWeight: 500 }}>自定义合并规则：</span>
            <Button size="small" icon={<PlusOutlined />} onClick={() => add({ if: [], merge_as: '' })} type="dashed">添加规则</Button>
          </div>
          {fields.map((field, idx) => (
            <div key={field.key} style={{ border: '1px solid #eee', borderRadius: 6, padding: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>如果意图为：</span>
                <Form.List name={[field.name, 'if']} initialValue={[]}>
                  {(ifFields, { add: addIf, remove: removeIf }) => (
                    <>
                      {ifFields.map((ifField, i) => (
                        <span key={ifField.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Form.Item {...ifField} name={ifField.name} style={{ margin: 0 }}>
                            <Input placeholder="如 DATA_ANALYSIS" style={{ width: 140 }} />
                          </Form.Item>
                          <MinusCircleOutlined onClick={() => removeIf(ifField.name)} />
                        </span>
                      ))}
                      <Button size="small" icon={<PlusOutlined />} onClick={() => addIf('')} type="dashed">添加意图</Button>
                    </>
                  )}
                </Form.List>
                <span>合并为：</span>
                <Form.Item name={[field.name, 'merge_as']} style={{ margin: 0 }}>
                  <Input placeholder="如 ANALYSIS_WITH_CHART" style={{ width: 180 }} />
                </Form.Item>
                <MinusCircleOutlined onClick={() => remove(field.name)} />
              </div>
            </div>
          ))}
        </>
      )}
    </Form.List>
  );

  // 复合Prompt模板自定义渲染
  const renderCompositePrompts = () => (
    <div>
      {compositePromptList.map(([key, value], idx) => (
        <div key={key + idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Input
            value={key}
            onChange={e => {
              const newList = [...compositePromptList];
              newList[idx][0] = e.target.value;
              setCompositePromptList(newList);
            }}
            placeholder="合并key，如 ANALYSIS_WITH_CHART"
            style={{ width: 200 }}
          />
          <TextArea
            value={value}
            onChange={e => {
              const newList = [...compositePromptList];
              newList[idx][1] = e.target.value;
              setCompositePromptList(newList);
            }}
            rows={2}
            style={{ width: 400 }}
          />
          <MinusCircleOutlined onClick={() => {
            const newList = compositePromptList.filter((_, i) => i !== idx);
            setCompositePromptList(newList);
          }} />
        </div>
      ))}
      <Button
        size="small"
        icon={<PlusOutlined />}
        onClick={() => setCompositePromptList([...compositePromptList, ['', '']])}
        type="dashed"
      >
        添加模板
      </Button>
    </div>
  );

  if (loading || !config) {
    return <Spin tip="加载中..." style={{ display: 'block', marginTop: 50 }} />;
  }
  
  const intents = config.PROMPTS_BY_INTENT ? Object.keys(config.PROMPTS_BY_INTENT) : [];

  return (
    <Wrapper>
      <Title>智能问答高级配置</Title>
      <Form form={form} layout="vertical" onFinish={handleSave} onValuesChange={handleValuesChange} initialValues={config}>
        <Card>
          <SectionTitle>默认问答行为</SectionTitle>
          <Form.Item label="当前启用的能力模型 (用于能力分析场景)" name={['qa_defaults', 'capability_model_id']} help="当用户进行能力分析时，系统将默认使用此模型">
            <Select style={{ width: 300 }} placeholder="不选择则不启用默认模型" allowClear>
              {capabilityModels.map(m => (
                <Select.Option key={m.id} value={m.id}>{m.company}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <SectionTitle>意图指令配置</SectionTitle>
          <Tabs type="card">
            {intents.map(intentName => (
              <TabPane tab={intentName} key={intentName}>
                {intentPromptFields.map(field => (
                  <Form.Item 
                    key={field.name} 
                    label={field.label}
                    name={['PROMPTS_BY_INTENT', intentName, field.name]}
                  >
                    <TextArea rows={field.rows} />
                  </Form.Item>
                ))}
              </TabPane>
            ))}
          </Tabs>
          <SectionTitle>合并策略配置</SectionTitle>
          {renderDefaultIntents()}
          {renderCustomRules()}
          <SectionTitle>复合Prompt模板</SectionTitle>
          {renderCompositePrompts()}
        </Card>

        <Button type="primary" htmlType="submit" loading={loading} style={{ marginTop: 24 }}>
          保存配置
        </Button>
      </Form>
    </Wrapper>
  );
}

export default PromptConfigPage; 