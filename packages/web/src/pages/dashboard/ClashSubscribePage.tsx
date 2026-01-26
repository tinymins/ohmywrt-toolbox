import { ClashSubscribeList } from "../../components/dashboard/clash";

interface Props {
  lang: string;
}

export default function ClashSubscribePage({ lang }: Props) {
  return <ClashSubscribeList />;
}
