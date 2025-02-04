import { IMenuItem, IBaseInfo } from "typesPath/base-types";
import moment from "moment";
import { IClusterInfo, ITemplateSrvData } from "typesPath/cluster/cluster-types";
import React from "react";
import {
  ConsoleSqlOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import { Button, Modal, Tooltip, notification, message } from "antd";
import { cellStyle } from "constants/table";
import { ROLE_TYPE, colorTheme, DATA_TYPE_LIST, isOpenUp, LEVEL_MAP } from "constants/common";
import { ClusterInfo } from "./base-info";
import { LogicNodeList } from "./logic-node-list";
import { IndexList } from "./index-list";
import { renderOperationBtns } from "container/custom-component";
import { PlugnList } from "./plugn-list";
import { IPlug } from "typesPath/plug-types";
import { submitWorkOrder } from "api/common-api";
import { IWorkOrder } from "typesPath/params-types";
import store from "store";
import { userDelPlug } from "api/plug-api";
import { IndexSearch } from "./index-search";
import { delLogicCluterRegion } from "api/op-cluster-region-api";
import { clusterTypeMap, INDEX_AUTH_TYPE_MAP } from "constants/status-map";
import { opNodeStatusMap } from "../physics-detail/constants";
import {
  deleteLogicClusterTemplateSrv,
  setLogicClusterTemplateSrv
} from "api/cluster-api";
import { timeFormat } from "constants/time";
import Url from "lib/url-parser";

const appInfo = {
  app: store.getState().app.appInfo,
  user: store.getState().user.getName,
};

export enum TAB_LIST_KEY {
  info = "info",
  index = "index",
  indexTemplate = "indexTemplate",
  search = "search",
  monitor = "monitor",
  pluggin = "pluggin",
  node = "node",
  region = "region",
  diary = "diary",
}

export const TAB_LIST = [
  {
    name: "集群概览",
    key: TAB_LIST_KEY.info,
    content: (logicBaseInfo: IClusterInfo) => (
      <ClusterInfo logicBaseInfo={logicBaseInfo} />
    ),
  },
  {
    name: "节点映射",
    key: TAB_LIST_KEY.node,
    content: (logicBaseInfo: IClusterInfo) => (
      <LogicNodeList logicBaseInfo={logicBaseInfo} />
    ),
  },
];

const menuMap = new Map<string, IMenuItem>();
TAB_LIST.forEach((d) => {
  menuMap.set(d.key, d);
});

export const DETAIL_MENU_MAP = menuMap;

export const baseInfo: any = [
  [
    // {
    //   label: "ES版本",
    //   key: "responsible",
    // },
    {
      label: "创建时间",
      key: "createTime",
      render: (time: number) => moment(time).format(timeFormat),
    },
    {
      label: "数据节点数",
      key: "dataNodesNumber",
    },
  ],
  [
    {
      label: "集群描述",
      key: "memo",
      render: (text: string) => (
        <>
          <Tooltip placement="bottomLeft" title={text}>
            {text ? (text.length > 20 ? text.slice(0, 20) + "..." : text) : "_"}
          </Tooltip>
        </>
      ),
    },
    {
      label: "Gateway地址",
      key: "gatewayAddress",
      render: (value: string) => (
        <>
          <span>{value || "_"}</span>
        </>
      ),
    },
  ],
];
interface ICardInfo {
  label: string;
  configList: IBaseInfo[];
  btns?: JSX.Element[];
  col: number;
}

export const cardInfo = [
  {
    label: "基本信息",
    configList: baseInfo,
  },
] as ICardInfo[];

export const getNodeColumns = () => {
  const cols = [
    {
      title: "节点名称",
      dataIndex: "hostname",
      key: "hostname",
      width: "15%",
    },
    {
      title: "节点ip",
      dataIndex: "ip",
      key: "ip",
      width: "20%",
      onCell: () => ({
        style: cellStyle,
      }),
      render: (text: string) => {
        return (
          <Tooltip placement="bottomLeft" title={text}>
            {text}
          </Tooltip>
        );
      },
    },
    {
      title: "节点规格",
      dataIndex: "nodeSpec",
      key: "nodeSpec",
      width: "20%",
    },
    {
      title: "节点角色",
      dataIndex: "role",
      key: "role",
      width: "15%",
      render: (role: number) => {
        return <>{ROLE_TYPE[role].label}</>;
      },
    },
  ];
  return cols;
};

export const DESC_LIST = [
  {
    label: "集群类型",
    key: "type",
    render: (value: number) => (
      <>
        <span>{clusterTypeMap[value] || "-"}</span>
      </>
    ),
  },
  {
    label: "业务等级",
    key: "level",
    render: (value: number) => (
      <>
        <span>{LEVEL_MAP[value - 1]?.label || "-"}</span>
      </>
    ),
  },
  {
    label: "所属项目",
    key: "appName",
    render: (value) => (
      <>
        <span>{value || "-"}</span>
      </>
    ),
  },
  {
    label: "所属项目ID",
    key: "appId",
    render: (value) => (
      <>
        <span>{value || "-"}</span>
      </>
    ),
  },
  {
    label: "责任人",
    key: "responsible",
    render: (value) => (
      <>
        <Tooltip placement="bottomLeft" title={value}>
          {value
            ? value.length > 20
              ? value.slice(0, 20) + "..."
              : value
            : "_"}
        </Tooltip>
      </>
    ),
  },
];

export const getLogicNodeColumns = (
  dataList,
  reloadData: Function,
  type: string
) => {
  const columns = [
    {
      title: "region ID",
      dataIndex: "regionId",
      key: "regionId",
      render: (value, row, index) => {
        const dataListIndex = row.index;
        const obj = {
          children: value,
          props: {} as any,
        };
        if (index === 0 || value !== dataList[dataListIndex - 1]?.regionId) {
          obj.props.rowSpan = row.rowSpan;
        }

        if (index > 0) {
          if (value === dataList[dataListIndex - 1].regionId && value !== "_") {
            obj.props.rowSpan = 0;
          }
        }
        return obj;
      },
    },
    {
      title: "racks",
      dataIndex: "rack",
      key: "rack",
      render: (rack: string, row) => {
        const ele = <>{rack || "_"}</>;
        const obj = {
          children: ele,
          props: {} as any,
        };
        if (row.regionId !== "_") {
          obj.props.rowSpan = row.racksRowSpan;
        }
        return obj;
      },
    },
    {
      title: "节点ip",
      dataIndex: "ip",
      key: "ip",
    },
    {
      title: "节点角色",
      dataIndex: "role",
      key: "role",
      // render: (t: number) => ROLE_TYPE[t].label,
      render: (t: any) => {
        let str;
        if (Array.isArray(t)) {
          str = t
            .map((index) => {
              return ROLE_TYPE[index].label || index;
            })
            .toString();
        } else {
          str = ROLE_TYPE[t].label || t;
        }
        return str;
      },
    },
    {
      title: "节点状态",
      dataIndex: "status",
      key: "status",
      // render: (text: number) => {
      //   return (
      //     <Tooltip placement="bottomLeft" title={opNodeStatusMap[text]}>
      //       {opNodeStatusMap[text]}
      //     </Tooltip>
      //   );
      // },
      render: (status: number | number[]) => {
        let str;
        if (Array.isArray(status)) {
          str = status
            .map((index) => {
              return opNodeStatusMap[index];
            })
            .toString();
        } else {
          str = opNodeStatusMap[status];
        }
        return str;
      },
    },
    {
      title: "所属物理集群",
      dataIndex: "cluster",
      key: "cluster",
      render: (name: string, row) => {
        const ele = (
          <Tooltip placement="bottomLeft" title={name}>
            {name || "_"}
          </Tooltip>
        );
        const obj = {
          children: ele,
          props: {} as any,
        };
        if (row.regionId !== "_") {
          obj.props.rowSpan = row.clusterRowSpan;
        }
        return obj;
      },
    },
    {
      title: "操作",
      dataIndex: "operation",
      key: "operation",
      render: (value: any, record: any, index: number) => {
        let btns = [
          {
            label: "解绑",
            clickFunc: () => {
              Modal.confirm({
                title: "提示",
                content: "您确定要执行解绑操作吗？存储在该region上的模版或索引现有的数据不会进行迁移到该逻辑集群关联的其他region上",
                width: 500,
                okText: "确认",
                cancelText: "取消",
                onOk() {
                  const urlParams = Url().search;
                  delLogicCluterRegion(record.regionId, Number(urlParams.clusterId)).then((res) => {
                    notification.success({ message: "操作成功！" });
                    reloadData();
                  });
                },
              });
            },
          },
        ];
        if (record.regionId === "_") {
          btns = [];
        }
        const obj = {
          children: renderOperationBtns(btns, record),
          props: {} as any,
        };

        const dataListIndex = record.index;

        if (
          index === 0 ||
          record.regionId !== dataList[dataListIndex - 1]?.regionId
        ) {
          obj.props.rowSpan = record.rowSpan;
        }
        if (index > 0) {
          if (
            record.regionId === dataList[dataListIndex - 1].regionId &&
            record.regionId !== "_"
          ) {
            obj.props.rowSpan = 0;
          }
        }
        return obj;
      },
    },
  ];
  if (type !== "配置管理") {
    columns.splice(5, 1);
  }
  return columns;
};

export const onHandleServerTag = (
  data: ITemplateSrvData,
  loginClusterId: string | number,
  reloadData: Function
) => {
  Modal.confirm({
    title: data.status
      ? `是否确认关闭索引${data.item?.serviceName}服务？`
      : `是否确认打开索引${data.item?.serviceName}服务?`,
    content: data.status
      ? `关闭服务后会可能使相应业务受影响，请谨慎操作！`
      : `打开服务后会可能使相应业务受影响，请谨慎操作！`,
    icon: <QuestionCircleOutlined style={{ color: colorTheme }} />,
    okText: "确认",
    cancelText: "取消",
    onOk: () => {
      if (!data.status) {
        return setLogicClusterTemplateSrv(
          loginClusterId,
          data.item.serviceId
        ).then(() => {
          message.success("操作成功");
          reloadData();
        });
      }
      deleteLogicClusterTemplateSrv(loginClusterId, data.item.serviceId).then(
        () => {
          message.success("操作成功");
          reloadData();
        }
      );
    },
  });
};

export const indexExplain = [
  {
    label: "预创建",
    content: "对于分区创建的索引，支持预创建，减轻集群负担，提高稳定性",
  },
  {
    label: "过期删除",
    content: "支持索引根据保存周期自动清理，避免磁盘过满",
  },
  {
    label: "Pipeline",
    content: "提供索引分区规则（索引模版到具体的物理索引的映射）和写入限流能力",
  },
  {
    label: "Mapping设置",
    content: "提供修改索引的 mapping 的信息的功能",
  },
  {
    label: "Setting设置",
    content: "提供修改索引 Setting 的信息的功能",
  },
  {
    label: "写入限流",
    content: "对索引写入量进行限制，避免过大影响集群稳定性",
  },
  {
    label: "跨集群同步(DCDR)",
    content: "跨集群数据复制功能，用于集群间的数据复制，类似ES官方的CCR能力",
  },
  {
    label: "索引别名",
    content: "支持通过接口来设置和修改索引别名",
  },
  {
    label: "资源管控",
    content: "支持对索引资源(磁盘)大小的管控，超过设定值会被限流",
  },
  {
    label: "安全管控",
    content: "提供了引擎原生的租户和安全管控能力，可以保证引擎层面的数据安全",
  },
  {
    label: "容量规划",
    content: "保障集群节点的容量均衡，避免索引在节点上的分布不合理问题",
  },
  {
    label: "冷热分离",
    content: "提供SSD和HDD两种类型的磁盘来保存索引，从而降低成本",
  },
  {
    label: "Shard调整",
    content: "根依据索引写入的历史数据来每天定时计算未来一天索引的 shard 个数，保障索引 shard 个数的合理性",
  },
];

export const getIndexListColumns = () => {
  const columns = [
    {
      title: "索引ID",
      dataIndex: "id",
      key: "id",
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: "索引名称",
      dataIndex: "name",
      key: "name",
      width: "10%",
      onCell: () => ({
        style: { ...cellStyle, maxWidth: 100 },
      }),
      render: (text: string) => {
        return (
          <Tooltip placement="bottomLeft" title={text}>
            {text}
          </Tooltip>
        );
      },
    },
    {
      title: "业务类型",
      dataIndex: "dataType",
      key: "dataType",
      render: (value: number) => (
        <span>
          {DATA_TYPE_LIST.filter((item) => item.value === value)?.[0]?.label ||
            ""}
        </span>
      ),
    },
    {
      title: "所属项目",
      dataIndex: "appName",
      key: "appName",
    },
    {
      title: "价值分",
      dataIndex: "value",
      key: "value",
    },
    {
      title: "权限",
      dataIndex: "authType",
      key: "authType",
      render: (authType: number) => {
        return <>{INDEX_AUTH_TYPE_MAP[authType] || "-"}</>;
      },
    },
    {
      title: "描述",
      dataIndex: "desc",
      key: "desc",
    },
  ];
  return columns;
};

const unintallPlugn = (data, reloadDataFn) => {
  Modal.confirm({
    title: `是否确定卸载该${data.name}插件`,
    content: `插件卸载、安装需要重启集群，点击确认后，将自动提交工单。`,
    width: 500,
    okText: "确定",
    cancelText: "取消",
    onOk() {
      const contentObj = {
        operationType: 4,
        logicClusterId: data.id,
        logicClusterName: data.name,
        plugIds: data.id,
        plugName: data.name,
        plugDesc: data.plugDesc,
        type: "6",
      };
      const params: IWorkOrder = {
        contentObj,
        submitorAppid: appInfo.app()?.id,
        submitor: appInfo.user("domainAccount") || "",
        description: "",
        type: "logicClusterPlugOperation",
      };
      return submitWorkOrder(params, () => {
        reloadDataFn();
      });
    },
  });
};

const intallPlugn = (data, reloadDataFn) => {
  Modal.confirm({
    title: `是否确定安装该${data.name}插件`,
    content: `插件卸载、安装需要重启集群，点击确认后，将自动提交工单。`,
    width: 500,
    okText: "确定",
    cancelText: "取消",
    onOk() {
      const contentObj = {
        operationType: 3,
        logicClusterId: data.id,
        logicClusterName: data.name,
        plugIds: data.id,
        plugName: data.name,
        plugDesc: data.plugDesc,
        type: "6",
      };
      const params: IWorkOrder = {
        contentObj,
        submitorAppid: appInfo.app()?.id,
        submitor: appInfo.user("domainAccount") || "",
        description: "",
        type: "logicClusterPlugOperation",
      };
      return submitWorkOrder(params, () => {
        reloadDataFn();
      });
    },
  });
};

const delPlugn = (data, reloadDataFn) => {
  Modal.confirm({
    title: `是否确定删除该${data.name}插件`,
    icon: <DeleteOutlined style={{ color: "red" }} />,
    content: `插件删除将永久在列表消失，请谨慎操作。`,
    width: 500,
    okText: "确定",
    cancelText: "取消",
    onOk() {
      userDelPlug(data.id).then((res) => {
        reloadDataFn();
      });
    },
  });
};

export const getPlugnBtnList = (record: IPlug, reloadDataFn: any) => {
  const install = {
    label: "安装",
    clickFunc: () => {
      intallPlugn(record, reloadDataFn);
    },
  };

  const uninstall = {
    label: "卸载",
    isOpenUp: isOpenUp,
    clickFunc: () => {
      unintallPlugn(record, reloadDataFn);
    },
  };

  const edit = {
    label: "编辑",
    isOpenUp: isOpenUp,
    clickFunc: () => {
      delPlugn(record, reloadDataFn);
    },
  };

  const del = {
    label: "删除插件包",
    // needConfirm: true,
    isOpenUp: isOpenUp,
    // confirmText: "删除插件包",
    clickFunc: (record: any) => {
      delPlugn(record, reloadDataFn);
    },
  };

  const btnList = [];
  if (record.installed) {
    btnList.push(uninstall, edit);
  } else if (record.pdefault) {
    btnList.push(install, edit);
  } else {
    btnList.push(install, edit, del);
  }
  return btnList;
};

export const pDefaultMap = {
  0: '系统默认',
  1: 'ES能力',
  2: '平台能力',
}

export const getPlugnListColumns = (fn: () => any) => {
  const columns = [
    {
      title: "插件名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "插件类型",
      dataIndex: "pdefault",
      key: "pdefault",
      render: (value: number) => {
        const text = pDefaultMap[value] || '未知类型';
        return text;
      },
    },
    {
      title: "使用版本",
      dataIndex: "nodeSpec",
      key: "nodeSpec",
    },
    {
      title: "状态",
      dataIndex: "installed",
      key: "installed",
      render: (value: boolean) => {
        return <>{value ? "已安装" : "未安装"}</>;
      },
    },
    {
      title: "描述",
      dataIndex: "desc",
      key: "desc",
      render: (value: string) => {
        return value || '-'
      },
    },
    // {
    //   title: "操作",
    //   dataIndex: "operation",
    //   key: "operation",
    //   render: (id: number, record: IPlug) => {
    //     const btns = getPlugnBtnList(record, fn);
    //     return renderOperationBtns(btns, record);
    //   },
    // },
  ];
  return columns;
};

export enum leftMenuKeys {
  kibana = "kibana",
  DSL = "DSL",
  SQL = "SQL",
}

export const SEARCH_PROPERTY_MENU: IMenuItem[] = [
  {
    label: "Kibana",
    key: leftMenuKeys.kibana,
  },
  {
    label: "DSL",
    key: leftMenuKeys.DSL,
  },
  {
    label: "SQL",
    key: leftMenuKeys.SQL,
  },
];
