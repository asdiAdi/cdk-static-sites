import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { S3Event } from "aws-lambda";

const cloudfrontClient = new CloudFrontClient({ region: "us-east-1" });
const ssmClient = new SSMClient({ region: "us-east-1" });

export const handler = async (event: S3Event) => {
  let distributionId: string | undefined = undefined;

  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const command = new GetParameterCommand({
      Name: `distributionId-${bucketName}`,
    });

    // WARN: this is limited to 40 requests per second unless higher throughput is enabled
    const { Parameter } = await ssmClient.send(command);

    if (Parameter) {
      distributionId = Parameter.Value;
    }
  }

  if (!distributionId) {
    console.error("Missing CloudFront Distribution ID");
    return;
  }

  const invalidationCommand = new CreateInvalidationCommand({
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: `${Date.now()}`,
      Paths: { Quantity: 1, Items: ["/*"] },
    },
  });

  try {
    const response = await cloudfrontClient.send(invalidationCommand);
    console.log("Invalidation successful:", response);
  } catch (error) {
    console.error("Error invalidating CloudFront:", error);
  }
};
