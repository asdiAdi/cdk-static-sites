import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { StaticSiteConstruct } from "./static-site-construct";

export class CalcTsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new StaticSiteConstruct(this, "CalcTs", {
      secondLevelDomain: "carladi.com",
      subDomain: "calc-ts",
    });
  }
}
