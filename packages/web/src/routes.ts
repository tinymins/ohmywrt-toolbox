import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home/route.tsx"),
  route("login", "routes/login/route.tsx"),
  route("register", "routes/register/route.tsx"),
  route("unauthorized", "routes/unauthorized/route.tsx"),
  route("*", "routes/splat/route.tsx"),
  route("dashboard", "routes/dashboard/route.tsx", [
    index("routes/dashboard/_index/route.tsx"),
    route(":workspace", "routes/dashboard/$workspace/route.tsx", [
      index("routes/dashboard/$workspace/_index/route.tsx"),
      route(":page", "routes/dashboard/$workspace/$page/route.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
