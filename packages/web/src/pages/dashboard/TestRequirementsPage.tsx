import { useState } from "react";
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Popconfirm,
  Tooltip,
  Row,
  Col,
  Typography,
  Drawer,
  Tabs,
  Divider,
  Empty
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  FolderOutlined,
  TagsOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import { useMessage } from "../../hooks";
import { trpc } from "../../lib/trpc";
import type { Lang } from "../../lib/types";
import type {
  TestRequirement,
  TestRequirementStatus,
  TestRequirementType,
  TestRequirementPriority
} from "@acme/types";

const { TextArea } = Input;
const { Text, Paragraph } = Typography;
const { TabPane } = Tabs;

type TestRequirementsPageProps = {
  lang: Lang;
};

// 状态配置
const STATUS_CONFIG: Record<
  TestRequirementStatus,
  { label: { zh: string; en: string }; color: string; icon: React.ReactNode }
> = {
  draft: {
    label: { zh: "草稿", en: "Draft" },
    color: "default",
    icon: <FileTextOutlined />
  },
  pending: {
    label: { zh: "待审核", en: "Pending" },
    color: "processing",
    icon: <ClockCircleOutlined />
  },
  approved: {
    label: { zh: "已批准", en: "Approved" },
    color: "cyan",
    icon: <CheckCircleOutlined />
  },
  in_progress: {
    label: { zh: "进行中", en: "In Progress" },
    color: "blue",
    icon: <ClockCircleOutlined />
  },
  completed: {
    label: { zh: "已完成", en: "Completed" },
    color: "success",
    icon: <CheckCircleOutlined />
  },
  rejected: {
    label: { zh: "已拒绝", en: "Rejected" },
    color: "error",
    icon: <CloseCircleOutlined />
  },
  cancelled: {
    label: { zh: "已取消", en: "Cancelled" },
    color: "default",
    icon: <CloseCircleOutlined />
  }
};

// 类型配置
const TYPE_CONFIG: Record<
  TestRequirementType,
  { label: { zh: string; en: string }; color: string }
> = {
  functional: { label: { zh: "功能测试", en: "Functional" }, color: "blue" },
  performance: { label: { zh: "性能测试", en: "Performance" }, color: "orange" },
  security: { label: { zh: "安全测试", en: "Security" }, color: "red" },
  usability: { label: { zh: "易用性测试", en: "Usability" }, color: "purple" },
  compatibility: { label: { zh: "兼容性测试", en: "Compatibility" }, color: "cyan" },
  integration: { label: { zh: "集成测试", en: "Integration" }, color: "geekblue" },
  regression: { label: { zh: "回归测试", en: "Regression" }, color: "magenta" }
};

// 优先级配置
const PRIORITY_CONFIG: Record<
  TestRequirementPriority,
  { label: { zh: string; en: string }; color: string }
> = {
  critical: { label: { zh: "紧急", en: "Critical" }, color: "red" },
  high: { label: { zh: "高", en: "High" }, color: "orange" },
  medium: { label: { zh: "中", en: "Medium" }, color: "blue" },
  low: { label: { zh: "低", en: "Low" }, color: "green" }
};

