import { ProxySubscribeList } from "../../components/dashboard/proxy";

interface Props {
  lang: string;
}

export default function ProxySubscribePage({ lang }: Props) {
  return <ProxySubscribeList />;
}
