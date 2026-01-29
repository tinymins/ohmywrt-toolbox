import { useState, useRef } from "react";
import { Table, Button, Space, Input, Popconfirm, Typography, message, Spin, Tooltip } from "antd";
import { LinkOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { trpc } from "../../../lib/trpc";
import ClashSubscribeModal, { type ClashSubscribeModalRef } from "./ClashSubscribeModal";
import ProxyPreviewModal, { type ProxyPreviewModalRef } from "./ProxyPreviewModal";

const { Text } = Typography;

interface ClashSubscribeWithUser {
  id: string;
  userId: string;
  url: string;
  remark: string | null;
  subscribeUrl: string[];
  ruleList: Record<string, { name: string; url: string; type?: string }[]>;
  group: { name: string; type: string; proxies: string[]; readonly?: boolean }[];
  filter: string[];
  servers: unknown[];
  customConfig: unknown[];
  authorizedUserIds: string[];
  lastAccessAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
  authorizedUsers: { id: string; name: string; email: string }[];
}

export default function ClashSubscribeList() {
  const modalRef = useRef<ClashSubscribeModalRef>(null);
  const previewModalRef = useRef<ProxyPreviewModalRef>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const { data: list, isLoading, refetch } = trpc.clash.list.useQuery();

  const deleteMutation = trpc.clash.delete.useMutation({
    onSuccess: () => {
      messageApi.success("删除成功");
      refetch();
    },
    onError: (error) => {
      messageApi.error(error.message || "删除失败");
    }
  });

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      messageApi.success("已复制到剪贴板");
    });
  };

  const getClashUrl = (uuid: string) => {
    return `${window.location.protocol}//${window.location.host}/public/clash/subscribe/${uuid}`;
  };

  const getSingboxUrl = (uuid: string) => {
    return `${window.location.protocol}//${window.location.host}/public/sb/subscribe/${uuid}`;
  };

  return (
    <div className="p-6">
      {contextHolder}
      <ClashSubscribeModal ref={modalRef} onSuccess={refetch} />
      <ProxyPreviewModal ref={previewModalRef} />

      <div className="flex justify-between items-center mb-4">
        <Typography.Title level={3} className="!mb-0">
          Clash 订阅管理
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => modalRef.current?.open()}
        >
          新建订阅
        </Button>
      </div>

      <Spin spinning={isLoading}>
        <Table<ClashSubscribeWithUser>
          rowKey="id"
          size="small"
          bordered
          pagination={false}
          dataSource={list ?? []}
          scroll={{ x: 800 }}
          columns={[
            {
              title: "创建者",
              dataIndex: ["user", "name"],
              width: 100,
              ellipsis: true
            },
            {
              title: "备注",
              dataIndex: "remark",
              width: 150,
              ellipsis: true,
              render: (text) => text || "-"
            },
            {
              title: "Clash 订阅链接",
              dataIndex: "url",
              render: (uuid: string) => {
                const url = getClashUrl(uuid);
                return (
                  <Input
                    readOnly
                    value={url}
                    onClick={(e) => e.currentTarget.select()}
                    addonAfter={
                      <Space size={4}>
                        <CopyOutlined
                          className="cursor-pointer hover:text-blue-500"
                          onClick={() => handleCopyUrl(url)}
                        />
                        <LinkOutlined
                          className="cursor-pointer hover:text-blue-500"
                          onClick={() => window.open(url)}
                        />
                      </Space>
                    }
                  />
                );
              }
            },
            {
              title: "Sing-box 订阅链接",
              dataIndex: "url",
              render: (uuid: string) => {
                const url = getSingboxUrl(uuid);
                return (
                  <Input
                    readOnly
                    value={url}
                    onClick={(e) => e.currentTarget.select()}
                    addonAfter={
                      <Space size={4}>
                        <CopyOutlined
                          className="cursor-pointer hover:text-blue-500"
                          onClick={() => handleCopyUrl(url)}
                        />
                        <LinkOutlined
                          className="cursor-pointer hover:text-blue-500"
                          onClick={() => window.open(url)}
                        />
                      </Space>
                    }
                  />
                );
              }
            },
            {
              title: "最后更新",
              dataIndex: "updatedAt",
              width: 160,
              render: (text: string) => dayjs(text).format("YYYY-MM-DD HH:mm:ss")
            },
            {
              title: "操作",
              align: "center",
              width: 120,
              fixed: "right",
              render: (_, record) => (
                <Space size="middle">
                  <Tooltip title="预览节点">
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => previewModalRef.current?.open(record.id, record.remark)}
                    />
                  </Tooltip>
                  <Tooltip title="编辑">
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => modalRef.current?.open(record.id)}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="确认删除"
                    description="确定要删除这个订阅吗？"
                    onConfirm={() => deleteMutation.mutate({ id: record.id })}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Tooltip title="删除">
                      <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        loading={deleteMutation.isPending}
                      />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              )
            }
          ]}
        />
      </Spin>
    </div>
  );
}
