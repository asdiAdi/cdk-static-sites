import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { StaticSiteConstruct } from "./static-site-construct";

export class BorderRadiusStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new StaticSiteConstruct(this, "BorderRadius", {
      secondLevelDomain: "carladi.com",
      subDomain: "border-radius",
    });
  }
}
