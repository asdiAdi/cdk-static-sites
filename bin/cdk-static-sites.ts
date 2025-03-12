#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { TestStaticStack } from "../lib/test-static-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "us-east-1", // because of cloudfront
};

new TestStaticStack(app, "TestStaticStack", {
  env,
});

app.synth();
