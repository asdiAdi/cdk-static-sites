import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { StaticSiteConstruct } from "./static-site-construct";

export class PwaTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new StaticSiteConstruct(this, "PwaTest", {
      secondLevelDomain: "carladi.com",
      subDomain: "pwa-test",
      githubRepoName: "pwa-test",
      githubRepoId: 1360042954
    });
  }
}
