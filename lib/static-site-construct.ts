import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
// import * as eventsources from "aws-cdk-lib/aws-lambda-event-sources";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53_targets from "aws-cdk-lib/aws-route53-targets";
// import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ssm from "aws-cdk-lib/aws-ssm";
// import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

export interface StaticSiteStackProps extends cdk.StackProps {
  // readonly invalidateLambda: lambda.IFunction;
}

interface StaticSiteConstructProps {
  subDomain: string;
  secondLevelDomain: string;
  // invalidateLambda: lambda.IFunction;
}

export class StaticSiteConstruct extends Construct {
  constructor(scope: Construct, id: string, props: StaticSiteConstructProps) {
    super(scope, id);

    const domainName = `${props.subDomain}.${props.secondLevelDomain}`;
    const constructId = `${props.subDomain}-${props.secondLevelDomain}`;
    new cdk.CfnOutput(this, "DomainName", { value: "https://" + domainName });

    const hostedZone = route53.HostedZone.fromLookup(
      this,
      `${constructId}-HostedZone`,
      { domainName: props.secondLevelDomain },
    );

    const certificate = new acm.Certificate(
      this,
      `${constructId}-Certificate`,
      {
        domainName: domainName,
        validation: acm.CertificateValidation.fromDns(hostedZone),
      },
    );
    new cdk.CfnOutput(this, "Certificate", {
      value: certificate.certificateArn,
    });

    const bucket = new s3.Bucket(this, `${constructId}-Bucket`, {
      bucketName: domainName,
      websiteIndexDocument: "index.html",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    new cdk.CfnOutput(this, "Bucket", { value: bucket.bucketName });

    const distribution = new cloudfront.Distribution(
      this,
      `${constructId}-Distribution`,
      {
        defaultBehavior: {
          origin: cloudfront_origins.S3BucketOrigin.withOriginAccessControl(
            bucket,
            {},
          ),
          compress: true,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        defaultRootObject: "index.html",
        domainNames: [domainName],
        certificate: certificate,
      },
    );
    new cdk.CfnOutput(this, "Distribution", {
      value: distribution.distributionId,
    });

    const alias = new route53_targets.CloudFrontTarget(distribution);
    const arecord = new route53.ARecord(this, `${constructId}-ARecord`, {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(alias),
      recordName: props.subDomain,
      ttl: cdk.Duration.days(1),
    });
    new cdk.CfnOutput(this, "Arecord", {
      value: arecord.domainName,
    });

    // Cloudfront Invalidation
    // new ssm.StringParameter(this, `${constructId}-StringParameter`, {
    //   parameterName: `distributionId-${domainName}`,
    //   stringValue: distribution.distributionId,
    // });

    // const s3Event = new eventsources.S3EventSource(bucket, {
    //   events: [s3.EventType.OBJECT_CREATED, s3.EventType.OBJECT_REMOVED],
    // });

    // new sqs.Queue(this, `${constructId}-Queue`, {
    //   queueName: `s3Event-${domainName}`,
    // });

    // bucket.addEventNotification()

    // props.invalidateLambda.addEventSource(s3Event);
    // new cdk.CfnOutput(this, "TriggerEvent", {
    //   value: "Added Trigger event",
    // });
  }
}
