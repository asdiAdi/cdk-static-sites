import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class InvalidatorStack extends cdk.Stack {
  public readonly invalidateLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // Lambda function to invalidate CloudFront
    this.invalidateLambda = new nodejs.NodejsFunction(
      this,
      "InvalidateCloudFrontLambda",
      {
        entry: "src/invalidate.ts", // Path to Lambda code
        timeout: cdk.Duration.seconds(10),
        runtime: lambda.Runtime.NODEJS_22_X,
      },
    );

    // Grant necessary permissions to the Lambda
    this.invalidateLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cloudfront:CreateInvalidation"],
        resources: ["*"],
      }),
    );

    this.invalidateLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [
          `arn:aws:ssm:${props.env?.region}:${props.env?.account}:parameter/*`,
        ],
      }),
    );

    new cdk.CfnOutput(this, "InvalidateLambdaARN", {
      value: this.invalidateLambda.functionArn,
    });
  }
}
