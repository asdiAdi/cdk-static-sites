#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { TestStaticStack } from "../lib/test-static-stack";
// import { InvalidatorStack } from "../lib/invalidator-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "us-east-1",
};

// const sharedInvalidatorStack = new InvalidatorStack(
//   app,
//   "SharedInvalidatorStack",
//   { env },
// );

new TestStaticStack(app, "TestStaticStack", {
  env,
  // invalidateLambda: sharedInvalidatorStack.invalidateLambda,
});

app.synth();
