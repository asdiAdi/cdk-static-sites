import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { RedirectProtocol } from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53_targets from "aws-cdk-lib/aws-route53-targets";
import { Construct } from "constructs";

interface StaticSiteConstructProps {
  secondLevelDomain: string;
  subDomain?: string;
  addlSubDomain?: string; // can be refactored to array in the future
}

export class StaticSiteConstruct extends Construct {
  constructor(scope: Construct, id: string, props: StaticSiteConstructProps) {
    super(scope, id);

    const domainName = props.subDomain
      ? `${props.subDomain}.${props.secondLevelDomain}`
      : props.secondLevelDomain;
    const constructId = props.subDomain
      ? `${props.subDomain}-${props.secondLevelDomain}`
      : props.secondLevelDomain;

    new cdk.CfnOutput(this, "DomainName", { value: "https://" + domainName });

    const hostedZone = route53.HostedZone.fromLookup(
      this,
      `${constructId}-HostedZone`,
      { domainName: props.secondLevelDomain },
    );

    // create ssl certificate to be used for cloudfront
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

    // create a bucket to store static files
    const bucket = new s3.Bucket(this, `${constructId}-Bucket`, {
      bucketName: domainName,
      websiteIndexDocument: "index.html",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    new cdk.CfnOutput(this, "Bucket", { value: bucket.bucketName });

    // make a cloudfront cdn pointing to the bucket
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

    // apply custom domain name for the website
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

    // point additional subdomain/s do domainName
    if (props.addlSubDomain) {
      const addlDomainName = `${props.addlSubDomain}.${props.secondLevelDomain}`;

      const addlCertificate = new acm.Certificate(
        this,
        `${constructId}-AddlCertificate`,
        {
          domainName: addlDomainName,
          validation: acm.CertificateValidation.fromDns(hostedZone),
        },
      );
      new cdk.CfnOutput(this, "AddlCertificate", {
        value: addlCertificate.certificateArn,
      });

      const addlBucket = new s3.Bucket(this, `${constructId}-AddlBucket`, {
        bucketName: addlDomainName,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        websiteRedirect: {
          hostName: domainName,
          protocol: RedirectProtocol.HTTPS,
        },
      });
      new cdk.CfnOutput(this, "AddlBucket", { value: addlBucket.bucketName });

      const addlDistribution = new cloudfront.Distribution(
        this,
        `${constructId}-AddlDistribution`,
        {
          defaultBehavior: {
            origin: cloudfront_origins.S3BucketOrigin.withOriginAccessControl(
              addlBucket,
              {},
            ),
            compress: true,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            viewerProtocolPolicy:
              cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          },
          // defaultRootObject: "index.html",
          domainNames: [addlDomainName],
          certificate: addlCertificate,
        },
      );
      new cdk.CfnOutput(this, "AddlDistribution", {
        value: addlDistribution.distributionId,
      });

      const addlAlias = new route53_targets.CloudFrontTarget(addlDistribution);
      const addlArecord = new route53.ARecord(
        this,
        `${constructId}-AddlARecord`,
        {
          zone: hostedZone,
          target: route53.RecordTarget.fromAlias(addlAlias),
          recordName: props.addlSubDomain,
          ttl: cdk.Duration.days(1),
        },
      );

      new cdk.CfnOutput(this, "ArecordAddl", {
        value: addlArecord.domainName,
      });
    }
  }
}
