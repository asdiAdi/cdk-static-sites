import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  StaticSiteConstruct,
  StaticSiteStackProps,
} from "./static-site-construct";

export class TestStaticStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StaticSiteStackProps) {
    super(scope, id, props);

    new StaticSiteConstruct(this, "StaticSite", {
      secondLevelDomain: "carladi.com",
      subDomain: "test-static",
      // invalidateLambda: props.invalidateLambda,
    });
  }
}
