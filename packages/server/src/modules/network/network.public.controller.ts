import { Controller, Get, Res, Logger } from "@nestjs/common";
import type { Response } from "express";
import { networkService } from "./network.service";

@Controller("public/network")
export class NetworkPublicController {
  private readonly logger = new Logger(NetworkPublicController.name);

  /** 获取中国 IPv4 CIDR 列表 */
  @Get("geoip/cn")
  async getGeoIpCn(@Res() res: Response) {
    try {
      const content = await networkService.getGeoIpCn();
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.send(content);
    } catch (error) {
      this.logger.error("Error fetching GeoIP CN:", error);
      res.status(500).send("Failed to fetch GeoIP CN data");
    }
  }

  /** 获取中国域名列表（用于 DNS 分流） */
  @Get("geosite/cn")
  async getGeoSiteCn(@Res() res: Response) {
    try {
      const content = await networkService.getGeoSiteCn();
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.send(content);
    } catch (error) {
      this.logger.error("Error fetching GeoSite CN:", error);
      res.status(500).send("Failed to fetch GeoSite CN data");
    }
  }
}
