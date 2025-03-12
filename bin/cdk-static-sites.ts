#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { TestStaticStack } from "../lib/test-static-stack";
import { OldWebPortfolioStack } from "../lib/old-web-portfolio-stack";
import { CalcTsStack } from "../lib/calc-ts-stack";
import { BorderRadiusStack } from "../lib/border-radius-stack";
import { SudokuStack } from "../lib/sudoku-stack";
import { OldEcommerceStack } from "../lib/old-ecommerce-stack";
import { PortfolioTempStack } from "../lib/portfolio-temp-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "us-east-1", // because of cloudfront
};

new TestStaticStack(app, "TestStaticStack", {
  env,
});

new OldWebPortfolioStack(app, "OldWebPortfolioStack", { env });

new CalcTsStack(app, "CalcTsStack", { env });

new BorderRadiusStack(app, "BorderRadiusStack", { env });

new SudokuStack(app, "SudokuStack", { env });

new OldEcommerceStack(app, "OldEcommerceStack", { env });

new PortfolioTempStack(app, "PortfolioTempStack", { env });

app.synth();
