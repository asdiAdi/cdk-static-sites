import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { StaticSiteConstruct } from "./static-site-construct";

export class PortfolioTempStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new StaticSiteConstruct(this, "PortfolioTemp", {
      secondLevelDomain: "carladi.com",
      subDomain: "portfolio-temp",
    });
  }
}