export default function TestRequirementsPage({ lang }: TestRequirementsPageProps) {
  const { workspace } = useParams<{ workspace: string }>();
  const message = useMessage();
  const isZh = lang === "zh";
  const copy = {
    titleTotal: isZh ? "总需求数" : "Total",
    titleDraft: isZh ? "草稿中" : "Draft",
    titleInProgress: isZh ? "进行中" : "In Progress",
    titleDone: isZh ? "已完成" : "Completed",
    searchPlaceholder: isZh ? "搜索需求..." : "Search requirements...",
    filterStatus: isZh ? "状态筛选" : "Status",
    filterType: isZh ? "类型筛选" : "Type",
    filterPriority: isZh ? "优先级" : "Priority",
    refresh: isZh ? "刷新" : "Refresh",
    create: isZh ? "新建需求" : "New Requirement",
    totalCount: (total: number) => (isZh ? `共 ${total} 条` : `${total} items`),
    view: isZh ? "查看详情" : "View",
    edit: isZh ? "编辑" : "Edit",
    remove: isZh ? "删除" : "Delete",
    removeTitle: isZh ? "确定删除此需求吗？" : "Delete this requirement?",
    removeDesc: isZh ? "删除后不可恢复" : "This action cannot be undone",
    removeOk: isZh ? "删除" : "Delete",
    removeCancel: isZh ? "取消" : "Cancel",
    modalCreate: isZh ? "新建测试需求" : "Create Test Requirement",
    modalEdit: isZh ? "编辑测试需求" : "Edit Test Requirement",
    modalOkCreate: isZh ? "创建" : "Create",
    modalOkSave: isZh ? "保存" : "Save",
    fieldTitle: isZh ? "需求名称" : "Title",
    fieldTitleRequired: isZh ? "请输入需求名称" : "Please enter a title",
    fieldType: isZh ? "需求类型" : "Type",
    fieldDesc: isZh ? "需求描述" : "Description",
    fieldContent: isZh ? "详细内容 (支持 Markdown)" : "Details (Markdown)",
    fieldPriority: isZh ? "优先级" : "Priority",
    fieldStatus: isZh ? "状态" : "Status",
    fieldDueDate: isZh ? "截止日期" : "Due Date",
    dueDatePlaceholder: isZh ? "选择截止日期" : "Select due date",
    fieldEstimate: isZh ? "预估工时 (小时)" : "Estimated Hours",
    fieldTags: isZh ? "标签 (逗号分隔)" : "Tags (comma separated)",
    tagsPlaceholder: isZh ? "标签1, 标签2, 标签3" : "tag1, tag2, tag3",
    detailTabInfo: isZh ? "基本信息" : "Overview",
    detailTabContent: isZh ? "详细内容" : "Details",
    detailTabChildren: isZh ? "子需求" : "Sub-requirements",
    descEmpty: isZh ? "暂无描述" : "No description",
    contentEmpty: isZh ? "暂无详细内容" : "No details",
    childrenEmpty: isZh ? "暂无子需求" : "No sub-requirements",
    childrenCount: (count: number) =>
      isZh ? `共 ${count} 个子需求` : `${count} sub-requirements`,
    creator: isZh ? "创建者" : "Creator",
    assignee: isZh ? "负责人" : "Assignee",
    estimate: isZh ? "预估工时" : "Estimated",
    actual: isZh ? "实际工时" : "Actual",
    createdAt: isZh ? "创建时间" : "Created",
    dueDate: isZh ? "截止日期" : "Due",
    hours: isZh ? "小时" : "h",
    children: isZh ? "子需求" : "Sub",
    requirementId: isZh ? "需求编号" : "ID",
    requirementName: isZh ? "需求名称" : "Title",
    type: isZh ? "类型" : "Type",
    status: isZh ? "状态" : "Status",
    priority: isZh ? "优先级" : "Priority",
    creatorName: isZh ? "创建者" : "Creator",
    assigneeName: isZh ? "负责人" : "Assignee",
    createdTime: isZh ? "创建时间" : "Created",
    action: isZh ? "操作" : "Actions",
    toastCreateSuccess: isZh ? "创建成功" : "Created successfully",
    toastCreateFail: isZh ? "创建失败" : "Create failed",
    toastUpdateSuccess: isZh ? "更新成功" : "Updated successfully",
    toastUpdateFail: isZh ? "更新失败" : "Update failed",
    toastDeleteSuccess: isZh ? "删除成功" : "Deleted successfully",
    toastDeleteFail: isZh ? "删除失败" : "Delete failed",
    markdownPlaceholder: isZh
      ? "# 测试需求详情\n\n## 测试目标\n描述测试的主要目标...\n\n## 测试范围\n- 范围项 1\n- 范围项 2\n\n## 测试步骤\n1. 步骤一\n2. 步骤二\n\n## 预期结果\n描述预期的测试结果..."
      : "# Test Requirement Details\n\n## Objective\nDescribe the test objective...\n\n## Scope\n- Scope item 1\n- Scope item 2\n\n## Steps\n1. Step one\n2. Step two\n\n## Expected Result\nDescribe expected results..."
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TestRequirement | null>(null);
  const [viewingRecord, setViewingRecord] = useState<TestRequirement | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterStatus, setFilterStatus] = useState<TestRequirementStatus | undefined>();
  const [filterType, setFilterType] = useState<TestRequirementType | undefined>();
  const [filterPriority, setFilterPriority] = useState<TestRequirementPriority | undefined>();
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [form] = Form.useForm();
  const utils = trpc.useUtils();

  // 查询列表
  const listQuery = trpc.testRequirement.list.useQuery(
    {
      keyword: searchKeyword || undefined,
      status: filterStatus,
      type: filterType,
      priority: filterPriority,
      page: pagination.page,
      pageSize: pagination.pageSize
    },
    { enabled: Boolean(workspace) }
  );

  // 创建
  const createMutation = trpc.testRequirement.create.useMutation({
    onSuccess: async () => {
      message.success(copy.toastCreateSuccess);
      setIsModalOpen(false);
      form.resetFields();
      await utils.testRequirement.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || copy.toastCreateFail);
    }
  });

  // 更新
  const updateMutation = trpc.testRequirement.update.useMutation({
    onSuccess: async () => {
      message.success(copy.toastUpdateSuccess);
      setIsModalOpen(false);
      setEditingRecord(null);
      form.resetFields();
      await utils.testRequirement.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || copy.toastUpdateFail);
    }
  });

  // 删除
  const deleteMutation = trpc.testRequirement.delete.useMutation({
    onSuccess: async () => {
      message.success(copy.toastDeleteSuccess);
      await utils.testRequirement.list.invalidate();
    },
    onError: (error) => {
      message.error(error.message || copy.toastDeleteFail);
    }
  });

  // 打开新建弹窗
  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      type: "functional",
      status: "draft",
      priority: "medium"
    });
    setIsModalOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (record: TestRequirement) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      dueDate: record.dueDate ? dayjs(record.dueDate) : undefined,
      tags: record.tags?.join(",")
    });
    setIsModalOpen(true);
  };

  // 查看详情
  const handleView = (record: TestRequirement) => {
    setViewingRecord(record);
    setIsDetailOpen(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        dueDate: values.dueDate?.toISOString(),
        tags: values.tags
          ? values.tags
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean)
          : undefined
      };

      if (editingRecord) {
        await updateMutation.mutateAsync({ id: editingRecord.id, ...data });
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch (error) {
      // Form validation error
    }
  };

  // 删除确认
  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync({ id });
  };

  // 刷新
  const handleRefresh = () => {
    utils.testRequirement.list.invalidate();
  };

  // 统计数据
  const stats = {
    total: listQuery.data?.total ?? 0,
    draft: 0,
    inProgress: 0,
    completed: 0
  };

  if (listQuery.data?.items) {
    for (const item of listQuery.data.items) {
      if (item.status === "draft") stats.draft++;
      if (item.status === "in_progress") stats.inProgress++;
      if (item.status === "completed") stats.completed++;
    }
  }

  // 表格列定义
  const columns: ColumnsType<TestRequirement> = [
    {
      title: copy.requirementId,
      dataIndex: "code",
      key: "code",
      width: 120,
      fixed: "left",
      render: (code: string) => (
        <Text strong style={{ color: "#1890ff", fontFamily: "monospace" }}>
          {code}
        </Text>
      )
    },
    {
      title: copy.requirementName,
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      render: (title: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{title}</Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
              {record.description}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: copy.type,
      dataIndex: "type",
      key: "type",
      width: 110,
      render: (type: TestRequirementType) => (
        <Tag color={TYPE_CONFIG[type]?.color}>
          {TYPE_CONFIG[type]?.label[lang]}
        </Tag>
      )
    },
    {
      title: copy.priority,
      dataIndex: "priority",
      key: "priority",
      width: 90,
      render: (priority: TestRequirementPriority) => (
        <Tag color={PRIORITY_CONFIG[priority]?.color} style={{ margin: 0 }}>
          {PRIORITY_CONFIG[priority]?.label[lang]}
        </Tag>
      )
    },
    {
      title: copy.status,
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: TestRequirementStatus) => (
        <Tag
          icon={STATUS_CONFIG[status]?.icon}
          color={STATUS_CONFIG[status]?.color}
        >
          {STATUS_CONFIG[status]?.label[lang]}
        </Tag>
      )
    },
    {
      title: copy.creatorName,
      dataIndex: "creatorName",
      key: "creatorName",
      width: 100,
      render: (name: string | null) => name || "-"
    },
    {
      title: copy.assigneeName,
      dataIndex: "assigneeName",
      key: "assigneeName",
      width: 100,
      render: (name: string | null) => name || "-"
    },
    {
      title: copy.children,
      dataIndex: "childrenCount",
      key: "childrenCount",
      width: 80,
      align: "center",
      render: (count: number) =>
        count > 0 ? (
          <Tag color="purple" icon={<FolderOutlined />}>
            {count}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        )
    },
    {
      title: copy.createdTime,
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (date: Date) =>
        date ? dayjs(date).format("YYYY-MM-DD HH:mm") : "-"
    },
    {
      title: copy.action,
      key: "action",
      width: 150,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={copy.view}>
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title={copy.edit}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title={copy.removeTitle}
            description={copy.removeDesc}
            onConfirm={() => handleDelete(record.id)}
            okText={copy.removeOk}
            cancelText={copy.removeCancel}
            okButtonProps={{ danger: true }}
          >
            <Tooltip title={copy.remove}>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const statsCards = [
    {
      title: copy.titleTotal,
      value: stats.total,
      icon: <FileTextOutlined />,
      className:
        "bg-gradient-to-br from-stats-total-from to-stats-total-to dark:from-stats-total-from-dark dark:to-stats-total-to-dark"
    },
    {
      title: copy.titleDraft,
      value: stats.draft,
      icon: <EditOutlined />,
      className:
        "bg-gradient-to-br from-stats-draft-from to-stats-draft-to dark:from-stats-draft-from-dark dark:to-stats-draft-to-dark"
    },
    {
      title: copy.titleInProgress,
      value: stats.inProgress,
      icon: <ClockCircleOutlined />,
      className:
        "bg-gradient-to-br from-stats-progress-from to-stats-progress-to dark:from-stats-progress-from-dark dark:to-stats-progress-to-dark"
    },
    {
      title: copy.titleDone,
      value: stats.completed,
      icon: <CheckCircleOutlined />,
      className:
        "bg-gradient-to-br from-stats-done-from to-stats-done-to dark:from-stats-done-from-dark dark:to-stats-done-to-dark"
    }
  ];

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {statsCards.map((card) => (
          <div
            key={card.title}
            className={`rounded-lg p-6 shadow-sm ${card.className}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/90 text-sm mb-2">{card.title}</div>
                <div className="text-white text-3xl font-semibold">{card.value}</div>
              </div>
              <div className="text-white/80 text-2xl">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 工具栏 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Space wrap>
            <Input.Search
              placeholder={copy.searchPlaceholder}
              allowClear
              style={{ width: 200 }}
              prefix={<SearchOutlined />}
              onSearch={(value) => setSearchKeyword(value)}
              onChange={(e) => !e.target.value && setSearchKeyword("")}
            />
            <Select
              placeholder={copy.filterStatus}
              allowClear
              style={{ width: 120 }}
              value={filterStatus}
              onChange={setFilterStatus}
              options={Object.entries(STATUS_CONFIG).map(([key, val]) => ({
                value: key,
                label: val.label[lang]
              }))}
            />
            <Select
              placeholder={copy.filterType}
              allowClear
              style={{ width: 120 }}
              value={filterType}
              onChange={setFilterType}
              options={Object.entries(TYPE_CONFIG).map(([key, val]) => ({
                value: key,
                label: val.label[lang]
              }))}
            />
            <Select
              placeholder={copy.filterPriority}
              allowClear
              style={{ width: 100 }}
              value={filterPriority}
              onChange={setFilterPriority}
              options={Object.entries(PRIORITY_CONFIG).map(([key, val]) => ({
                value: key,
                label: val.label[lang]
              }))}
            />
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              {copy.refresh}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {copy.create}
            </Button>
          </Space>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <Table
          columns={columns}
          dataSource={listQuery.data?.items ?? []}
          rowKey="id"
          loading={listQuery.isLoading}
          scroll={{ x: 1300 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: listQuery.data?.total ?? 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => copy.totalCount(total),
            onChange: (page, pageSize) => setPagination({ page, pageSize })
          }}
          rowClassName={(_, index) =>
            index % 2 === 0 ? "bg-gray-50 dark:bg-gray-800/30" : ""
          }
        />
      </div>

      {/* 新建/编辑弹窗 */}
      <Modal
        title={editingRecord ? copy.modalEdit : copy.modalCreate}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        width={800}
        okText={editingRecord ? copy.modalOkSave : copy.modalOkCreate}
        cancelText={copy.removeCancel}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="title"
                label={copy.fieldTitle}
                rules={[{ required: true, message: copy.fieldTitleRequired }]}
              >
                <Input placeholder={copy.fieldTitle} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="type" label={copy.fieldType} initialValue="functional">
                <Select
                  options={Object.entries(TYPE_CONFIG).map(([key, val]) => ({
                    value: key,
                    label: val.label[lang]
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label={copy.fieldDesc}>
            <TextArea rows={2} placeholder={copy.fieldDesc} />
          </Form.Item>

          <Form.Item name="content" label={copy.fieldContent}>
            <TextArea
              rows={8}
              placeholder={copy.markdownPlaceholder}
              style={{ fontFamily: "monospace" }}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="priority" label={copy.fieldPriority} initialValue="medium">
                <Select
                  options={Object.entries(PRIORITY_CONFIG).map(([key, val]) => ({
                    value: key,
                    label: val.label[lang]
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label={copy.fieldStatus} initialValue="draft">
                <Select
                  options={Object.entries(STATUS_CONFIG).map(([key, val]) => ({
                    value: key,
                    label: (
                      <Space>
                        {val.icon}
                        {val.label[lang]}
                      </Space>
                    )
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dueDate" label={copy.fieldDueDate}>
                <DatePicker style={{ width: "100%" }} placeholder={copy.dueDatePlaceholder} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="estimatedHours" label={copy.fieldEstimate}>
                <InputNumber
                  min={0}
                  step={0.5}
                  style={{ width: "100%" }}
                  placeholder={copy.fieldEstimate}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tags" label={copy.fieldTags}>
                <Input placeholder={copy.tagsPlaceholder} prefix={<TagsOutlined />} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 详情抽屉 */}
      <Drawer
        title={
          <Space>
            <Text strong style={{ color: "#1890ff", fontFamily: "monospace" }}>
              {viewingRecord?.code}
            </Text>
            <Text>{viewingRecord?.title}</Text>
          </Space>
        }
        placement="right"
        width={640}
        open={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setViewingRecord(null);
        }}
        extra={
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              setIsDetailOpen(false);
              if (viewingRecord) handleEdit(viewingRecord);
            }}
          >
            {copy.edit}
          </Button>
        }
      >
        {viewingRecord && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Tag color={TYPE_CONFIG[viewingRecord.type]?.color}>
                {TYPE_CONFIG[viewingRecord.type]?.label[lang]}
              </Tag>
              <Tag
                icon={STATUS_CONFIG[viewingRecord.status]?.icon}
                color={STATUS_CONFIG[viewingRecord.status]?.color}
              >
                {STATUS_CONFIG[viewingRecord.status]?.label[lang]}
              </Tag>
              <Tag color={PRIORITY_CONFIG[viewingRecord.priority]?.color}>
                {PRIORITY_CONFIG[viewingRecord.priority]?.label[lang]}
              </Tag>
            </div>

            <Divider />

            <Tabs defaultActiveKey="info">
              <TabPane tab={copy.detailTabInfo} key="info">
                <div className="space-y-3">
                  <div>
                    <Text type="secondary">{copy.fieldDesc}：</Text>
                    <Paragraph>{viewingRecord.description || copy.descEmpty}</Paragraph>
                  </div>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text type="secondary">{copy.creator}：</Text>
                      <Text className="ml-2">{viewingRecord.creatorName || "-"}</Text>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">{copy.assignee}：</Text>
                      <Text className="ml-2">{viewingRecord.assigneeName || "-"}</Text>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text type="secondary">{copy.estimate}：</Text>
                      <Text className="ml-2">
                        {viewingRecord.estimatedHours
                          ? `${viewingRecord.estimatedHours} ${copy.hours}`
                          : "-"}
                      </Text>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">{copy.actual}：</Text>
                      <Text className="ml-2">
                        {viewingRecord.actualHours
                          ? `${viewingRecord.actualHours} ${copy.hours}`
                          : "-"}
                      </Text>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text type="secondary">{copy.createdAt}：</Text>
                      <Text className="ml-2">
                        {viewingRecord.createdAt
                          ? dayjs(viewingRecord.createdAt).format("YYYY-MM-DD HH:mm")
                          : "-"}
                      </Text>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">{copy.dueDate}：</Text>
                      <Text className="ml-2">
                        {viewingRecord.dueDate
                          ? dayjs(viewingRecord.dueDate).format("YYYY-MM-DD")
                          : "-"}
                      </Text>
                    </Col>
                  </Row>
                  {viewingRecord.tags && viewingRecord.tags.length > 0 && (
                    <div>
                      <Text type="secondary">{copy.fieldTags}：</Text>
                      <div className="mt-1">
                        {viewingRecord.tags.map((tag) => (
                          <Tag key={tag} color="blue">
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabPane>
              <TabPane tab={copy.detailTabContent} key="content">
                {viewingRecord.content ? (
                  <div
                    className="prose dark:prose-invert max-w-none"
                    style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}
                  >
                    {viewingRecord.content}
                  </div>
                ) : (
                  <Empty description={copy.contentEmpty} />
                )}
              </TabPane>
              <TabPane
                tab={
                  <Space>
                    {copy.detailTabChildren}
                    {viewingRecord.childrenCount > 0 && (
                      <Tag color="purple">{viewingRecord.childrenCount}</Tag>
                    )}
                  </Space>
                }
                key="children"
              >
                {viewingRecord.childrenCount > 0 ? (
                  <Text type="secondary">
                    {copy.childrenCount(viewingRecord.childrenCount)}
                  </Text>
                ) : (
                  <Empty description={copy.childrenEmpty} />
                )}
              </TabPane>
            </Tabs>
          </div>
        )}
      </Drawer>
    </div>
  );
}
