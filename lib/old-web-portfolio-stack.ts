import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { StaticSiteConstruct } from "./static-site-construct";

export class OldWebPortfolioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new StaticSiteConstruct(this, "OldWebPortfolio", {
      secondLevelDomain: "carladi.com",
      subDomain: "oldwebportfolio",
    });
  }
}
