import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53_targets from "aws-cdk-lib/aws-route53-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export const GITHUB_OWNER = "asdiAdi";
export const GITHUB_OWNER_ID = 80302904;
export const GITHUB_OIDC_PROVIDER_URL = "token.actions.githubusercontent.com";
export const GITHUB_OIDC_AUDIENCE = "sts.amazonaws.com";
export const GITHUB_GIT_REF = "refs/heads/main";
export const GITHUB_DEPLOY_MANAGED_POLICY_ARN =
  "arn:aws:iam::882357180990:policy/github-s3-cloudfront";
export const GITHUB_OIDC_PROVIDER_ARN =
  "arn:aws:iam::882357180990:oidc-provider/token.actions.githubusercontent.com";

export type GithubOwnerProps =
  | { githubOwner?: undefined; githubOwnerId?: undefined }
  | { githubOwner: string; githubOwnerId: number };

export type GithubRepoProps =
  | { githubRepoName?: undefined; githubRepoId?: undefined }
  | { githubRepoName: string; githubRepoId: number };

interface StaticSiteBaseProps {
  subDomain: string;
  secondLevelDomain: string;
  /** Enable SPA fallback: 403/404 -> 200 /index.html */
  spa?: boolean;
}

export type StaticSiteConstructProps = StaticSiteBaseProps &
  GithubOwnerProps &
  GithubRepoProps;

export class StaticSiteConstruct extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly certificate: acm.Certificate;
  public readonly deployRole?: iam.Role;

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

    this.certificate = new acm.Certificate(
      this,
      `${constructId}-Certificate`,
      {
        domainName: domainName,
        validation: acm.CertificateValidation.fromDns(hostedZone),
      },
    );
    new cdk.CfnOutput(this, "Certificate", {
      value: this.certificate.certificateArn,
    });

    this.bucket = new s3.Bucket(this, `${constructId}-Bucket`, {
      bucketName: domainName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    new cdk.CfnOutput(this, "Bucket", { value: this.bucket.bucketName });

    this.distribution = new cloudfront.Distribution(
      this,
      `${constructId}-Distribution`,
      {
        comment: `CDN for ${domainName}`,
        defaultBehavior: {
          origin: cloudfront_origins.S3BucketOrigin.withOriginAccessControl(
            this.bucket,
            {},
          ),
          compress: true,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        defaultRootObject: "index.html",
        domainNames: [domainName],
        certificate: this.certificate,
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        errorResponses: props.spa
          ? [
            {
              httpStatus: 403,
              responseHttpStatus: 200,
              responsePagePath: "/index.html",
              ttl: cdk.Duration.minutes(5),
            },
            {
              httpStatus: 404,
              responseHttpStatus: 200,
              responsePagePath: "/index.html",
              ttl: cdk.Duration.minutes(5),
            },
          ]
          : undefined,
      },
    );
    new cdk.CfnOutput(this, "Distribution", {
      value: this.distribution.distributionId,
    });
    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.distributionDomainName,
    });

    const alias = new route53_targets.CloudFrontTarget(this.distribution);
    const aRecord = new route53.ARecord(this, `${constructId}-ARecord`, {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(alias),
      recordName: props.subDomain,
    });
    new cdk.CfnOutput(this, "Arecord", {
      value: aRecord.domainName,
    });

    const aaaaRecord = new route53.AaaaRecord(
      this,
      `${constructId}-AaaaRecord`,
      {
        zone: hostedZone,
        target: route53.RecordTarget.fromAlias(alias),
        recordName: props.subDomain,
      },
    );
    new cdk.CfnOutput(this, "AaaaRecord", {
      value: aaaaRecord.domainName,
    });

    this.deployRole = this.createGithubDeployRole(
      constructId,
      domainName,
      props.githubOwner ?? GITHUB_OWNER,
      props.githubRepoName ?? props.subDomain,
      props.githubOwnerId ?? GITHUB_OWNER_ID,
      props.githubRepoId,
    );
  }

  private createGithubDeployRole(
    constructId: string,
    domainName: string,
    owner: string,
    repoName: string,
    ownerId: number,
    repoId?: number,
  ): iam.Role | undefined {
    if (!repoId) {
      cdk.Annotations.of(this).addWarning(
        `Skipping GitHub deploy Role for ${domainName}: githubRepoName/githubRepoId not provided for repo "${owner}/${repoName}".`,
      );
      return undefined;
    }

    const oidcProviderArn = GITHUB_OIDC_PROVIDER_ARN;

    const sub = `repo:${owner}@${ownerId}/${repoName}@${repoId}:ref:${GITHUB_GIT_REF}`;

    const roleName = `github-deploy-${constructId
      .toLowerCase()
      .replace(/\./g, "-")
      .replace(/[^a-z0-9+=,.@_-]/g, "-")}`.slice(0, 64);

    const role = new iam.Role(this, `${constructId}-GithubDeployRole`, {
      roleName,
      description: `GitHub Actions deploy role for ${domainName} (${owner}/${repoName})`,
      assumedBy: new iam.FederatedPrincipal(
        oidcProviderArn,
        {
          StringEquals: {
            [`${GITHUB_OIDC_PROVIDER_URL}:aud`]: GITHUB_OIDC_AUDIENCE,
          },
          StringLike: {
            [`${GITHUB_OIDC_PROVIDER_URL}:sub`]: sub,
          },
        },
        "sts:AssumeRoleWithWebIdentity",
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromManagedPolicyArn(
          this,
          `${constructId}-GithubDeployPolicy`,
          GITHUB_DEPLOY_MANAGED_POLICY_ARN,
        ),
      ],
    });
    new cdk.CfnOutput(this, "RoleToAssume", {
      description: "AWS_ROLE_TO_ASSUME",
      value: role.roleArn,
    });
    return role;
  }
}
